<?php

namespace App\Services\AiOrganization;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\TodoDependency;
use App\Services\ReleaseSafety\PrReversibilityAssessor;
use App\Support\CodingAgentRepositoryRegistry;
use App\Support\CodingAgentRoleRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class AiCtoOrchestratorService
{
    public function __construct(
        private readonly PrReversibilityAssessor $reversibilityAssessor,
    ) {
    }

    /**
     * Launch a 6-role sequential AI Engineering Organization workflow for an objective.
     *
     * Roles: ai_cto -> software_architect -> developer -> qa_engineer -> security_code_reviewer -> release_manager.
     * Reuses Todo, TodoDependency (blocking downstream claims in DependencyGraph), and CodingAgentJob.
     *
     * @param  array{workflow_task_id?: string, model?: string, target_environment?: string}  $options
     * @return array{workflow_task_id: string, jobs: array<string, CodingAgentJob>, todos: array<string, Todo>}
     */
    public function startObjective(int $userId, string $repository, string $objective, array $options = []): array
    {
        if (! in_array($repository, CodingAgentRepositoryRegistry::slugs(), true)) {
            throw new InvalidArgumentException("Repository '{$repository}' is not allowlisted.");
        }
        if (trim($objective) === '') {
            throw new InvalidArgumentException('Development objective cannot be empty.');
        }

        $workflowTaskId = (string) ($options['workflow_task_id'] ?? Str::uuid());

        $existing = CodingAgentJob::query()->where('workflow_task_id', $workflowTaskId)->first();
        if ($existing) {
            if ((int) $existing->user_id !== $userId || $existing->repository !== $repository) {
                throw new RuntimeException('Conflicting task ownership: workflow_task_id already belongs to another owner or repository.');
            }
        }

        return DB::transaction(function () use ($userId, $repository, $objective, $workflowTaskId, $options): array {
            $roles = CodingAgentRoleRegistry::mvtPipelineOrder();
            $todosByRole = [];
            $jobsByRole = [];
            $previousTodo = null;
            $previousJob = null;
            $rootJobId = null;

            foreach ($roles as $index => $roleSlug) {
                $profile = CodingAgentRoleRegistry::getOrFail($roleSlug);
                $stepNum = $index + 1;

                $todo = Todo::create([
                    'user_id' => $userId,
                    'title' => "[AI Org Step {$stepNum}/6 · {$profile['title']}] ".Str::limit($objective, 110),
                    'description' => "Role: {$roleSlug}\nRepository: {$repository}\nObjective: {$objective}",
                    'type' => Todo::TYPE_TODO,
                    'is_completed' => false,
                    'priority' => 'high',
                ]);

                if ($previousTodo !== null) {
                    TodoDependency::create([
                        'user_id' => $userId,
                        'todo_id' => $todo->id,
                        'depends_on_todo_id' => $previousTodo->id,
                        'source' => 'ai_cto_orchestrator',
                    ]);
                }

                $model = $options['model'] ?? $profile['model_policy']['default_model'] ?? config('coding_agent.default_model', 'hy4-flash:free');
                $reqId = "wf-{$workflowTaskId}-{$roleSlug}";

                $existingReq = CodingAgentJob::query()
                    ->where('user_id', $userId)
                    ->where('client_request_id', $reqId)
                    ->first();
                if ($existingReq) {
                    throw new RuntimeException("Duplicate or conflicting role task '{$reqId}' already exists.");
                }

                $job = CodingAgentJob::create([
                    'user_id' => $userId,
                    'todo_id' => $todo->id,
                    'workflow_task_id' => $workflowTaskId,
                    'parent_job_id' => $rootJobId,
                    'handoff_from_job_id' => $previousJob?->id,
                    'repository' => $repository,
                    'role' => $roleSlug,
                    'execution_mode' => (string) ($profile['execution_mode'] ?? 'read_only'),
                    'instruction' => "[Role: {$profile['title']}] {$profile['description']}\n\nObjective: {$objective}",
                    'model' => $model,
                    'client_request_id' => $reqId,
                    'status' => 'queued',
                    'target_environment' => (string) ($options['target_environment'] ?? 'staging'),
                ]);

                if ($rootJobId === null) {
                    $rootJobId = $job->id;
                }

                $job->events()->create([
                    'event_key' => (string) Str::uuid(),
                    'kind' => 'role_assigned',
                    'detail' => "Assigned role '{$roleSlug}' (step {$stepNum}/6, mode: {$job->execution_mode}).",
                    'occurred_at' => now(),
                ]);

                $todosByRole[$roleSlug] = $todo;
                $jobsByRole[$roleSlug] = $job;
                $previousTodo = $todo;
                $previousJob = $job;
            }

            return [
                'workflow_task_id' => $workflowTaskId,
                'jobs' => $jobsByRole,
                'todos' => $todosByRole,
            ];
        });
    }

    /**
     * Record the result of a role job, enforce role permissions & quality gates,
     * compute PR reversibility when applicable, and trigger handoff to the next role.
     *
     * @param  array<string, mixed>  $payload
     */
    public function completeRoleJob(CodingAgentJob $job, array $payload): CodingAgentJob
    {
        return DB::transaction(function () use ($job, $payload): CodingAgentJob {
            $locked = CodingAgentJob::query()->whereKey($job->id)->lockForUpdate()->firstOrFail();
            $role = (string) ($locked->role ?: 'developer');
            $profile = CodingAgentRoleRegistry::getOrFail($role);

            // 1. Permission boundary enforcement (code-level, not prompt-only)
            $hasMutationAttempt = ! empty($payload['mutated_repository'])
                || (! empty($payload['changed_files']) && $profile['permissions']['repository_write'] === false);
            if ($hasMutationAttempt && $profile['permissions']['repository_write'] === false) {
                $this->failRoleJob($locked, "Permission violation: role '{$role}' is read-only and cannot mutate repository files.");

                return $locked->fresh();
            }

            if (! empty($payload['created_pr']) && ($profile['permissions']['create_pull_request'] ?? false) === false) {
                $this->failRoleJob($locked, "Permission violation: role '{$role}' is not allowed to create pull requests.");

                return $locked->fresh();
            }

            if (! empty($payload['merged_pr']) || ! empty($payload['deployed_production'])) {
                $this->failRoleJob($locked, "Permission violation: role '{$role}' attempted unauthorized merge or production deployment.");

                return $locked->fresh();
            }

            if ($profile['permissions']['repository_write'] === 'scoped' && ! empty($payload['changed_files'])) {
                try {
                    CodingAgentRoleRegistry::assertPermission($role, 'repository_write', [
                        'changed_files' => (array) $payload['changed_files'],
                    ]);
                } catch (InvalidArgumentException $e) {
                    $this->failRoleJob($locked, $e->getMessage());

                    return $locked->fresh();
                }
            }

            // 2. Role-specific verification & failure gates
            if ($role === 'qa_engineer') {
                $qaPassed = (bool) ($payload['tests_passed'] ?? false)
                    && (($payload['qa_verdict'] ?? 'passed') === 'passed');
                if (! $qaPassed) {
                    $this->failRoleJob($locked, 'QA validation failed: '.($payload['test_summary'] ?? 'automated test suite failed.'));

                    return $locked->fresh();
                }
            }

            if (in_array($role, ['security_code_reviewer', 'independent_code_reviewer'], true)) {
                $secPassed = (($payload['security_verdict'] ?? 'passed') === 'passed')
                    && (($payload['review_verdict'] ?? 'approved') === 'approved');
                if (! $secPassed) {
                    $reason = (string) ($payload['summary'] ?? 'Security or independent code review rejected the change.');
                    $this->failRoleJob($locked, "Security/Code Review failed: {$reason}");

                    return $locked->fresh();
                }
            }

            // 3. Attach PR Reversibility Assessment on Developer or Release Manager step
            $reversibilityClassification = $locked->reversibility_classification;
            $riskLevel = $locked->risk_level;
            $reversibilityAssessment = $locked->reversibility_assessment;

            if (in_array($role, ['developer', 'backend_engineer', 'frontend_engineer', 'database_engineer', 'release_manager'], true)) {
                $upstreamDev = $this->findWorkflowRoleJob($locked->workflow_task_id, 'developer') ?? $locked;
                $upstreamArt = is_array($upstreamDev->artifact_output) ? $upstreamDev->artifact_output : [];
                $qaJob = $this->findWorkflowRoleJob($locked->workflow_task_id, 'qa_engineer');
                $secJob = $this->findWorkflowRoleJob($locked->workflow_task_id, 'security_code_reviewer');

                $changedFiles = $payload['changed_files'] ?? $upstreamArt['changed_files'] ?? null;
                $diffText = $payload['diff_text'] ?? $upstreamArt['diff_text'] ?? null;
                $testsPassed = (bool) ($payload['tests_passed'] ?? ($qaJob ? $qaJob->tests_passed : $upstreamDev->tests_passed));
                $reviewPassed = $secJob ? in_array($secJob->status, ['completed', 'review'], true) : (bool) ($payload['independent_review_passed'] ?? false);

                $assessment = $this->reversibilityAssessor->assess([
                    'repository' => $locked->repository,
                    'commit_sha' => $payload['commit_sha'] ?? $upstreamDev->commit_sha,
                    'pr_url' => $payload['pr_url'] ?? $upstreamDev->pr_url,
                    'previous_release' => $payload['previous_release'] ?? 'v1.5.5',
                    'target_environment' => $payload['target_environment'] ?? $locked->target_environment ?? 'staging',
                    'tests_passed' => $testsPassed,
                    'independent_review_passed' => $reviewPassed,
                    'backup_verified' => (bool) ($payload['backup_verified'] ?? false),
                    'changed_files' => $changedFiles,
                    'diff_text' => $diffText,
                ]);

                $reversibilityClassification = $assessment['classification'];
                $riskLevel = $assessment['risk_level'];
                $reversibilityAssessment = $assessment;
            }

            $nextRole = $profile['handoff']['next_role'] ?? null;
            $isFinalGate = $nextRole === null || $role === 'release_manager';

            $locked->update([
                'branch' => $payload['branch'] ?? $locked->branch,
                'commit_sha' => $payload['commit_sha'] ?? $locked->commit_sha,
                'pr_url' => $payload['pr_url'] ?? $locked->pr_url,
                'test_summary' => (string) ($payload['test_summary'] ?? "{$role} completed successfully"),
                'tests_passed' => (bool) ($payload['tests_passed'] ?? true),
                'target_environment' => (string) ($payload['target_environment'] ?? $locked->target_environment ?? 'staging'),
                'artifact_output' => $payload,
                'reversibility_classification' => $reversibilityClassification,
                'risk_level' => $riskLevel,
                'reversibility_assessment' => $reversibilityAssessment,
                // Upstream pipeline roles mark completed to unblock the next role;
                // the final Release Manager step enters 'review' awaiting human approval.
                'status' => $isFinalGate ? 'review' : 'completed',
                'lease_token_hash' => null,
                'leased_until' => null,
            ]);

            $locked->events()->create([
                'event_key' => (string) Str::uuid(),
                'kind' => 'role_completed',
                'detail' => "Role '{$role}' finished with status '{$locked->status}'".($reversibilityClassification ? " (Reversibility: {$reversibilityClassification}, Risk: {$riskLevel})" : ''),
                'occurred_at' => now(),
            ]);

            if (! $isFinalGate) {
                $locked->todo?->update(['is_completed' => true]);

                if ($nextRole && $locked->workflow_task_id) {
                    $nextJob = $this->findWorkflowRoleJob($locked->workflow_task_id, $nextRole);
                    if ($nextJob) {
                        $nextJob->update([
                            'branch' => $locked->branch ?? $nextJob->branch,
                            'commit_sha' => $locked->commit_sha ?? $nextJob->commit_sha,
                            'pr_url' => $locked->pr_url ?? $nextJob->pr_url,
                        ]);
                        $nextJob->events()->create([
                            'event_key' => (string) Str::uuid(),
                            'kind' => 'role_handoff',
                            'detail' => "Handoff received from '{$role}' (job #{$locked->id}). Dependencies unblocked.",
                            'occurred_at' => now(),
                        ]);
                    }
                }
            }

            return $locked->fresh();
        });
    }

    /**
     * Mark a role job as failed (e.g. QA failure, security failure, timeout, or permission violation),
     * keeping its Todo incomplete so all downstream dependent role jobs remain safely blocked.
     */
    public function failRoleJob(CodingAgentJob $job, string $reason, string $eventKind = 'role_failed'): CodingAgentJob
    {
        $job->update([
            'status' => 'failed',
            'test_summary' => Str::limit($reason, 2000),
            'tests_passed' => false,
            'lease_token_hash' => null,
            'leased_until' => null,
        ]);

        $job->events()->create([
            'event_key' => (string) Str::uuid(),
            'kind' => $eventKind,
            'detail' => Str::limit($reason, 2000),
            'occurred_at' => now(),
        ]);

        return $job;
    }

    /**
     * Inspect the full execution history & status of a 6-role workflow pipeline.
     *
     * @return array<string, mixed>
     */
    public function inspectWorkflow(string $workflowTaskId, int $userId): array
    {
        $jobs = CodingAgentJob::query()
            ->where('user_id', $userId)
            ->where('workflow_task_id', $workflowTaskId)
            ->with(['events', 'todo', 'approvals'])
            ->orderBy('id')
            ->get();

        $releaseJob = $jobs->firstWhere('role', 'release_manager') ?? $jobs->last();

        return [
            'workflow_task_id' => $workflowTaskId,
            'roles_count' => $jobs->count(),
            'overall_status' => $this->deriveOverallWorkflowStatus($jobs->all()),
            'reversibility_classification' => $releaseJob?->reversibility_classification,
            'risk_level' => $releaseJob?->risk_level,
            'reversibility_assessment' => $releaseJob?->reversibility_assessment,
            'human_approval_required' => true,
            'human_approved' => $releaseJob ? $releaseJob->hasCurrentApproval() : false,
            'steps' => $jobs->map(fn (CodingAgentJob $j) => [
                'job_id' => $j->id,
                'role' => $j->role,
                'execution_mode' => $j->execution_mode,
                'status' => $j->status,
                'todo_id' => $j->todo_id,
                'todo_completed' => (bool) $j->todo?->is_completed,
                'branch' => $j->branch,
                'commit_sha' => $j->commit_sha,
                'pr_url' => $j->pr_url,
                'tests_passed' => $j->tests_passed,
                'test_summary' => $j->test_summary,
                'reversibility_classification' => $j->reversibility_classification,
                'risk_level' => $j->risk_level,
                'events_count' => $j->events->count(),
            ])->values()->all(),
        ];
    }

    private function findWorkflowRoleJob(?string $workflowTaskId, string $role): ?CodingAgentJob
    {
        if (! $workflowTaskId) {
            return null;
        }

        return CodingAgentJob::query()
            ->where('workflow_task_id', $workflowTaskId)
            ->where('role', $role)
            ->first();
    }

    /**
     * @param  array<int, CodingAgentJob>  $jobs
     */
    private function deriveOverallWorkflowStatus(array $jobs): string
    {
        foreach ($jobs as $job) {
            if ($job->status === 'failed') {
                return 'failed';
            }
            if ($job->status === 'cancelled') {
                return 'cancelled';
            }
        }
        $last = end($jobs);
        if ($last && $last->status === 'completed') {
            return 'completed';
        }
        if ($last && in_array($last->status, ['review', 'release_pending'], true)) {
            return 'awaiting_human_approval';
        }

        return 'in_progress';
    }
}
