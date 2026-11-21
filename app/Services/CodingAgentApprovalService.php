<?php

namespace App\Services;

use App\Models\CodingAgentJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Aturan persetujuan rilis untuk coding agent job.
 *
 * Dipakai bersama oleh halaman web dan API (BOTOL memanggil API ini dari
 * Discord). Aturannya sengaja tidak ditulis dua kali: approve harus selalu
 * memeriksa commit dan environment yang benar-benar ditinjau, dan hanya boleh
 * terjadi sekali per artefak.
 */
class CodingAgentApprovalService
{
    public const APPROVABLE_STATUSES = ['review', 'release_pending'];

    /**
     * Setujui rilis untuk commit yang ditinjau.
     *
     * @return string 'merged' bila PR langsung di-merge, 'pending' bila menunggu.
     */
    public function approve(CodingAgentJob $job, int $userId, string $commitSha, string $environment, bool $highRiskOverride = false): string
    {
        $result = 'pending';

        DB::transaction(function () use ($job, $userId, $commitSha, $environment, $highRiskOverride, &$result): void {
            $locked = CodingAgentJob::query()->whereKey($job->id)
                ->where('user_id', $userId)->lockForUpdate()->firstOrFail();

            abort_unless(
                in_array($locked->status, self::APPROVABLE_STATUSES, true)
                    && $locked->tests_passed === true
                    && preg_match('/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/', (string) $locked->commit_sha)
                    && hash_equals((string) $locked->commit_sha, $commitSha)
                    && $locked->target_environment === $environment,
                409,
                'The reviewed artifact changed or is not ready for approval.'
            );

            // Enforce PR Reversibility Gate when an assessment is attached to the job:
            // UNKNOWN or IRREVERSIBLE classifications block approval unless explicit
            // high-risk human override + prerequisites are provided.
            if ($locked->reversibility_classification !== null) {
                $assessment = is_array($locked->reversibility_assessment) ? $locked->reversibility_assessment : [];
                $gates = $assessment['gates'] ?? [];
                $allowMerge = (bool) ($gates['allow_merge_request'] ?? false);

                if (in_array($locked->reversibility_classification, ['UNKNOWN', 'IRREVERSIBLE'], true) && ! $highRiskOverride) {
                    abort(409, "Release approval blocked: PR reversibility is {$locked->reversibility_classification} ({$locked->risk_level}). Explicit high-risk override and verified recovery prerequisites are required.");
                }
                if (! $allowMerge && ! $highRiskOverride) {
                    $reasons = implode(' ', (array) ($gates['blocking_conditions'] ?? ['Release safety gate not satisfied.']));
                    abort(409, "Release approval blocked by safety gate: {$reasons}");
                }
            }

            $approval = $locked->approvals()->firstOrCreate(
                [
                    'repository' => $locked->repository,
                    'target_environment' => $locked->target_environment,
                    'commit_sha' => $locked->commit_sha,
                ],
                ['approved_by' => $userId]
            );

            if ($approval->wasRecentlyCreated) {
                $locked->events()->create([
                    'event_key' => (string) Str::uuid(),
                    'kind' => 'release_approved',
                    'detail' => "{$locked->target_environment}:{$locked->commit_sha}",
                    'occurred_at' => now(),
                ]);
            }

            if ($this->attemptAutoMerge($locked)) {
                $locked->update(['status' => 'completed']);
                $locked->todo?->update(['is_completed' => true]);
                $locked->events()->create([
                    'event_key' => (string) Str::uuid(),
                    'kind' => 'release_merged',
                    'detail' => "merged_pr:{$locked->pr_url}",
                    'occurred_at' => now(),
                ]);
                $result = 'merged';
            } else {
                $locked->update(['status' => 'release_pending']);
            }
        });

        return $result;
    }

    /** Tolak rilis: job dibatalkan, alasannya dicatat sebagai event. */
    public function reject(CodingAgentJob $job, int $userId, ?string $reason = null): void
    {
        DB::transaction(function () use ($job, $userId, $reason): void {
            $locked = CodingAgentJob::query()->whereKey($job->id)
                ->where('user_id', $userId)->lockForUpdate()->firstOrFail();

            abort_unless(
                in_array($locked->status, self::APPROVABLE_STATUSES, true),
                409,
                'Only a job awaiting release can be rejected.'
            );

            $locked->update(['status' => 'cancelled']);
            $locked->events()->create([
                'event_key' => (string) Str::uuid(),
                'kind' => 'release_rejected',
                'detail' => $reason !== null && $reason !== '' ? $reason : 'rejected from Discord',
                'occurred_at' => now(),
            ]);
        });
    }

    /**
     * Prepare and audit a controlled rollback execution request (never auto-mutates production unapproved).
     *
     * @param  array{prerequisites_verified?: bool, approval_confirmed?: bool, health_checks?: array<int, string>}  $options
     * @return array<string, mixed>
     */
    public function prepareRollback(CodingAgentJob $job, int $userId, string $targetRelease, array $options = []): array
    {
        $ownerId = (int) config('coding_agent.owner_user_id', 1);
        abort_unless($userId === $ownerId, 403, 'Only the authorized owner may initiate a rollback.');
        abort_unless(
            (bool) preg_match('/\Av\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?\z/', $targetRelease),
            422,
            'Target rollback release must be a valid semantic version tag (e.g. v1.5.5).'
        );

        $prerequisitesVerified = (bool) ($options['prerequisites_verified'] ?? false);
        $approvalConfirmed = (bool) ($options['approval_confirmed'] ?? false);

        abort_unless($prerequisitesVerified, 409, 'Rollback prerequisites must be verified before execution.');
        abort_unless($approvalConfirmed, 409, 'Explicit human approval is required for rollback execution.');
        abort_unless(
            $job->reversibility_classification !== 'IRREVERSIBLE',
            409,
            'Automatic rollback is blocked for IRREVERSIBLE changes; execute the forward-fix or backup recovery plan.'
        );

        return DB::transaction(function () use ($job, $userId, $targetRelease): array {
            $locked = CodingAgentJob::query()->whereKey($job->id)
                ->where('user_id', $userId)->lockForUpdate()->firstOrFail();

            $plan = $locked->reversibility_assessment['rollback_plan'] ?? [];
            $healthChecks = $plan['post_rollback_health_checks'] ?? [
                'GET /up returns HTTP 200',
                'GET /login returns HTTP 200',
                'POST /api/v1/coding-agent/claim returns HTTP 204/200',
            ];

            $locked->events()->create([
                'event_key' => (string) Str::uuid(),
                'kind' => 'rollback_authorized',
                'detail' => "target_release:{$targetRelease};authorized_by:{$userId}",
                'occurred_at' => now(),
            ]);

            return [
                'status' => 'READY_FOR_CONTROLLED_ROLLBACK',
                'job_id' => $locked->id,
                'target_release' => $targetRelease,
                'authorized_by' => $userId,
                'steps' => $plan['step_by_step_recovery_procedure'] ?? [],
                'required_health_checks' => $healthChecks,
                'audit_recorded' => true,
            ];
        });
    }

    private function attemptAutoMerge(CodingAgentJob $job): bool
    {
        $token = config('coding_agent.github_token') ?? config('services.github.token');
        if (! $token || ! $job->pr_url) {
            return false;
        }

        if (! preg_match('#github\.com/([^/]+/[^/]+)/pull/(\d+)#', $job->pr_url, $matches)) {
            return false;
        }

        $repository = $matches[1];
        $pullNumber = (int) $matches[2];

        try {
            $response = Http::withToken($token)
                ->withHeaders([
                    'Accept' => 'application/vnd.github+json',
                    'X-GitHub-Api-Version' => '2022-11-28',
                ])
                ->put("https://api.github.com/repos/{$repository}/pulls/{$pullNumber}/merge", [
                    'commit_title' => "feat(agent): release coding job #{$job->id}",
                    'merge_method' => 'merge',
                ]);

            if ($response->successful()) {
                return true;
            }

            Log::warning("GitHub PR merge failed for job #{$job->id}: {$response->status()} - {$response->body()}");
        } catch (\Throwable $e) {
            Log::error("GitHub PR merge exception for job #{$job->id}: {$e->getMessage()}");
        }

        return false;
    }
}
