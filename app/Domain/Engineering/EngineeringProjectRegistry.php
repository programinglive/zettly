<?php

namespace App\Domain\Engineering;

use App\Models\AgentSession;
use App\Models\CodingAgentJob;
use App\Models\EngineeringPipelineEvent;
use App\Models\EngineeringProject;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Support\Collection;

class EngineeringProjectRegistry
{
    public const STALE_AFTER_MINUTES = 15;

    /**
     * Register default Zettly ecosystem projects for an owner if none exist yet.
     *
     * @return Collection<int, EngineeringProject>
     */
    public function ensureDefaultProjects(User $user): Collection
    {
        $existing = EngineeringProject::where('user_id', $user->id)->orderBy('id')->get();
        if ($existing->isNotEmpty()) {
            return $existing;
        }

        $defaults = [
            [
                'slug' => 'zettly-app',
                'name' => 'Zettly Application',
                'provider' => 'github',
                'repo_full_name' => 'programinglive/zettly',
                'default_branch' => 'main',
                'environment' => 'production',
                'target_url' => config('app.url'),
                'deployed_tag' => 'v' . ltrim((string) config('app.version', '1.1.0'), 'v'),
                'runtime_health_status' => 'unknown',
                'github_status' => 'not_connected',
                'mcp_status' => 'not_connected',
            ],
            [
                'slug' => 'zettly-mcp-server',
                'name' => 'Zettly MCP Server',
                'provider' => 'github',
                'repo_full_name' => 'programinglive/zettly-mcp-server',
                'default_branch' => 'feat/zettly-mcp-server-mvp',
                'environment' => 'local-runtime',
                'target_url' => null,
                'runtime_health_status' => 'not_connected',
                'github_status' => 'not_connected',
                'mcp_status' => 'not_connected',
            ],
        ];

        $created = collect();
        foreach ($defaults as $attrs) {
            $created->push(EngineeringProject::create(array_merge($attrs, ['user_id' => $user->id])));
        }

        return $created;
    }

    /**
     * Build a bounded, provenance-backed summary for a single project.
     */
    public function summarize(EngineeringProject $project): array
    {
        $events = $project->events()
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->limit(25)
            ->get();

        $latestByStage = [];
        foreach ($events as $event) {
            if (! isset($latestByStage[$event->stage])) {
                $latestByStage[$event->stage] = $event;
            }
        }

        $drift = $this->computeDrift($project);
        $isStale = $project->last_synced_at === null
            || $project->last_synced_at->lt(now()->subMinutes(self::STALE_AFTER_MINUTES));

        $activeSessions = AgentSession::where('user_id', $project->user_id)
            ->where('status', AgentSession::STATUS_IN_PROGRESS)
            ->orderByDesc('last_activity_at')
            ->limit(5)
            ->get(['id', 'session_id', 'machine', 'title', 'category', 'project', 'status', 'last_activity_at']);

        $activeJobs = CodingAgentJob::where('user_id', $project->user_id)
            ->whereIn('status', ['queued', 'running', 'awaiting_approval', 'release_pending'])
            ->orderByDesc('updated_at')
            ->limit(5)
            ->get(['id', 'repository', 'instruction', 'status', 'branch', 'pr_url', 'updated_at']);

        $recentBlockers = Todo::where('user_id', $project->user_id)
            ->where('is_completed', false)
            ->where('archived', false)
            ->where('is_p0', true)
            ->orderByDesc('updated_at')
            ->limit(5)
            ->get(['id', 'title', 'p0_reason', 'updated_at']);

        return [
            'id' => $project->id,
            'slug' => $project->slug,
            'name' => $project->name,
            'provider' => $project->provider,
            'repo_full_name' => $project->repo_full_name,
            'default_branch' => $project->default_branch,
            'environment' => $project->environment,
            'target_url' => $project->target_url,
            'latest_release_tag' => $project->latest_release_tag,
            'latest_release_sha' => $project->latest_release_sha,
            'deployed_tag' => $project->deployed_tag,
            'deployed_commit' => $project->deployed_commit,
            'ci_state' => $latestByStage[EngineeringPipelineEvent::STAGE_CI]->status ?? EngineeringProject::STATUS_UNKNOWN,
            'test_state' => $latestByStage[EngineeringPipelineEvent::STAGE_CI]->status ?? EngineeringProject::STATUS_UNKNOWN,
            'build_state' => $latestByStage[EngineeringPipelineEvent::STAGE_BUILD]->status
                ?? $latestByStage[EngineeringPipelineEvent::STAGE_RELEASE]->status
                ?? EngineeringProject::STATUS_UNKNOWN,
            'last_commit_sha' => $latestByStage[EngineeringPipelineEvent::STAGE_COMMIT]->commit_sha
                ?? $latestByStage[EngineeringPipelineEvent::STAGE_CI]->commit_sha
                ?? null,
            'github_status' => $project->github_status,
            'runtime_health_status' => $project->runtime_health_status,
            'mcp' => [
                'status' => $project->mcp_status,
                'version' => $project->mcp_version,
                'tools_count' => $project->mcp_tools_count,
                'prompts_count' => $project->mcp_prompts_count,
            ],
            'blocking_incident' => $project->blocking_incident,
            'is_stale' => $isStale,
            'last_synced_at' => $project->last_synced_at?->toIso8601String(),
            'last_sync_error' => $project->last_sync_error,
            'drift' => $drift,
            'timeline' => $events->map(fn (EngineeringPipelineEvent $event) => [
                'id' => $event->id,
                'stage' => $event->stage,
                'status' => $event->status,
                'commit_sha' => $event->commit_sha,
                'ref_name' => $event->ref_name,
                'pr_number' => $event->pr_number,
                'workflow_name' => $event->workflow_name,
                'run_id' => $event->run_id,
                'duration_seconds' => $event->duration_seconds,
                'error_summary' => $event->error_summary,
                'source_url' => $event->source_url,
                'source_provenance' => $event->source_provenance,
                'occurred_at' => $event->occurred_at?->toIso8601String(),
            ])->values()->all(),
            'active_agents' => $activeSessions->values()->all(),
            'active_jobs' => $activeJobs->values()->all(),
            'p0_blockers' => $recentBlockers->values()->all(),
        ];
    }

    public function computeDrift(EngineeringProject $project): array
    {
        $releaseTag = $project->latest_release_tag;
        $releaseSha = $project->latest_release_sha;
        $deployedTag = $project->deployed_tag;
        $deployedSha = $project->deployed_commit;

        $hasDrift = false;
        if ($releaseTag !== null && $deployedTag !== null && $releaseTag !== $deployedTag) {
            $hasDrift = true;
        } elseif ($releaseSha !== null && $deployedSha !== null && $releaseSha !== $deployedSha) {
            $hasDrift = true;
        } elseif ($releaseTag !== null && $deployedTag === null) {
            $hasDrift = true;
        }

        $summary = null;
        if ($hasDrift) {
            $releaseLabel = $releaseTag ?: ($releaseSha ? substr($releaseSha, 0, 7) : 'unpublished');
            $deployedLabel = $deployedTag ?: ($deployedSha ? substr($deployedSha, 0, 7) : 'not deployed');
            $reason = $project->blocking_incident ? ' — ' . $project->blocking_incident : '';
            $summary = sprintf(
                'GitHub release %s published — production still %s%s',
                $releaseLabel,
                $deployedLabel,
                $reason
            );
        }

        return [
            'has_drift' => $hasDrift,
            'latest_release_tag' => $releaseTag,
            'latest_release_sha' => $releaseSha,
            'deployed_tag' => $deployedTag,
            'deployed_commit' => $deployedSha,
            'summary' => $summary,
        ];
    }
}
