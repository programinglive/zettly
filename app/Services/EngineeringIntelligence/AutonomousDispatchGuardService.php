<?php

namespace App\Services\EngineeringIntelligence;

use App\Models\CodingAgentJob;
use App\Models\EngineeringImprovement;
use App\Services\AiOrganization\AiCtoOrchestratorService;
use App\Support\CodingAgentRepositoryRegistry;
use Carbon\CarbonImmutable;

/**
 * Zettly V1.9 Guarded Autonomous Closed-Loop Dispatch Service.
 *
 * Enforces multi-layer safety eligibility before dispatching any auto-promoted
 * EngineeringImprovement to the coding agent pipeline:
 *  - Starts in `shadow` mode by default (evaluates & records decisions without dispatching).
 *  - Supports bounded `canary` dispatch only for allowlisted repositories.
 *  - Enforces daily dispatch ceilings, per-repo concurrency caps, failure-rate circuit breakers,
 *    duplicate objective guards, active safety incident blocks, and forbidden path checks.
 *  - Never expands agent authorization limits automatically.
 */
class AutonomousDispatchGuardService
{
    public const MODE_SHADOW = 'shadow';

    public const MODE_CANARY = 'canary';

    public function __construct(
        private readonly AiCtoOrchestratorService $orchestrator,
    ) {
    }

    /**
     * Evaluate whether an EngineeringImprovement is eligible for guarded autonomous dispatch.
     *
     * @param  array<string, mixed>  $context
     * @return array{
     *   eligible: bool,
     *   mode: string,
     *   dispatched: bool,
     *   decision: string,
     *   reasons: array<int, string>,
     *   improvement_id: int,
     *   action_code: string,
     *   repository: string,
     *   workflow_task_id: ?string,
     *   permissions_auto_expanded: false
     * }
     */
    public function evaluateAndDispatch(
        EngineeringImprovement $improvement,
        string $repository,
        array $context = []
    ): array {
        $mode = strtolower((string) ($context['mode'] ?? config('coding_agent.autonomous_dispatch.mode', self::MODE_SHADOW)));
        if (! in_array($mode, [self::MODE_SHADOW, self::MODE_CANARY], true)) {
            $mode = self::MODE_SHADOW;
        }

        $reasons = [];

        if (! $improvement->isAutoPromotableToPriorityQueue()) {
            $reasons[] = 'Improvement does not meet base auto-promote threshold (priority_score >= 80 and safety_level = safe_auto).';
        }

        $isSecurityImmediate = (bool) ($context['is_high_impact_security'] ?? false);
        if (! $isSecurityImmediate && (int) $improvement->occurrence_count < 2) {
            $reasons[] = 'Recurrence policy requires at least 2 occurrences for non-critical maintenance improvements.';
        }

        if (! in_array($repository, CodingAgentRepositoryRegistry::slugs(), true)) {
            $reasons[] = "Repository '{$repository}' is not allowlisted.";
        }

        if (! empty($context['emergency_stop'])) {
            $reasons[] = 'Emergency Stop is active; autonomous dispatch halted.';
        }

        if (! empty($context['active_safety_incident'])) {
            $reasons[] = 'Active safety incident blocks autonomous dispatch.';
        }

        if (! empty($context['unresolved_high_security_issue'])) {
            $reasons[] = 'Unresolved HIGH or CRITICAL security issue affects execution.';
        }

        $expectedFiles = is_array($context['expected_files'] ?? null) ? $context['expected_files'] : [];
        if ($expectedFiles === []) {
            $reasons[] = 'Explicit file scope (expected_files) is required before autonomous dispatch.';
        } else {
            $forbiddenPrefixes = ['.env', '.github/workflows/', 'engineering/policies/', 'app/Services/ReleaseSafety/'];
            foreach ($expectedFiles as $f) {
                $norm = ltrim(str_replace('\\', '/', (string) $f), '/');
                foreach ($forbiddenPrefixes as $prefix) {
                    if ($norm === $prefix || str_starts_with($norm, $prefix)) {
                        $reasons[] = "Forbidden protected path in scope: {$norm}";
                    }
                }
            }
        }

        if (trim((string) $improvement->verification_criteria) === '') {
            $reasons[] = 'Acceptance/verification criteria must be defined.';
        }

        // Duplicate active objective guard
        $existingActive = CodingAgentJob::query()
            ->where('user_id', $improvement->user_id)
            ->where('repository', $repository)
            ->whereIn('status', ['queued', 'running', 'paused'])
            ->where('instruction', 'like', "%{$improvement->action_code}%")
            ->exists();
        if ($existingActive) {
            $reasons[] = "Duplicate active objective already queued or running for {$improvement->action_code}.";
        }

        // Daily dispatch cap & per-repo concurrency cap
        $maxDailyDispatches = (int) ($context['max_daily_dispatches'] ?? config('coding_agent.autonomous_dispatch.max_daily_dispatches', 3));
        $todayDispatches = CodingAgentJob::query()
            ->where('user_id', $improvement->user_id)
            ->where('created_at', '>=', CarbonImmutable::now('Asia/Jakarta')->startOfDay()->utc())
            ->where('instruction', 'like', '%[Autonomous Dispatch:%')
            ->count();
        if ($todayDispatches >= $maxDailyDispatches) {
            $reasons[] = "Daily autonomous dispatch ceiling reached ({$todayDispatches}/{$maxDailyDispatches}).";
        }

        $maxConcurrent = (int) config('coding_agent.max_concurrent_jobs', 2);
        $activeJobs = CodingAgentJob::query()
            ->where('user_id', $improvement->user_id)
            ->whereIn('status', ['running'])
            ->count();
        if ($activeJobs >= $maxConcurrent) {
            $reasons[] = "Concurrency slots full ({$activeJobs}/{$maxConcurrent}).";
        }

        // Failure-rate circuit breaker (recent 10 jobs)
        $recentJobs = CodingAgentJob::query()
            ->where('user_id', $improvement->user_id)
            ->orderByDesc('id')
            ->limit(10)
            ->get();
        if ($recentJobs->count() >= 4) {
            $failedCount = $recentJobs->where('status', 'failed')->count();
            $failureRate = $failedCount / $recentJobs->count();
            if ($failureRate >= 0.5) {
                $reasons[] = sprintf('Failure-rate circuit breaker open (%.0f%% recent failures).', $failureRate * 100);
            }
        }

        $eligible = $reasons === [];
        $workflowTaskId = null;
        $dispatched = false;
        $decision = ! $eligible
            ? 'BLOCKED'
            : ($mode === self::MODE_SHADOW ? 'SHADOW_ELIGIBLE_NOT_DISPATCHED' : 'CANARY_DISPATCHED');

        if ($eligible && $mode === self::MODE_CANARY) {
            $wf = $this->orchestrator->startObjective(
                $improvement->user_id,
                $repository,
                "[Autonomous Dispatch: {$improvement->action_code}] {$improvement->title}\nVerification: {$improvement->verification_criteria}",
                [
                    'routing_profile' => 'STANDARD',
                    'changed_files' => $expectedFiles,
                ]
            );
            $workflowTaskId = $wf['workflow_task_id'];
            $dispatched = true;
            $improvement->update(['status' => 'IN_PROGRESS']);
        }

        // Record full audit trail in improvement evidence without altering authorization limits
        $evidence = is_array($improvement->evidence) ? $improvement->evidence : [];
        $auditTrail = is_array($evidence['dispatch_audit_trail'] ?? null) ? $evidence['dispatch_audit_trail'] : [];
        $auditTrail[] = [
            'evaluated_at' => now()->toIso8601String(),
            'mode' => $mode,
            'decision' => $decision,
            'eligible' => $eligible,
            'dispatched' => $dispatched,
            'repository' => $repository,
            'workflow_task_id' => $workflowTaskId,
            'reasons' => $reasons,
        ];
        $evidence['dispatch_audit_trail'] = array_slice($auditTrail, -20);
        $improvement->update(['evidence' => $evidence]);

        return [
            'eligible' => $eligible,
            'mode' => $mode,
            'dispatched' => $dispatched,
            'decision' => $decision,
            'reasons' => $reasons,
            'improvement_id' => $improvement->id,
            'action_code' => $improvement->action_code,
            'repository' => $repository,
            'workflow_task_id' => $workflowTaskId,
            'permissions_auto_expanded' => false,
        ];
    }
}
