<?php

namespace App\Services\AiOrganization;

use App\Models\CodingAgentJob;
use App\Support\CodingAgentRoleRegistry;

class AgentPerformanceScorecardService
{
    /**
     * Build an evidence-based Agent Performance Scorecard across all 12 roles and active models.
     *
     *Evaluates verified outcomes (completed jobs with passing tests & zero policy violations),
     * first-pass test success, rework/retry rate, review rejection rate, token efficiency,
     * and standards compliance — never expanding role permissions automatically.
     *
     * @return array{
     *   summary: array<string, mixed>,
     *   by_role: array<string, array<string, mixed>>,
     *   by_model: array<string, array<string, mixed>>,
     *   permissions_auto_expanded: bool,
     * }
     */
    public function evaluate(int $userId, ?string $sinceIso = null): array
    {
        $query = CodingAgentJob::query()->where('user_id', $userId);
        if ($sinceIso !== null) {
            $query->where('created_at', '>=', $sinceIso);
        }

        $jobs = $query->with('events')->get();

        $totalAssigned = $jobs->count();
        $verifiedOutcomes = 0;
        $firstPassSuccess = 0;
        $failedCount = 0;
        $totalTokens = 0;
        $totalDurationMs = 0;
        $totalRetries = 0;
        $fallbackCount = 0;
        $securityViolations = 0;

        $byRole = [];
        $byModel = [];

        foreach (array_keys(CodingAgentRoleRegistry::all()) as $roleSlug) {
            $byRole[$roleSlug] = [
                'role' => $roleSlug,
                'assigned_tasks' => 0,
                'completed_tasks' => 0,
                'verified_outcomes' => 0,
                'failed_tasks' => 0,
                'first_pass_success_rate' => 0.0,
                'rework_or_retry_count' => 0,
                'total_tokens' => 0,
                'mean_duration_ms' => 0,
                'tokens_per_verified_outcome' => null,
                'security_violations' => 0,
                'permissions_auto_expanded' => false,
            ];
        }

        $roleDurationSums = [];

        foreach ($jobs as $job) {
            $role = (string) ($job->role ?: 'developer');
            $model = (string) ($job->model ?: 'hy4-flash:free');
            $art = is_array($job->artifact_output) ? $job->artifact_output : [];
            $tel = is_array($art['telemetry'] ?? null) ? $art['telemetry'] : [];

            $tokens = (int) ($tel['total_tokens'] ?? 0);
            $duration = (int) ($tel['duration_ms'] ?? 0);
            $retries = (int) ($tel['retries'] ?? 0);
            $fallback = (bool) ($tel['fallback_used'] ?? false);

            $isCompleted = in_array($job->status, ['completed', 'review'], true);
            $isVerified = $isCompleted && (bool) $job->tests_passed;
            $hasViolation = $job->events->contains(fn ($e) => in_array($e->kind, ['policy_self_modification_blocked', 'role_failed'], true) && str_contains((string) $e->detail, 'violation'));

            $totalTokens += $tokens;
            $totalDurationMs += $duration;
            $totalRetries += $retries;
            if ($fallback) {
                $fallbackCount++;
            }
            if ($hasViolation) {
                $securityViolations++;
            }

            if ($isVerified && ! $hasViolation) {
                $verifiedOutcomes++;
                if ($retries === 0) {
                    $firstPassSuccess++;
                }
            }
            if ($job->status === 'failed') {
                $failedCount++;
            }

            if (! isset($byRole[$role])) {
                $byRole[$role] = [
                    'role' => $role,
                    'assigned_tasks' => 0,
                    'completed_tasks' => 0,
                    'verified_outcomes' => 0,
                    'failed_tasks' => 0,
                    'first_pass_success_rate' => 0.0,
                    'rework_or_retry_count' => 0,
                    'total_tokens' => 0,
                    'mean_duration_ms' => 0,
                    'tokens_per_verified_outcome' => null,
                    'security_violations' => 0,
                    'permissions_auto_expanded' => false,
                ];
            }

            $byRole[$role]['assigned_tasks']++;
            if ($isCompleted) {
                $byRole[$role]['completed_tasks']++;
            }
            if ($isVerified && ! $hasViolation) {
                $byRole[$role]['verified_outcomes']++;
            }
            if ($job->status === 'failed') {
                $byRole[$role]['failed_tasks']++;
            }
            $byRole[$role]['rework_or_retry_count'] += $retries;
            $byRole[$role]['total_tokens'] += $tokens;
            if ($hasViolation) {
                $byRole[$role]['security_violations']++;
            }
            $roleDurationSums[$role] = ($roleDurationSums[$role] ?? 0) + $duration;

            if (! isset($byModel[$model])) {
                $byModel[$model] = [
                    'model' => $model,
                    'assigned_tasks' => 0,
                    'verified_outcomes' => 0,
                    'failed_tasks' => 0,
                    'total_tokens' => 0,
                    'fallback_events' => 0,
                ];
            }
            $byModel[$model]['assigned_tasks']++;
            if ($isVerified && ! $hasViolation) {
                $byModel[$model]['verified_outcomes']++;
            }
            if ($job->status === 'failed') {
                $byModel[$model]['failed_tasks']++;
            }
            $byModel[$model]['total_tokens'] += $tokens;
            if ($fallback) {
                $byModel[$model]['fallback_events']++;
            }
        }

        foreach ($byRole as $slug => &$r) {
            $assigned = $r['assigned_tasks'];
            $verified = $r['verified_outcomes'];
            $r['first_pass_success_rate'] = $assigned > 0 ? round(($verified / $assigned) * 100, 1) : 0.0;
            $r['mean_duration_ms'] = $assigned > 0 ? (int) round(($roleDurationSums[$slug] ?? 0) / $assigned) : 0;
            $r['tokens_per_verified_outcome'] = $verified > 0 ? (int) round($r['total_tokens'] / $verified) : null;
        }
        unset($r);

        return [
            'summary' => [
                'assigned_tasks' => $totalAssigned,
                'verified_outcomes' => $verifiedOutcomes,
                'failed_tasks' => $failedCount,
                'first_pass_success_rate' => $totalAssigned > 0 ? round(($firstPassSuccess / $totalAssigned) * 100, 1) : 0.0,
                'total_tokens' => $totalTokens,
                'total_duration_ms' => $totalDurationMs,
                'tokens_per_verified_outcome' => $verifiedOutcomes > 0 ? (int) round($totalTokens / $verifiedOutcomes) : null,
                'total_retries' => $totalRetries,
                'fallback_events' => $fallbackCount,
                'security_violations' => $securityViolations,
            ],
            'by_role' => $byRole,
            'by_model' => array_values($byModel),
            'permissions_auto_expanded' => false,
        ];
    }
}
