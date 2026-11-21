<?php

namespace App\Services\AiOrganization;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\TodoDependency;
use App\Services\ReleaseSafety\AutonomousDeploymentPolicy;
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
        private readonly AutonomousDeploymentPolicy $autonomousPolicy,
    ) {
    }

    /**
     * Determine the Adaptive AI Role Routing profile (`FAST`, `STANDARD`, `FULL`) and initial risk level.
     *
     * - Profile 1 — FAST (Low Risk): docs, copy, comments, non-functional UI text -> Developer -> Release Manager
     * - Profile 2 — STANDARD (Normal Feature / Bug Fix): standard scoped feature/bugfix -> Developer -> QA Engineer -> Security & Code Reviewer -> Release Manager
     * - Profile 3 — FULL (Medium / High Risk): schema migrations, auth, permissions, payment, queuing, infra, cross-service APIs -> AI CTO -> Software Architect -> Developer -> QA Engineer -> Security & Code Reviewer -> Release Manager
     *
     * @param  array<int, string>  $changedFiles
     * @return array{profile: string, initial_risk_level: string, roles: array<int, string>, reason: string}
     */
    public function determineRoutingProfile(
        string $objective,
        array $changedFiles = [],
        string $diffText = '',
        ?string $requestedProfile = null
    ): array {
        $text = strtolower($objective.' '.$diffText.' '.implode(' ', $changedFiles));

        $highRiskKeywords = [
            'migration', 'schema', 'database', 'dropcolumn', 'droptable', 'auth', 'sanctum',
            'login', 'password', 'token', 'permission', 'policy', 'secret', 'payment', 'billing',
            'stripe', 'midtrans', 'transaction', 'queue', 'worker', 'systemd', 'deploy', 'infra',
            'workflow', 'github/workflows', 'cross-service', 'breaking',
        ];

        $hasHighRiskSignal = false;
        foreach ($highRiskKeywords as $kw) {
            if (str_contains($text, $kw)) {
                $hasHighRiskSignal = true;
                break;
            }
        }

        $isDocsOrCopyOnly = false;
        if ($changedFiles !== []) {
            $isDocsOrCopyOnly = collect($changedFiles)->every(function (string $f): bool {
                $norm = strtolower(ltrim(str_replace('\\', '/', $f), '/'));

                return str_ends_with($norm, '.md')
                    || str_starts_with($norm, 'docs/')
                    || str_contains($norm, 'readme');
            });
        } elseif (preg_match('/\b(typo|copy|doc|docs|documentation|readme|comment|label text)\b/i', $objective) && ! $hasHighRiskSignal) {
            $isDocsOrCopyOnly = true;
        }

        if ($hasHighRiskSignal) {
            $profile = CodingAgentRoleRegistry::PROFILE_FULL;
            $initialRisk = PrReversibilityAssessor::RISK_MEDIUM;
            $reason = 'High/medium-risk domain detected (schema, auth, permissions, infra, or workflow); routed to FULL 6-role pipeline.';
        } elseif ($requestedProfile !== null) {
            $profile = strtoupper(trim($requestedProfile));
            $initialRisk = $profile === CodingAgentRoleRegistry::PROFILE_FAST
                ? PrReversibilityAssessor::RISK_LOW
                : ($profile === CodingAgentRoleRegistry::PROFILE_FULL ? PrReversibilityAssessor::RISK_MEDIUM : PrReversibilityAssessor::RISK_LOW);
            $reason = "Explicitly routed to {$profile} profile.";
        } elseif ($isDocsOrCopyOnly) {
            $profile = CodingAgentRoleRegistry::PROFILE_FAST;
            $initialRisk = PrReversibilityAssessor::RISK_LOW;
            $reason = 'Low-risk documentation/copy scope; routed to FAST 2-role pipeline.';
        } else {
            $profile = CodingAgentRoleRegistry::PROFILE_STANDARD;
            $initialRisk = PrReversibilityAssessor::RISK_LOW;
            $reason = 'Standard feature/bugfix scope; routed to STANDARD 4-role pipeline.';
        }

        $roles = CodingAgentRoleRegistry::rolesForRoutingProfile($profile);

        return [
            'profile' => $profile,
            'initial_risk_level' => $initialRisk,
            'roles' => $roles,
            'reason' => $reason,
        ];
    }

    /**
     * Launch a sequential AI Engineering Organization workflow for an objective.
     *
     * Supports adaptive role routing profiles (`FAST` 2-role, `STANDARD` 4-role, `FULL` 6-role).
     * Defaults to `FULL` (6-role MVT) when `routing_profile` is omitted so existing callers remain 100% backward-compatible;
     * pass `routing_profile => 'AUTO'` (or `'FAST'` / `'STANDARD'` / `'FULL'`) for adaptive routing.
     *
     * @param  array{workflow_task_id?: string, model?: string, target_environment?: string, routing_profile?: string, changed_files?: array<int, string>}  $options
     * @return array{workflow_task_id: string, routing_profile: string, jobs: array<string, CodingAgentJob>, todos: array<string, Todo>}
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

        $requestedProfile = $options['routing_profile'] ?? CodingAgentRoleRegistry::PROFILE_FULL;
        $routing = $requestedProfile === 'AUTO'
            ? $this->determineRoutingProfile($objective, (array) ($options['changed_files'] ?? []))
            : $this->determineRoutingProfile($objective, (array) ($options['changed_files'] ?? []), '', $requestedProfile);

        $routingProfile = $routing['profile'];
        $roles = $routing['roles'];
        $initialRiskLevel = $routing['initial_risk_level'];

        return DB::transaction(function () use ($userId, $repository, $objective, $workflowTaskId, $options, $routingProfile, $roles, $initialRiskLevel): array {
            $totalSteps = count($roles);
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
                    'title' => "[AI Org Step {$stepNum}/{$totalSteps} · {$profile['title']}] ".Str::limit($objective, 110),
                    'description' => "Profile: {$routingProfile}\nRole: {$roleSlug}\nRepository: {$repository}\nObjective: {$objective}",
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
                    'routing_profile' => $routingProfile,
                    'execution_mode' => (string) ($profile['execution_mode'] ?? 'read_only'),
                    'instruction' => "[Profile: {$routingProfile} | Role: {$profile['title']}] {$profile['description']}\n\nObjective: {$objective}",
                    'model' => $model,
                    'client_request_id' => $reqId,
                    'status' => 'queued',
                    'risk_level' => $initialRiskLevel,
                    'target_environment' => (string) ($options['target_environment'] ?? 'staging'),
                ]);

                if ($rootJobId === null) {
                    $rootJobId = $job->id;
                }

                $job->events()->create([
                    'event_key' => (string) Str::uuid(),
                    'kind' => 'role_assigned',
                    'detail' => "Assigned role '{$roleSlug}' (profile: {$routingProfile}, step {$stepNum}/{$totalSteps}, mode: {$job->execution_mode}).",
                    'occurred_at' => now(),
                ]);

                $todosByRole[$roleSlug] = $todo;
                $jobsByRole[$roleSlug] = $job;
                $previousTodo = $todo;
                $previousJob = $job;
            }

            return [
                'workflow_task_id' => $workflowTaskId,
                'routing_profile' => $routingProfile,
                'jobs' => $jobsByRole,
                'todos' => $todosByRole,
            ];
        });
    }

    /**
     * Record the result of a role job, enforce role permissions & quality gates,
     * re-evaluate risk after implementation (never downgrading risk automatically),
     * compute PR reversibility when applicable, and trigger handoff to the next role in the active profile.
     *
     * @param  array<string, mixed>  $payload
     */
    public function completeRoleJob(CodingAgentJob $job, array $payload): CodingAgentJob
    {
        return DB::transaction(function () use ($job, $payload): CodingAgentJob {
            $locked = CodingAgentJob::query()->whereKey($job->id)->lockForUpdate()->firstOrFail();
            $role = (string) ($locked->role ?: 'developer');
            $profile = CodingAgentRoleRegistry::getOrFail($role);
            $routingProfile = (string) ($locked->routing_profile ?: CodingAgentRoleRegistry::PROFILE_FULL);

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

                // Zero-Approval Guardrail: autonomous roles must NEVER modify release security policies or protected rules
                $protectedViolations = $this->autonomousPolicy->detectProtectedPolicyViolations((array) $payload['changed_files']);
                if ($protectedViolations !== []) {
                    $this->failRoleJob(
                        $locked,
                        'Zero-Approval policy violation: autonomous agent attempted to modify protected release/security files: '.implode(', ', $protectedViolations),
                        'policy_self_modification_blocked'
                    );

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

            // 3. Re-evaluate PR Reversibility & Risk after implementation (no automatic risk downgrade!)
            $reversibilityClassification = $locked->reversibility_classification;
            $previousRiskLevel = (string) ($locked->risk_level ?: PrReversibilityAssessor::RISK_LOW);
            $riskLevel = $previousRiskLevel;
            $reversibilityAssessment = $locked->reversibility_assessment;

            if (in_array($role, ['developer', 'backend_engineer', 'frontend_engineer', 'database_engineer', 'release_manager'], true)) {
                $upstreamDev = $this->findWorkflowRoleJob($locked->workflow_task_id, 'developer') ?? $locked;
                $upstreamArt = is_array($upstreamDev->artifact_output) ? $upstreamDev->artifact_output : [];
                $qaJob = $this->findWorkflowRoleJob($locked->workflow_task_id, 'qa_engineer');
                $secJob = $this->findWorkflowRoleJob($locked->workflow_task_id, 'security_code_reviewer');

                $changedFiles = $payload['changed_files'] ?? $upstreamArt['changed_files'] ?? null;
                $diffText = $payload['diff_text'] ?? $upstreamArt['diff_text'] ?? null;
                $testsPassed = (bool) ($payload['tests_passed'] ?? ($qaJob ? $qaJob->tests_passed : $upstreamDev->tests_passed));
                $reviewPassed = $secJob
                    ? in_array($secJob->status, ['completed', 'review'], true)
                    : (bool) ($payload['independent_review_passed'] ?? ($routingProfile === CodingAgentRoleRegistry::PROFILE_FAST));

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

                // Enforce no automatic risk downgrade
                $reversibilityClassification = $assessment['classification'];
                $riskLevel = $this->autonomousPolicy->maxRisk($previousRiskLevel, $assessment['risk_level']);

                // If FAST profile touched non-doc/non-copy code or resulted in > LOW risk, escalate and record scope violation
                if ($routingProfile === CodingAgentRoleRegistry::PROFILE_FAST && is_array($changedFiles) && $changedFiles !== []) {
                    $reEvaluated = $this->determineRoutingProfile($locked->instruction, $changedFiles, (string) $diffText);
                    if ($reEvaluated['profile'] !== CodingAgentRoleRegistry::PROFILE_FAST || $riskLevel !== PrReversibilityAssessor::RISK_LOW) {
                        $riskLevel = $this->autonomousPolicy->maxRisk($riskLevel, PrReversibilityAssessor::RISK_MEDIUM);
                        $assessment['risk_level'] = $riskLevel;
                        $assessment['gates']['blocking_conditions'][] = 'FAST profile scope exceeded after implementation; requires FULL/STANDARD review and human approval.';
                        $assessment['gates']['allow_auto_merge'] = false;
                    }
                }

                $assessment['risk_level'] = $riskLevel;
                $reversibilityAssessment = $assessment;
            }

            // Determine next role dynamically from the workflow's ordered role chain
            $nextJob = $this->findNextWorkflowJob($locked);
            $nextRole = $nextJob?->role;
            $isFinalGate = $nextJob === null || $role === 'release_manager';

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

            if (! $isFinalGate && $nextJob) {
                $locked->todo?->update(['is_completed' => true]);

                $nextJob->update([
                    'branch' => $locked->branch ?? $nextJob->branch,
                    'commit_sha' => $locked->commit_sha ?? $nextJob->commit_sha,
                    'pr_url' => $locked->pr_url ?? $nextJob->pr_url,
                    'risk_level' => $this->autonomousPolicy->maxRisk((string) $nextJob->risk_level, (string) $riskLevel),
                ]);
                $nextJob->events()->create([
                    'event_key' => (string) Str::uuid(),
                    'kind' => 'role_handoff',
                    'detail' => "Handoff received from '{$role}' (job #{$locked->id}). Dependencies unblocked.",
                    'occurred_at' => now(),
                ]);
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
     * Inspect the full execution history & status of a multi-role workflow pipeline.
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
            'routing_profile' => $releaseJob?->routing_profile ?? CodingAgentRoleRegistry::PROFILE_FULL,
            'roles_count' => $jobs->count(),
            'overall_status' => $this->deriveOverallWorkflowStatus($jobs->all()),
            'delivery_stage' => $releaseJob?->delivery_stage,
            'reversibility_classification' => $releaseJob?->reversibility_classification,
            'risk_level' => $releaseJob?->risk_level,
            'reversibility_assessment' => $releaseJob?->reversibility_assessment,
            'human_approval_required' => true,
            'human_approved' => $releaseJob ? $releaseJob->hasCurrentApproval() : false,
            'steps' => $jobs->map(fn (CodingAgentJob $j) => [
                'job_id' => $j->id,
                'role' => $j->role,
                'routing_profile' => $j->routing_profile,
                'execution_mode' => $j->execution_mode,
                'status' => $j->status,
                'delivery_stage' => $j->delivery_stage,
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

    private function findNextWorkflowJob(CodingAgentJob $current): ?CodingAgentJob
    {
        if (! $current->workflow_task_id) {
            return null;
        }

        return CodingAgentJob::query()
            ->where('workflow_task_id', $current->workflow_task_id)
            ->where('handoff_from_job_id', $current->id)
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
