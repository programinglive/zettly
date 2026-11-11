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
    public function approve(CodingAgentJob $job, int $userId, string $commitSha, string $environment): string
    {
        $result = 'pending';

        DB::transaction(function () use ($job, $userId, $commitSha, $environment, &$result): void {
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
