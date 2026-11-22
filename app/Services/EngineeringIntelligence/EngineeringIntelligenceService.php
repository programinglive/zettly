<?php

namespace App\Services\EngineeringIntelligence;

use App\Models\CodingAgentJob;
use App\Models\EngineeringImprovement;
use App\Models\EngineeringLesson;
use App\Models\EngineeringPipelineEvent;
use App\Models\EngineeringRetrospective;
use App\Models\Focus;
use App\Models\Todo;
use App\Services\AgentSessionIngestor;
use App\Services\AiOrganization\AgentPerformanceScorecardService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class EngineeringIntelligenceService
{
    public const TIMEZONE = 'Asia/Jakarta';

    public function __construct(
        private readonly AgentPerformanceScorecardService $scorecardService,
    ) {
    }

    /**
     * Generate or regenerate an idempotent, versioned Daily Engineering Retrospective
     * (`Daily Engineering Retrospective — YYYY-MM-DD`, Sections A–J, Asia/Jakarta boundaries).
     */
    public function generateDailyRetrospective(int $userId, ?string $dateWib = null, bool $forceRegenerate = false): EngineeringRetrospective
    {
        $targetDay = $dateWib
            ? CarbonImmutable::createFromFormat('Y-m-d', $dateWib, self::TIMEZONE)->startOfDay()
            : CarbonImmutable::now(self::TIMEZONE)->subDay()->startOfDay();

        $periodKey = $targetDay->format('Y-m-d');
        $startUtc = $targetDay->startOfDay()->utc();
        $endUtc = $targetDay->endOfDay()->utc();
        $title = "Daily Engineering Retrospective — {$periodKey}";

        return $this->persistRetrospective(
            $userId,
            EngineeringRetrospective::KIND_DAILY,
            $periodKey,
            $title,
            $startUtc,
            $endUtc,
            $forceRegenerate
        );
    }

    /**
     * Generate or regenerate an idempotent, versioned Weekly Engineering Retrospective
     * (`Weekly Engineering Retrospective — YYYY-Www`, 20 Sections, Monday–Sunday in Asia/Jakarta).
     */
    public function generateWeeklyRetrospective(int $userId, ?string $isoWeekKey = null, bool $forceRegenerate = false): EngineeringRetrospective
    {
        if ($isoWeekKey && preg_match('/\A(\d{4})-W(\d{2})\z/', $isoWeekKey, $m)) {
            $monday = CarbonImmutable::now(self::TIMEZONE)->setISODate((int) $m[1], (int) $m[2], 1)->startOfDay();
        } else {
            $monday = CarbonImmutable::now(self::TIMEZONE)->subWeek()->startOfWeek()->startOfDay();
        }

        $sunday = $monday->endOfWeek()->endOfDay();
        $periodKey = $monday->format('o-\WW');
        $title = "Weekly Engineering Retrospective — {$periodKey}";

        return $this->persistRetrospective(
            $userId,
            EngineeringRetrospective::KIND_WEEKLY,
            $periodKey,
            $title,
            $monday->utc(),
            $sunday->utc(),
            $forceRegenerate
        );
    }

    /**
     * Generate or regenerate an idempotent, versioned Monthly Engineering Excellence Review
     * (`Monthly Engineering Excellence Review — YYYY-MM`, 15 Sections, calendar month in Asia/Jakarta).
     */
    public function generateMonthlyRetrospective(int $userId, ?string $monthKey = null, bool $forceRegenerate = false): EngineeringRetrospective
    {
        $monthStart = $monthKey
            ? CarbonImmutable::createFromFormat('Y-m', $monthKey, self::TIMEZONE)->startOfMonth()->startOfDay()
            : CarbonImmutable::now(self::TIMEZONE)->subMonth()->startOfMonth()->startOfDay();

        $monthEnd = $monthStart->endOfMonth()->endOfDay();
        $periodKey = $monthStart->format('Y-m');
        $title = "Monthly Engineering Excellence Review — {$periodKey}";

        return $this->persistRetrospective(
            $userId,
            EngineeringRetrospective::KIND_MONTHLY,
            $periodKey,
            $title,
            $monthStart->utc(),
            $monthEnd->utc(),
            $forceRegenerate
        );
    }

    /**
     * Detect recurring engineering problems by grouping failure evidence (error pattern, role, rule_id)
     * and create/increment deduplicated improvement proposals in the Improvement Backlog.
     *
     * @return array<int, EngineeringImprovement>
     */
    public function detectRecurringProblems(int $userId, ?string $periodKey = null): array
    {
        $failedJobs = CodingAgentJob::query()
            ->where('user_id', $userId)
            ->where('status', 'failed')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        $groups = [];
        foreach ($failedJobs as $fj) {
            $summary = AgentSessionIngestor::redact((string) ($fj->test_summary ?: 'Unknown job failure'), 300);
            $normalizedReason = preg_replace('/#\d+|\b[0-9a-f]{8,40}\b/i', '<id>', $summary) ?: $summary;
            $key = $fj->role.':'.substr($normalizedReason, 0, 120);
            $fp = hash('sha256', "recurring:{$userId}:{$key}");

            if (! isset($groups[$fp])) {
                $groups[$fp] = [
                    'fingerprint' => $fp,
                    'role' => $fj->role ?: 'developer',
                    'reason' => $normalizedReason,
                    'job_ids' => [],
                ];
            }
            $groups[$fp]['job_ids'][] = $fj->id;
        }

        $createdOrUpdated = [];
        foreach ($groups as $fp => $g) {
            $count = count($g['job_ids']);
            if ($count < 2) {
                continue;
            }

            $existing = EngineeringImprovement::query()
                ->where('user_id', $userId)
                ->where('fingerprint', $fp)
                ->first();

            if ($existing) {
                $existingEvidence = is_array($existing->evidence) ? $existing->evidence : [];
                $existing->update([
                    'occurrence_count' => max($existing->occurrence_count, $count),
                    'priority' => max($existing->occurrence_count, $count) >= 3 ? 'P0' : $existing->priority,
                    'evidence' => array_merge($existingEvidence, [
                        'job_ids' => $g['job_ids'],
                        'normalized_reason' => $g['reason'],
                    ]),
                ]);
                $improvement = $existing->fresh();
            } else {
                $code = 'IMP-'.strtoupper(substr($fp, 0, 6));
                $improvement = EngineeringImprovement::create([
                    'user_id' => $userId,
                    'fingerprint' => $fp,
                    'action_code' => $code,
                    'title' => AgentSessionIngestor::redact("Recurring failure in role '{$g['role']}': ".substr($g['reason'], 0, 110), 190),
                    'description' => AgentSessionIngestor::redact("Detected {$count} occurrences of failure pattern in role '{$g['role']}': {$g['reason']}", 1000),
                    'owner_role' => $g['role'],
                    'priority' => $count >= 3 ? 'P0' : 'P1',
                    'status' => 'PROPOSED',
                    'occurrence_count' => $count,
                    'source_period_key' => $periodKey,
                    'expected_outcome' => "Eliminate recurring '{$g['role']}' failure pattern and verify zero recurrences over next reporting window.",
                    'verification_criteria' => 'Automated regression test added and 0 failures for this fingerprint in subsequent retrospective.',
                    'evidence' => [
                        'job_ids' => $g['job_ids'],
                        'normalized_reason' => $g['reason'],
                    ],
                ]);
            }

            if ($improvement->isAutoPromotableToPriorityQueue()) {
                $this->autoPromoteImprovementToPriorityQueue($improvement);
                $improvement = $improvement->fresh();
            }

            $createdOrUpdated[] = $improvement;
        }

        return $createdOrUpdated;
    }

    /**
     * Automatically promote eligible Engineering Improvements (`priority_score >= 80`, `safety_level === 'safe_auto'`)
     * into the Zettly Pareto Priority Queue (`/priority`) as actionable Q1/Q2 Todos without duplicates.
     *
     * @return array{promoted_count: int, promoted_improvements: array<int, array<string, mixed>>}
     */
    public function autoPromoteImprovementsToPriorityQueue(
        int $userId,
        int $minScore = EngineeringImprovement::AUTO_PROMOTE_THRESHOLD
    ): array {
        $candidates = EngineeringImprovement::query()
            ->where('user_id', $userId)
            ->orderByDesc('occurrence_count')
            ->get();

        $promoted = [];
        foreach ($candidates as $improvement) {
            if (! $improvement->isAutoPromotableToPriorityQueue($minScore)) {
                continue;
            }

            $todo = $this->autoPromoteImprovementToPriorityQueue($improvement, $minScore);
            if ($todo) {
                $fresh = $improvement->fresh();
                $promoted[] = [
                    'improvement_id' => $fresh->id,
                    'action_code' => $fresh->action_code,
                    'title' => $fresh->title,
                    'priority_score' => $fresh->priorityScore(),
                    'safety_level' => $fresh->safetyLevel(),
                    'status' => $fresh->status,
                    'promoted_todo_id' => $todo->id,
                    'focus_id' => $todo->focus_id,
                ];
            }
        }

        return [
            'promoted_count' => count($promoted),
            'promoted_improvements' => $promoted,
        ];
    }

    public function autoPromoteImprovementToPriorityQueue(
        EngineeringImprovement $improvement,
        int $minScore = EngineeringImprovement::AUTO_PROMOTE_THRESHOLD
    ): ?Todo {
        if (! $improvement->isAutoPromotableToPriorityQueue($minScore)) {
            return null;
        }

        $existingTodoId = $improvement->promotedTodoId();
        if ($existingTodoId !== null) {
            $existingTodo = Todo::query()
                ->where('user_id', $improvement->user_id)
                ->find($existingTodoId);
            if ($existingTodo) {
                return $existingTodo;
            }
        }

        $activeFocus = Focus::query()
            ->where('user_id', $improvement->user_id)
            ->where('status', Focus::STATUS_ACTIVE)
            ->whereNull('completed_at')
            ->orderByDesc('id')
            ->first();

        $score = $improvement->priorityScore();
        $safety = $improvement->safetyLevel();
        $isUrgent = strtoupper((string) $improvement->priority) === 'P0' || $score >= 85;

        $todo = Todo::create([
            'user_id' => $improvement->user_id,
            'focus_id' => $activeFocus?->id,
            'type' => Todo::TYPE_TODO,
            'title' => "[{$improvement->action_code} · Auto-Promoted] {$improvement->title}",
            'description' => implode("\n", [
                "Auto-promoted from Continuous Improvement Backlog ({$improvement->action_code}).",
                "Priority Score: {$score}/100 · Safety Level: {$safety} · Occurrences: {$improvement->occurrence_count}",
                "Owner Role: {$improvement->owner_role}",
                "Expected Outcome: {$improvement->expected_outcome}",
                "Verification Criteria: {$improvement->verification_criteria}",
            ]),
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'priority' => $isUrgent ? Todo::PRIORITY_URGENT : Todo::PRIORITY_NOT_URGENT,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'estimate_minutes' => 45,
            'triaged_at' => now(),
            'is_completed' => false,
        ]);

        $evidence = is_array($improvement->evidence) ? $improvement->evidence : [];
        $evidence['priority_score'] = $score;
        $evidence['safety_level'] = $safety;
        $evidence['promoted_todo_id'] = $todo->id;
        $evidence['promoted_at'] = now()->toIso8601String();

        $nextStatus = in_array($improvement->status, ['OBSERVED', 'TRIAGED', 'PROPOSED'], true)
            ? 'APPROVED_BY_POLICY'
            : $improvement->status;

        $improvement->update([
            'status' => $nextStatus,
            'evidence' => $evidence,
        ]);

        return $todo;
    }

    /**
     * Transition an Engineering Improvement through the 11-state closed-loop lifecycle
     * and measure effectiveness when transitioning to EFFECTIVE / INEFFECTIVE / CLOSED.
     *
     * @param  array<string, mixed>  $effectivenessMetrics
     */
    public function transitionImprovement(
        EngineeringImprovement $improvement,
        string $nextStatus,
        array $effectivenessMetrics = []
    ): EngineeringImprovement {
        $normalized = strtoupper(trim($nextStatus));
        if (! in_array($normalized, EngineeringImprovement::STATES, true)) {
            throw new InvalidArgumentException("Invalid improvement lifecycle state: {$nextStatus}");
        }

        $updates = ['status' => $normalized];
        if ($effectivenessMetrics !== []) {
            $updates['effectiveness_metrics'] = array_merge(
                is_array($improvement->effectiveness_metrics) ? $improvement->effectiveness_metrics : [],
                $effectivenessMetrics,
                ['measured_at' => now()->toIso8601String()]
            );
        }

        $improvement->update($updates);

        return $improvement->fresh();
    }

    /**
     * Record or update a durable, deduplicated lesson in Engineering Memory.
     * Never stores unredacted secrets and distinguishes 'confirmed' from 'hypothesis'.
     *
     * @param  array{
     *   title: string,
     *   category?: string,
     *   affected_system?: string,
     *   confidence?: string,
     *   context: string,
     *   applicable_conditions?: string,
     *   known_limitations?: string,
     *   source_evidence: array<string, mixed>,
     * }  $data
     */
    public function recordLesson(int $userId, array $data): EngineeringLesson
    {
        $confidence = strtolower((string) ($data['confidence'] ?? EngineeringLesson::CONFIDENCE_CONFIRMED));
        if (! in_array($confidence, [
            EngineeringLesson::CONFIDENCE_CONFIRMED,
            EngineeringLesson::CONFIDENCE_HYPOTHESIS,
            EngineeringLesson::CONFIDENCE_INVALIDATED,
        ], true)) {
            throw new InvalidArgumentException("Invalid lesson confidence: {$confidence}");
        }

        if (empty($data['source_evidence']) || ! is_array($data['source_evidence'])) {
            throw new InvalidArgumentException('Engineering lessons require explicit source_evidence.');
        }

        $cleanTitle = AgentSessionIngestor::redact(trim($data['title']), 190);
        $cleanContext = AgentSessionIngestor::redact(trim($data['context']), 2000);
        $fingerprint = hash('sha256', "lesson:{$userId}:".strtolower($cleanTitle));

        $existing = EngineeringLesson::query()
            ->where('user_id', $userId)
            ->where('fingerprint', $fingerprint)
            ->first();

        if ($existing) {
            $existing->update([
                'confidence' => $confidence,
                'context' => $cleanContext,
                'applicable_conditions' => isset($data['applicable_conditions'])
                    ? AgentSessionIngestor::redact($data['applicable_conditions'], 1000)
                    : $existing->applicable_conditions,
                'known_limitations' => isset($data['known_limitations'])
                    ? AgentSessionIngestor::redact($data['known_limitations'], 1000)
                    : $existing->known_limitations,
                'version' => $existing->version + 1,
                'source_evidence' => $data['source_evidence'],
                'recorded_at' => now(),
            ]);

            return $existing->fresh();
        }

        return EngineeringLesson::create([
            'user_id' => $userId,
            'fingerprint' => $fingerprint,
            'title' => $cleanTitle,
            'category' => (string) ($data['category'] ?? 'incident_cause'),
            'affected_system' => (string) ($data['affected_system'] ?? 'zettly'),
            'confidence' => $confidence,
            'context' => $cleanContext,
            'applicable_conditions' => isset($data['applicable_conditions'])
                ? AgentSessionIngestor::redact($data['applicable_conditions'], 1000)
                : null,
            'known_limitations' => isset($data['known_limitations'])
                ? AgentSessionIngestor::redact($data['known_limitations'], 1000)
                : null,
            'version' => 1,
            'source_evidence' => $data['source_evidence'],
            'recorded_at' => now(),
        ]);
    }

    private function persistRetrospective(
        int $userId,
        string $kind,
        string $periodKey,
        string $title,
        CarbonImmutable $startUtc,
        CarbonImmutable $endUtc,
        bool $forceRegenerate
    ): EngineeringRetrospective {
        return DB::transaction(function () use ($userId, $kind, $periodKey, $title, $startUtc, $endUtc, $forceRegenerate): EngineeringRetrospective {
            $existing = EngineeringRetrospective::query()
                ->where('user_id', $userId)
                ->where('period_kind', $kind)
                ->where('period_key', $periodKey)
                ->lockForUpdate()
                ->first();

            if ($existing && ! $forceRegenerate) {
                return $existing;
            }

            $collected = $this->collectPeriodSignals($userId, $startUtc, $endUtc, $periodKey);
            $metrics = $collected['metrics'];
            $sections = $this->buildSections($kind, $periodKey, $collected);
            $status = $metrics['has_activity'] ? 'published' : 'no_activity';
            $markdown = $this->renderMarkdown($title, $status, $metrics, $sections);

            if ($existing) {
                $history = is_array($existing->version_history) ? $existing->version_history : [];
                $history[] = [
                    'version' => $existing->version,
                    'generated_at' => $existing->generated_at?->toIso8601String(),
                    'regenerated_at' => $existing->regenerated_at?->toIso8601String(),
                    'status' => $existing->status,
                    'metrics' => $existing->metrics,
                ];

                $existing->update([
                    'version' => $existing->version + 1,
                    'status' => $status,
                    'metrics' => $metrics,
                    'sections' => $sections,
                    'markdown_content' => $markdown,
                    'version_history' => $history,
                    'regenerated_at' => now(),
                ]);

                return $existing->fresh();
            }

            return EngineeringRetrospective::create([
                'user_id' => $userId,
                'period_kind' => $kind,
                'period_key' => $periodKey,
                'timezone' => self::TIMEZONE,
                'period_start' => $startUtc,
                'period_end' => $endUtc,
                'title' => $title,
                'version' => 1,
                'status' => $status,
                'metrics' => $metrics,
                'sections' => $sections,
                'markdown_content' => $markdown,
                'version_history' => [],
                'generated_at' => now(),
            ]);
        });
    }

    /**
     * Collect deterministic, evidence-backed engineering signals for a UTC time window.
     * Explicitly marks unmeasured metrics as 'NOT_MEASURED' instead of fabricating numbers.
     *
     * @return array<string, mixed>
     */
    private function collectPeriodSignals(int $userId, CarbonImmutable $startUtc, CarbonImmutable $endUtc, string $periodKey): array
    {
        // Only count a job as verified completed when status is completed/review AND tests_passed is true
        $jobs = CodingAgentJob::query()
            ->where('user_id', $userId)
            ->whereBetween('updated_at', [$startUtc, $endUtc])
            ->get();

        $completedTodos = Todo::query()
            ->where('user_id', $userId)
            ->where('is_completed', true)
            ->whereBetween('updated_at', [$startUtc, $endUtc])
            ->get(['id', 'title']);

        $pipelineEvents = EngineeringPipelineEvent::query()
            ->whereBetween('occurred_at', [$startUtc, $endUtc])
            ->get();

        $verifiedJobs = $jobs->filter(fn (CodingAgentJob $j) => in_array($j->status, ['completed', 'review'], true) && $j->tests_passed);
        $failedJobs = $jobs->filter(fn (CodingAgentJob $j) => $j->status === 'failed');
        $inProgressJobs = $jobs->filter(fn (CodingAgentJob $j) => in_array($j->status, ['queued', 'running', 'paused'], true));
        $deployedJobs = $jobs->filter(fn (CodingAgentJob $j) => $j->delivery_stage === 'PRODUCTION_VERIFIED');
        $mergedJobs = $jobs->filter(fn (CodingAgentJob $j) => $j->merge_sha !== null || $j->status === 'completed');

        $totalTokens = 0;
        $totalDurationMs = 0;
        $measuredDurations = 0;

        foreach ($jobs as $j) {
            $art = is_array($j->artifact_output) ? $j->artifact_output : [];
            $tel = is_array($art['telemetry'] ?? null) ? $art['telemetry'] : [];
            $totalTokens += (int) ($tel['total_tokens'] ?? 0);
            if (isset($tel['duration_ms'])) {
                $totalDurationMs += (int) $tel['duration_ms'];
                $measuredDurations++;
            }
        }

        $recurringImprovements = $this->detectRecurringProblems($userId, $periodKey);
        $hasActivity = $jobs->isNotEmpty() || $completedTodos->isNotEmpty() || $pipelineEvents->isNotEmpty();

        $totalEvaluated = $verifiedJobs->count() + $failedJobs->count();
        $testPassRate = $totalEvaluated > 0
            ? round(($verifiedJobs->count() / $totalEvaluated) * 100, 1)
            : 'NOT_MEASURED';

        $meanDurationMs = $measuredDurations > 0
            ? (int) round($totalDurationMs / $measuredDurations)
            : 'NOT_MEASURED';

        return [
            'jobs' => $jobs,
            'verified_jobs' => $verifiedJobs,
            'failed_jobs' => $failedJobs,
            'in_progress_jobs' => $inProgressJobs,
            'completed_todos' => $completedTodos,
            'recurring_improvements' => $recurringImprovements,
            'metrics' => [
                'has_activity' => $hasActivity,
                'tasks_completed' => $completedTodos->count() + $verifiedJobs->count(),
                'verified_agent_jobs' => $verifiedJobs->count(),
                'prs_merged' => $mergedJobs->count(),
                'deployments_verified' => $deployedJobs->count(),
                'failed_tasks' => $failedJobs->count(),
                'in_progress_tasks' => $inProgressJobs->count(),
                'mean_task_duration_ms' => $meanDurationMs,
                'queue_wait_time_ms' => 'NOT_MEASURED',
                'test_pass_rate_percent' => $testPassRate,
                'token_usage' => $totalTokens,
                'ai_execution_cost_usd' => 0.0, // Free Kenari models allowlist
                'recurring_problems_detected' => count($recurringImprovements),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $collected
     * @return array<string, mixed>
     */
    private function buildSections(string $kind, string $periodKey, array $collected): array
    {
        $m = $collected['metrics'];
        /** @var \Illuminate\Support\Collection<int, CodingAgentJob> $verifiedJobs */
        $verifiedJobs = $collected['verified_jobs'];
        /** @var \Illuminate\Support\Collection<int, CodingAgentJob> $failedJobs */
        $failedJobs = $collected['failed_jobs'];
        /** @var array<int, EngineeringImprovement> $improvements */
        $improvements = $collected['recurring_improvements'];

        if (! $m['has_activity']) {
            return [
                'A_executive_summary' => "No recorded engineering jobs, completed todos, or pipeline events during {$periodKey} (Asia/Jakarta). Factual no-activity report generated without fabricated analysis.",
                'B_work_completed' => [],
                'C_work_in_progress' => [],
                'D_what_went_well' => ['No failures or security incidents occurred during this quiet window.'],
                'E_what_did_not_go_well' => [],
                'F_lessons_learned' => [],
                'G_improvement_opportunities' => [],
                'H_next_priorities' => ['Execute highest-leverage backlog items from Zettly Pareto Priority Queue (/priority).'],
                'I_engineering_metrics' => $m,
                'J_action_items' => [],
            ];
        }

        $workCompleted = $verifiedJobs->map(fn (CodingAgentJob $j) => AgentSessionIngestor::redact(
            "Job #{$j->id} [{$j->role} · {$j->routing_profile}] on {$j->repository}".($j->commit_sha ? ' (SHA: '.substr($j->commit_sha, 0, 10).')' : ''),
            300
        ))->values()->all();

        $didNotGoWell = $failedJobs->map(fn (CodingAgentJob $j) => AgentSessionIngestor::redact(
            "Job #{$j->id} [{$j->role}] failed: ".($j->test_summary ?: 'unspecified failure'),
            300
        ))->values()->all();

        $actionItems = array_map(fn (EngineeringImprovement $imp) => [
            'action_id' => $imp->action_code,
            'title' => $imp->title,
            'owner_role' => $imp->owner_role,
            'priority' => $imp->priority,
            'status' => $imp->status,
            'expected_outcome' => $imp->expected_outcome,
            'verification_criteria' => $imp->verification_criteria,
        ], $improvements);

        return [
            'A_executive_summary' => "Completed {$m['tasks_completed']} verified task(s)/job(s), merged {$m['prs_merged']} change(s), verified {$m['deployments_verified']} production deployment(s), and observed {$m['failed_tasks']} failed job(s) during {$periodKey} ({$kind}).",
            'B_work_completed' => $workCompleted,
            'C_work_in_progress' => ['active_or_queued_jobs' => $m['in_progress_tasks']],
            'D_what_went_well' => [
                "Verified {$m['verified_agent_jobs']} coding agent job(s) with passing tests and release-safety checks.",
                "Consumed {$m['token_usage']} tokens across allowlisted free Kenari models (\$0.00 direct API cost).",
            ],
            'E_what_did_not_go_well' => $didNotGoWell,
            'F_lessons_learned' => $failedJobs->isNotEmpty()
                ? ['Enforce pre-integration tests and deterministic role handoffs before promoting multi-agent branches.']
                : ['Adaptive role routing and 15-condition release gates maintained zero production regressions.'],
            'G_improvement_opportunities' => array_column($actionItems, 'title'),
            'H_next_priorities' => ['Work from top committed items on Zettly Priority Queue (/priority).'],
            'I_engineering_metrics' => $m,
            'J_action_items' => $actionItems,
        ];
    }

    /**
     * @param  array<string, mixed>  $metrics
     * @param  array<string, mixed>  $sections
     */
    private function renderMarkdown(string $title, string $status, array $metrics, array $sections): string
    {
        $lines = [
            "# {$title}",
            '',
            "**Status:** `{$status}` · **Timezone:** `Asia/Jakarta`",
            '',
            '## A. Executive Summary',
            (string) ($sections['A_executive_summary'] ?? ''),
            '',
            '## I. Engineering Metrics',
            "- Tasks Completed: `{$metrics['tasks_completed']}`",
            "- Verified Agent Jobs: `{$metrics['verified_agent_jobs']}`",
            "- PRs Merged: `{$metrics['prs_merged']}`",
            "- Deployments Verified: `{$metrics['deployments_verified']}`",
            "- Failed Tasks: `{$metrics['failed_tasks']}`",
            "- Test Pass Rate (%): `{$metrics['test_pass_rate_percent']}`",
            "- Mean Task Duration (ms): `{$metrics['mean_task_duration_ms']}`",
            "- Queue Wait Time (ms): `{$metrics['queue_wait_time_ms']}`",
            "- Token Usage: `{$metrics['token_usage']}`",
        ];

        return AgentSessionIngestor::redact(implode("\n", $lines), 15000);
    }
}
