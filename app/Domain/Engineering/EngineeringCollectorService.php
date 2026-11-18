<?php

namespace App\Domain\Engineering;

use App\Models\EngineeringPipelineEvent;
use App\Models\EngineeringProject;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;

class EngineeringCollectorService
{
    private const HTTP_TIMEOUT_SECONDS = 8;

    public function syncProject(EngineeringProject $project): EngineeringProject
    {
        if ($project->provider !== 'github') {
            $project->forceFill([
                'github_status' => 'not_connected',
                'last_sync_error' => 'Only GitHub collector is configured for automated sync.',
                'last_synced_at' => now(),
            ])->save();

            return $project->fresh();
        }

        $token = config('services.github.token');
        if (! is_string($token) || trim($token) === '') {
            $project->forceFill([
                'github_status' => 'not_connected',
                'last_sync_error' => 'GitHub token is not configured.',
            ])->save();

            return $project->fresh();
        }

        $headers = [
            'Accept' => 'application/vnd.github+json',
            'Authorization' => 'Bearer ' . trim($token),
            'X-GitHub-Api-Version' => '2022-11-28',
        ];

        $repo = $project->repo_full_name;

        try {
            $releaseRes = Http::withHeaders($headers)
                ->timeout(self::HTTP_TIMEOUT_SECONDS)
                ->get("https://api.github.com/repos/{$repo}/releases/latest");

            if ($this->isRateLimited($releaseRes->status())) {
                return $this->markRateLimited($project);
            }

            if ($releaseRes->successful()) {
                $rel = $releaseRes->json();
                $tag = $rel['tag_name'] ?? null;
                $sha = $rel['target_commitish'] ?? null;
                $project->latest_release_tag = $tag;
                $project->latest_release_sha = $sha;

                if ($tag) {
                    $this->upsertEvent($project, [
                        'external_event_id' => "release:{$tag}",
                        'stage' => EngineeringPipelineEvent::STAGE_RELEASE,
                        'status' => EngineeringProject::STATUS_SUCCESS,
                        'commit_sha' => $sha,
                        'ref_name' => $tag,
                        'workflow_name' => "Release {$tag}",
                        'source_url' => $rel['html_url'] ?? null,
                        'source_provenance' => 'github_api',
                        'occurred_at' => $this->parseDate($rel['published_at'] ?? null),
                    ]);
                }
            }

            $runsRes = Http::withHeaders($headers)
                ->timeout(self::HTTP_TIMEOUT_SECONDS)
                ->get("https://api.github.com/repos/{$repo}/actions/runs", ['per_page' => 10]);

            if ($this->isRateLimited($runsRes->status())) {
                return $this->markRateLimited($project);
            }

            if ($runsRes->successful()) {
                foreach ($runsRes->json('workflow_runs', []) as $run) {
                    $runId = (string) ($run['id'] ?? '');
                    if ($runId === '') {
                        continue;
                    }
                    $this->upsertEvent($project, [
                        'external_event_id' => "workflow_run:{$runId}",
                        'stage' => EngineeringPipelineEvent::STAGE_CI,
                        'status' => $this->mapGitHubStatus($run['status'] ?? null, $run['conclusion'] ?? null),
                        'commit_sha' => $run['head_sha'] ?? null,
                        'ref_name' => $run['head_branch'] ?? null,
                        'workflow_name' => $run['name'] ?? 'GitHub Actions',
                        'run_id' => $runId,
                        'source_url' => $run['html_url'] ?? null,
                        'source_provenance' => 'github_api',
                        'occurred_at' => $this->parseDate($run['updated_at'] ?? $run['created_at'] ?? null),
                    ]);
                }
            }

            $pullsRes = Http::withHeaders($headers)
                ->timeout(self::HTTP_TIMEOUT_SECONDS)
                ->get("https://api.github.com/repos/{$repo}/pulls", ['state' => 'open', 'per_page' => 10]);

            if ($this->isRateLimited($pullsRes->status())) {
                return $this->markRateLimited($project);
            }

            if ($pullsRes->successful()) {
                foreach ($pullsRes->json() as $pr) {
                    $number = (int) ($pr['number'] ?? 0);
                    if ($number <= 0) {
                        continue;
                    }
                    $this->upsertEvent($project, [
                        'external_event_id' => "pull_request:{$number}:" . ($pr['head']['sha'] ?? 'head'),
                        'stage' => EngineeringPipelineEvent::STAGE_PULL_REQUEST,
                        'status' => EngineeringProject::STATUS_RUNNING,
                        'commit_sha' => $pr['head']['sha'] ?? null,
                        'ref_name' => $pr['head']['ref'] ?? null,
                        'pr_number' => $number,
                        'workflow_name' => $pr['title'] ?? "PR #{$number}",
                        'source_url' => $pr['html_url'] ?? null,
                        'source_provenance' => 'github_api',
                        'occurred_at' => $this->parseDate($pr['updated_at'] ?? null),
                    ]);
                }
            }

            $project->github_status = 'ok';
            $project->last_sync_error = null;
            $project->last_synced_at = now();
            $project->save();

            return $project->fresh();
        } catch (\Throwable $e) {
            $project->forceFill([
                'github_status' => 'error',
                'last_sync_error' => $e->getMessage(),
                'last_synced_at' => now(),
            ])->save();

            return $project->fresh();
        }
    }

    public function ingestGitHubWebhook(string $event, string $deliveryId, array $payload): int
    {
        $repoFullName = (string) ($payload['repository']['full_name'] ?? '');
        if ($repoFullName === '') {
            return 0;
        }

        $projects = EngineeringProject::where('repo_full_name', $repoFullName)->get();
        if ($projects->isEmpty()) {
            return 0;
        }

        $mapped = $this->mapWebhookPayload($event, $deliveryId, $payload);
        if ($mapped === null) {
            return 0;
        }

        $count = 0;
        foreach ($projects as $project) {
            $this->upsertEvent($project, $mapped);
            if ($event === 'release' && ! empty($mapped['ref_name'])) {
                $project->latest_release_tag = $mapped['ref_name'];
                $project->latest_release_sha = $mapped['commit_sha'] ?? $project->latest_release_sha;
            }
            $project->github_status = 'ok';
            $project->last_synced_at = now();
            $project->save();
            $count++;
        }

        return $count;
    }

    private function mapWebhookPayload(string $event, string $deliveryId, array $payload): ?array
    {
        if ($event === 'workflow_run' && ! empty($payload['workflow_run'])) {
            $run = $payload['workflow_run'];
            $runId = (string) ($run['id'] ?? $deliveryId);

            return [
                'external_event_id' => "workflow_run:{$runId}",
                'stage' => EngineeringPipelineEvent::STAGE_CI,
                'status' => $this->mapGitHubStatus($run['status'] ?? null, $run['conclusion'] ?? null),
                'commit_sha' => $run['head_sha'] ?? null,
                'ref_name' => $run['head_branch'] ?? null,
                'workflow_name' => $run['name'] ?? 'GitHub Actions',
                'run_id' => $runId,
                'source_url' => $run['html_url'] ?? null,
                'source_provenance' => 'github_webhook',
                'occurred_at' => $this->parseDate($run['updated_at'] ?? null),
            ];
        }

        if ($event === 'release' && ! empty($payload['release'])) {
            $rel = $payload['release'];
            $tag = (string) ($rel['tag_name'] ?? $deliveryId);

            return [
                'external_event_id' => "release:{$tag}",
                'stage' => EngineeringPipelineEvent::STAGE_RELEASE,
                'status' => EngineeringProject::STATUS_SUCCESS,
                'commit_sha' => $rel['target_commitish'] ?? null,
                'ref_name' => $tag,
                'workflow_name' => "Release {$tag}",
                'source_url' => $rel['html_url'] ?? null,
                'source_provenance' => 'github_webhook',
                'occurred_at' => $this->parseDate($rel['published_at'] ?? null),
            ];
        }

        if ($event === 'push' && ! empty($payload['after'])) {
            return [
                'external_event_id' => 'push:' . ($payload['after']),
                'stage' => EngineeringPipelineEvent::STAGE_COMMIT,
                'status' => EngineeringProject::STATUS_SUCCESS,
                'commit_sha' => $payload['after'],
                'ref_name' => str_replace('refs/heads/', '', (string) ($payload['ref'] ?? '')),
                'workflow_name' => 'Git Push',
                'source_url' => $payload['compare'] ?? null,
                'source_provenance' => 'github_webhook',
                'occurred_at' => now(),
            ];
        }

        return null;
    }

    private function upsertEvent(EngineeringProject $project, array $attributes): EngineeringPipelineEvent
    {
        return EngineeringPipelineEvent::updateOrCreate(
            [
                'engineering_project_id' => $project->id,
                'external_event_id' => $attributes['external_event_id'],
            ],
            $attributes
        );
    }

    private function mapGitHubStatus(?string $status, ?string $conclusion): string
    {
        if ($status === 'queued' || $status === 'waiting') {
            return EngineeringProject::STATUS_QUEUED;
        }
        if ($status === 'in_progress') {
            return EngineeringProject::STATUS_RUNNING;
        }

        return match ($conclusion) {
            'success' => EngineeringProject::STATUS_SUCCESS,
            'failure', 'timed_out', 'startup_failure' => EngineeringProject::STATUS_FAILED,
            'skipped' => EngineeringProject::STATUS_SKIPPED,
            'cancelled', 'action_required' => EngineeringProject::STATUS_BLOCKED,
            default => EngineeringProject::STATUS_UNKNOWN,
        };
    }

    private function isRateLimited(int $status): bool
    {
        return $status === 429 || $status === 403;
    }

    private function markRateLimited(EngineeringProject $project): EngineeringProject
    {
        $project->forceFill([
            'github_status' => 'rate_limited',
            'last_sync_error' => 'GitHub API rate limit reached; showing last known state.',
        ])->save();

        return $project->fresh();
    }

    private function parseDate(?string $value): CarbonImmutable
    {
        if (! $value) {
            return CarbonImmutable::now();
        }

        return CarbonImmutable::parse($value);
    }
}
