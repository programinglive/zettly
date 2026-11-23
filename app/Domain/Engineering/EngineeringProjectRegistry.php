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
                'deployed_tag' => null,
                'deployed_commit' => null,
                'runtime_health_status' => 'unknown',
                'github_status' => 'not_connected',
                'mcp_status' => 'not_connected',
            ],
            [
                'slug' => 'zettly-code',
                'name' => 'Zettly Code Knowledge Graph',
                'provider' => 'github',
                'repo_full_name' => 'programinglive/zettly-code',
                'default_branch' => 'main',
                'environment' => 'open-source',
                'target_url' => 'https://github.com/programinglive/zettly-code',
                'latest_release_tag' => 'v1.0.1',
                'deployed_tag' => 'v1.0.1',
                'runtime_health_status' => 'ok',
                'github_status' => 'ok',
                'mcp_status' => 'ok',
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
            'code_graph' => $project->metadata['code_graph'] ?? null,
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

    /**
     * Synchronize a Zettly Code knowledge graph snapshot + @zettly-code annotations
     * into the central Zettly EngineeringProject store so multi-device sessions
     * share identical code intelligence and metrics are visible in Zettly UI.
     */
    public function syncCodeGraph(User $user, array $payload): EngineeringProject
    {
        $slug = trim((string) ($payload['slug'] ?? ''));
        $repoFullName = trim((string) ($payload['repo_full_name'] ?? ''));

        $knownCatalog = [
            'zettly' => ['slug' => 'zettly-app', 'name' => 'Zettly Application', 'provider' => 'github', 'repo_full_name' => 'programinglive/zettly', 'default_branch' => 'main', 'environment' => 'production', 'target_url' => config('app.url')],
            'zettly-app' => ['slug' => 'zettly-app', 'name' => 'Zettly Application', 'provider' => 'github', 'repo_full_name' => 'programinglive/zettly', 'default_branch' => 'main', 'environment' => 'production', 'target_url' => config('app.url')],
            'zettly-code' => ['slug' => 'zettly-code', 'name' => 'Zettly Code Knowledge Graph', 'provider' => 'github', 'repo_full_name' => 'programinglive/zettly-code', 'default_branch' => 'main', 'environment' => 'open-source', 'target_url' => 'https://github.com/programinglive/zettly-code'],
            'dev-workflow' => ['slug' => 'dev-workflow', 'name' => 'DevWorkflow MCP Server', 'provider' => 'github', 'repo_full_name' => 'programinglive/dev-workflow', 'default_branch' => 'main', 'environment' => 'production', 'target_url' => 'https://devworkflow.programinglive.com'],
            'clinic' => ['slug' => 'clinic', 'name' => 'Beautyworld Clinic ERP', 'provider' => 'gitlab', 'repo_full_name' => 'beautyworld_repository/clinic', 'default_branch' => 'master', 'environment' => 'production', 'target_url' => 'https://pos.ministrybeauty.com'],
            'erp' => ['slug' => 'erp', 'name' => 'Beautyworld Backend ERP', 'provider' => 'gitlab', 'repo_full_name' => 'beautyworld_repository/erp.beautyworld.co.id', 'default_branch' => 'master', 'environment' => 'production', 'target_url' => 'https://erp.beautyworld.co.id'],
            'erp.beautyworld.co.id' => ['slug' => 'erp', 'name' => 'Beautyworld Backend ERP', 'provider' => 'gitlab', 'repo_full_name' => 'beautyworld_repository/erp.beautyworld.co.id', 'default_branch' => 'master', 'environment' => 'production', 'target_url' => 'https://erp.beautyworld.co.id'],
            'frontend_erp' => ['slug' => 'frontend-erp', 'name' => 'Beautyworld Frontend ERP', 'provider' => 'gitlab', 'repo_full_name' => 'beautyworld_repository/frontend_erp', 'default_branch' => 'main', 'environment' => 'production', 'target_url' => 'https://erp.beautyworld.id'],
            'frontend-erp' => ['slug' => 'frontend-erp', 'name' => 'Beautyworld Frontend ERP', 'provider' => 'gitlab', 'repo_full_name' => 'beautyworld_repository/frontend_erp', 'default_branch' => 'main', 'environment' => 'production', 'target_url' => 'https://erp.beautyworld.id'],
            'hris' => ['slug' => 'hris', 'name' => 'Beautyworld HRIS', 'provider' => 'gitlab', 'repo_full_name' => 'beautyworld_repository/hris.beautyworld.co.id', 'default_branch' => 'main', 'environment' => 'production', 'target_url' => 'https://hris.beautyworld.co.id'],
            'hris.beautyworld.co.id' => ['slug' => 'hris', 'name' => 'Beautyworld HRIS', 'provider' => 'gitlab', 'repo_full_name' => 'beautyworld_repository/hris.beautyworld.co.id', 'default_branch' => 'main', 'environment' => 'production', 'target_url' => 'https://hris.beautyworld.co.id'],
        ];

        $template = $knownCatalog[$slug] ?? null;
        if (! $template && $repoFullName !== '') {
            foreach ($knownCatalog as $item) {
                if (strcasecmp($item['repo_full_name'], $repoFullName) === 0) {
                    $template = $item;
                    break;
                }
            }
        }

        $canonicalSlug = $template['slug'] ?? ($slug !== '' ? $slug : str_replace(['/', '.'], '-', strtolower($repoFullName ?: 'repo')));
        $project = EngineeringProject::where('user_id', $user->id)
            ->where(function ($q) use ($canonicalSlug, $repoFullName, $template) {
                $q->where('slug', $canonicalSlug);
                $targetRepo = $template['repo_full_name'] ?? $repoFullName;
                if ($targetRepo !== '') {
                    $q->orWhere('repo_full_name', $targetRepo);
                }
            })
            ->first();

        if (! $project) {
            $project = EngineeringProject::create([
                'user_id' => $user->id,
                'slug' => $canonicalSlug,
                'name' => $payload['name'] ?? $template['name'] ?? ucfirst($canonicalSlug),
                'provider' => $payload['provider'] ?? $template['provider'] ?? 'github',
                'repo_full_name' => $template['repo_full_name'] ?? ($repoFullName !== '' ? $repoFullName : $canonicalSlug),
                'default_branch' => $payload['branch'] ?? $template['default_branch'] ?? 'main',
                'environment' => $template['environment'] ?? 'production',
                'target_url' => $template['target_url'] ?? null,
                'runtime_health_status' => 'ok',
                'github_status' => 'ok',
                'mcp_status' => 'ok',
            ]);
        }

        $existingMeta = is_array($project->metadata) ? $project->metadata : [];
        $existingGraph = is_array($existingMeta['code_graph'] ?? null) ? $existingMeta['code_graph'] : [];

        // Merge annotations by ID so switching machines never loses previously synced knowledge
        $annotationsById = [];
        foreach (($existingGraph['annotations'] ?? []) as $ann) {
            if (is_array($ann) && ! empty($ann['id'])) {
                $annotationsById[$ann['id']] = $ann;
            }
        }
        foreach (($payload['annotations'] ?? []) as $ann) {
            if (is_array($ann) && ! empty($ann['id'])) {
                $annotationsById[$ann['id']] = $ann;
            }
        }

        // Merge bug fixes by bug_id / bugId
        $bugFixesById = [];
        foreach (($existingGraph['bug_fixes'] ?? []) as $bf) {
            $key = $bf['bug_id'] ?? $bf['bugId'] ?? null;
            if (is_array($bf) && $key) {
                $bugFixesById[$key] = $bf;
            }
        }
        foreach (($payload['bug_fixes'] ?? []) as $bf) {
            $key = $bf['bug_id'] ?? $bf['bugId'] ?? null;
            if (is_array($bf) && $key) {
                $bugFixesById[$key] = $bf;
            }
        }

        $rawStats = is_array($payload['stats'] ?? null) ? $payload['stats'] : [];
        $mergedAnnotations = array_values($annotationsById);
        $mergedBugFixes = array_values($bugFixesById);

        $stats = [
            'files_indexed' => (int) ($rawStats['files_indexed'] ?? $existingGraph['stats']['files_indexed'] ?? 0),
            'symbols_count' => (int) ($rawStats['entities_count'] ?? $rawStats['symbols_count'] ?? $existingGraph['stats']['symbols_count'] ?? 0),
            'relationships_count' => (int) ($rawStats['relationships_count'] ?? $existingGraph['stats']['relationships_count'] ?? 0),
            'test_links_count' => (int) ($rawStats['test_links_count'] ?? $existingGraph['stats']['test_links_count'] ?? 0),
            'knowledge_annotations_count' => max(
                (int) ($rawStats['knowledge_annotations_count'] ?? 0),
                count($mergedAnnotations)
            ),
            'bug_fixes_count' => max(
                (int) ($rawStats['bug_fixes_count'] ?? 0),
                count($mergedBugFixes)
            ),
        ];

        $revision = (string) ($payload['revision'] ?? $existingGraph['revision'] ?? '');
        $branch = (string) ($payload['branch'] ?? $project->default_branch ?? 'main');
        $machine = (string) ($payload['machine'] ?? 'workstation');
        $syncedAt = now()->toIso8601String();

        $codeGraphSnapshot = [
            'freshness_status' => (string) ($payload['freshness_status'] ?? 'FRESH'),
            'revision' => $revision,
            'branch' => $branch,
            'machine' => $machine,
            'synced_at' => $syncedAt,
            'stats' => $stats,
            'annotations' => array_slice($mergedAnnotations, 0, 200),
            'bug_fixes' => array_slice($mergedBugFixes, 0, 100),
        ];

        $existingMeta['code_graph'] = $codeGraphSnapshot;
        $project->metadata = $existingMeta;
        $project->last_synced_at = now();
        if (! empty($payload['version'])) {
            $project->latest_release_tag = (string) $payload['version'];
            $project->deployed_tag = $project->deployed_tag ?: (string) $payload['version'];
        }
        if ($revision !== '') {
            $project->latest_release_sha = substr($revision, 0, 12);
            $project->deployed_commit = $project->deployed_commit ?: substr($revision, 0, 12);
        }
        $project->save();

        $eventKey = 'code_graph:' . $canonicalSlug . ':' . ($revision !== '' ? substr($revision, 0, 12) : date('YmdHi'));
        EngineeringPipelineEvent::updateOrCreate(
            [
                'engineering_project_id' => $project->id,
                'external_event_id' => $eventKey,
            ],
            [
                'stage' => EngineeringPipelineEvent::STAGE_CODE_GRAPH,
                'status' => EngineeringProject::STATUS_SUCCESS,
                'commit_sha' => $revision !== '' ? substr($revision, 0, 40) : null,
                'ref_name' => $branch,
                'workflow_name' => sprintf(
                    'Zettly Code Graph (%d files · %d symbols · %d edges · %d @zettly-code)',
                    $stats['files_indexed'],
                    $stats['symbols_count'],
                    $stats['relationships_count'],
                    $stats['knowledge_annotations_count']
                ),
                'source_provenance' => 'zettly-code:' . $machine,
                'occurred_at' => now(),
                'metadata' => ['stats' => $stats, 'machine' => $machine],
            ]
        );

        return $project->fresh();
    }
}
