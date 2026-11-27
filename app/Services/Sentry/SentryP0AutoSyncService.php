<?php

namespace App\Services\Sentry;

use App\Domain\Priority\DayPlanner;
use App\Domain\Priority\P0Service;
use App\Domain\Priority\PriorityException;
use App\Domain\Priority\PrioritySettingsService;
use App\Models\Focus;
use App\Models\Tag;
use App\Models\Todo;
use App\Services\EngineeringIntelligence\EngineeringIntelligenceService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;

/**
 * @zettly-code ZC-ZETTLY-SENTRY-P0-001
 *
 * @purpose Automatically poll unresolved Sentry issues for erp.beautyworld.co.id (project:erp) and promote them to live P0 Todos committed to Today (#1 Priority) in Zettly.
 *
 * @invariant Never create duplicate open Todos for the same Sentry issue ID or shortId; always declare P0 and commit to Today so ERP production issues outrank all other work.
 */
class SentryP0AutoSyncService
{
    public const ERP_FOCUS_TITLE = 'Beautyworld ERP Daily Sentry Zero (P0 Auto-Preemption)';

    public function __construct(
        private readonly EngineeringIntelligenceService $intelligence,
    ) {}

    /**
     * Poll Sentry for unresolved issues on the target project (default: 'erp')
     * and ensure each issue has an open P0 Todo committed to Today.
     *
     * @return array{
     *   ok: bool,
     *   status: string,
     *   user_id: ?int,
     *   project: string,
     *   issues_found: int,
     *   created_count: int,
     *   promoted_todos: array<int, array<string, mixed>>,
     * }
     */
    public function syncErpIssues(?int $requestedUserId = null, string $projectSlug = 'erp'): array
    {
        $defaultUserId = $requestedUserId ?: (int) config('coding_agent.owner_user_id', 1);
        $userId = $this->intelligence->resolveTargetUserId($defaultUserId);
        if ($userId === null) {
            return [
                'ok' => false,
                'status' => 'no_user',
                'user_id' => null,
                'project' => $projectSlug,
                'issues_found' => 0,
                'created_count' => 0,
                'promoted_todos' => [],
            ];
        }

        $token = trim((string) config('services.sentry.token', ''));
        $org = trim((string) config('services.sentry.org', 'programinglive'));
        $host = rtrim(trim((string) config('services.sentry.host', 'https://sentry.io')), '/');
        if (! str_starts_with($host, 'http://') && ! str_starts_with($host, 'https://')) {
            $host = 'https://'.$host;
        }

        if ($token === '' || $org === '') {
            return [
                'ok' => false,
                'status' => 'sentry_not_configured',
                'user_id' => $userId,
                'project' => $projectSlug,
                'issues_found' => 0,
                'created_count' => 0,
                'promoted_todos' => [],
            ];
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])
            ->timeout(8)
            ->get("{$host}/api/0/organizations/{$org}/issues/", [
                'query' => "is:unresolved project:{$projectSlug}",
                'limit' => 20,
                'statsPeriod' => '90d',
                'sort' => 'date',
            ]);

        if (! $response->successful() || ! is_array($response->json())) {
            return [
                'ok' => false,
                'status' => 'sentry_http_'.$response->status(),
                'user_id' => $userId,
                'project' => $projectSlug,
                'issues_found' => 0,
                'created_count' => 0,
                'promoted_todos' => [],
            ];
        }

        $issues = array_values(array_filter(
            $response->json(),
            fn ($item) => is_array($item)
                && ! empty($item['id'])
                && (! isset($item['project']['slug']) || $item['project']['slug'] === $projectSlug)
        ));

        if ($issues === []) {
            return [
                'ok' => true,
                'status' => 'zero_unresolved',
                'user_id' => $userId,
                'project' => $projectSlug,
                'issues_found' => 0,
                'created_count' => 0,
                'promoted_todos' => [],
            ];
        }

        $focus = $this->ensureActiveErpFocus($userId);
        $tagIds = $this->ensureErpSentryTags($userId);
        $settings = (new PrioritySettingsService($userId))->get();
        $p0Service = new P0Service($userId, $settings);
        $today = CarbonImmutable::now('Asia/Jakarta')->startOfDay();
        $planner = new DayPlanner($userId, $settings, $today);
        $monitorClaims = $this->fetchActiveMonitorClaims();

        $createdCount = 0;
        $promoted = [];

        foreach ($issues as $issue) {
            $issueId = (string) $issue['id'];
            $shortId = trim((string) ($issue['shortId'] ?? $issueId));
            $title = trim((string) ($issue['title'] ?? 'Unresolved Sentry exception'));
            $permalink = trim((string) ($issue['permalink'] ?? "https://{$org}.sentry.io/issues/{$issueId}/"));
            $count = (string) ($issue['count'] ?? '1');
            $culprit = trim((string) ($issue['culprit'] ?? ''));

            $existing = $this->findExistingOpenTodo($userId, $issueId, $shortId);
            $wasCreated = false;

            if ($existing === null) {
                if ($this->hasRecentlyCompletedTodo($userId, $issueId, $shortId) || $this->isClaimedOnMonitor($issueId, $shortId, $monitorClaims)) {
                    continue;
                }

                $todoTitle = mb_substr("[P0 · {$shortId}] Fix erp.beautyworld.co.id: {$title}", 0, 250);
                $todoDescription = implode("\n", array_filter([
                    'Auto-ingested P0 production issue from Sentry for erp.beautyworld.co.id (#1 Top Priority).',
                    "Sentry Issue ID: {$issueId}",
                    "Sentry Short ID: {$shortId}",
                    "Events: {$count}",
                    $culprit !== '' ? "Culprit: {$culprit}" : null,
                    "Sentry Permalink: {$permalink}",
                    "DevWorkflow start_task source: { \"system\": \"sentry\", \"id\": \"{$issueId}\" }",
                ]));

                $existing = Todo::create([
                    'user_id' => $userId,
                    'focus_id' => $focus->id,
                    'type' => Todo::TYPE_TODO,
                    'title' => $todoTitle,
                    'description' => $todoDescription,
                    'importance' => Todo::IMPORTANCE_IMPORTANT,
                    'priority' => Todo::PRIORITY_URGENT,
                    'queue_state' => Todo::QUEUE_BACKLOG,
                    'estimate_minutes' => 30,
                    'triaged_at' => now(),
                    'is_completed' => false,
                ]);
                $wasCreated = true;
                $createdCount++;
            } elseif ($existing->focus_id === null) {
                $existing->forceFill(['focus_id' => $focus->id])->save();
            }

            if ($tagIds !== []) {
                $existing->tags()->syncWithoutDetaching($tagIds);
            }

            $p0Reason = "Active Sentry issue {$shortId} ({$issueId}) on erp.beautyworld.co.id — #1 Top Priority";
            if (! $existing->isP0Live($today)) {
                try {
                    $existing = $p0Service->declare(
                        $existing,
                        $p0Reason,
                        CarbonImmutable::now()->addHours(P0Service::DEFAULT_EXPIRY_HOURS),
                        'cli',
                        $userId
                    );
                } catch (PriorityException) {
                    // If max_p0 cap is already saturated by other live P0 ERP issues, still commit to Today as Q1
                }
            }

            try {
                $planner->commit($existing, $p0Reason, true, 'cli');
                $existing = $existing->fresh();
            } catch (PriorityException) {
                // Keep Todo active even if DayPlanner reports a constraint
            }

            $promoted[] = [
                'todo_id' => $existing->id,
                'focus_id' => $existing->focus_id,
                'sentry_issue_id' => $issueId,
                'short_id' => $shortId,
                'title' => $existing->title,
                'is_p0' => (bool) $existing->is_p0,
                'queue_state' => $existing->queue_state,
                'created' => $wasCreated,
            ];
        }

        return [
            'ok' => true,
            'status' => 'synced',
            'user_id' => $userId,
            'project' => $projectSlug,
            'issues_found' => count($issues),
            'created_count' => $createdCount,
            'promoted_todos' => $promoted,
        ];
    }

    private function findExistingOpenTodo(int $userId, string $issueId, string $shortId): ?Todo
    {
        return Todo::query()
            ->where('user_id', $userId)
            ->where('type', Todo::TYPE_TODO)
            ->where('is_completed', false)
            ->where(function ($query) use ($issueId, $shortId) {
                $query->where('description', 'like', "%{$issueId}%")
                    ->orWhere('title', 'like', "%{$shortId}%")
                    ->orWhere('description', 'like', "%{$shortId}%");
            })
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Check if an AI session already completed a Todo for this Sentry issue within the last 3 hours
     * (e.g., fix committed and awaiting release tag deployment before Sentry issue status flips to resolved).
     */
    private function hasRecentlyCompletedTodo(int $userId, string $issueId, string $shortId): bool
    {
        $cutoff = now()->subHours(3);

        return Todo::query()
            ->where('user_id', $userId)
            ->where('type', Todo::TYPE_TODO)
            ->where('is_completed', true)
            ->where(function ($q) use ($cutoff) {
                $q->where('completed_at', '>=', $cutoff)
                    ->orWhere('updated_at', '>=', $cutoff);
            })
            ->where(function ($query) use ($issueId, $shortId) {
                $query->where('description', 'like', "%{$issueId}%")
                    ->orWhere('title', 'like', "%{$shortId}%")
                    ->orWhere('description', 'like', "%{$shortId}%");
            })
            ->exists();
    }

    /**
     * Query the optional DevWorkflow Monitor (`/api/sessions`) for active live AI sessions
     * and extract their claimed Sentry issue IDs and shortIds.
     *
     * @return array{issue_ids: array<string, bool>, short_ids: array<string, bool>}
     */
    private function fetchActiveMonitorClaims(): array
    {
        $claims = ['issue_ids' => [], 'short_ids' => []];
        $monitorUrl = rtrim(trim((string) config('services.devworkflow_monitor.url', '')), '/');
        if ($monitorUrl === '') {
            return $claims;
        }

        try {
            $headers = ['Accept' => 'application/json'];
            $token = trim((string) config('services.devworkflow_monitor.token', ''));
            if ($token !== '') {
                $headers['Authorization'] = 'Bearer '.$token;
            }

            $response = Http::withHeaders($headers)
                ->timeout(2)
                ->get("{$monitorUrl}/api/sessions", ['limit' => 50]);

            if (! $response->successful() || ! is_array($response->json('sessions'))) {
                return $claims;
            }

            $inactivePhases = ['idle', 'closed', 'done', 'cancelled', 'archived', 'handed-off'];
            foreach ($response->json('sessions') as $session) {
                if (! is_array($session)) {
                    continue;
                }
                $phase = strtolower(trim((string) ($session['phase'] ?? 'idle')));
                $state = strtolower(trim((string) ($session['state'] ?? 'live')));
                if (in_array($phase, $inactivePhases, true) || $state === 'ended') {
                    continue;
                }

                $origin = $session['task_origin_json'] ?? $session['taskOrigin'] ?? null;
                if (is_array($origin) && ($origin['system'] ?? '') === 'sentry') {
                    $id = trim((string) ($origin['id'] ?? ''));
                    $label = strtoupper(trim((string) ($origin['label'] ?? '')));
                    if ($id !== '') {
                        $claims['issue_ids'][$id] = true;
                    }
                    if ($label !== '' && $label !== $id) {
                        $claims['short_ids'][$label] = true;
                    }
                }

                $relations = $session['task_relations_json'] ?? $session['taskRelations'] ?? [];
                if (is_array($relations)) {
                    foreach ($relations as $rel) {
                        if (is_array($rel) && ($rel['system'] ?? '') === 'sentry') {
                            $id = trim((string) ($rel['id'] ?? ''));
                            $label = strtoupper(trim((string) ($rel['label'] ?? '')));
                            if ($id !== '') {
                                $claims['issue_ids'][$id] = true;
                            }
                            if ($label !== '' && $label !== $id) {
                                $claims['short_ids'][$label] = true;
                            }
                        }
                    }
                }

                $taskText = strtoupper((string) ($session['task'] ?? ''));
                if ($taskText !== '' && preg_match_all('/\b([A-Z][A-Z0-9_-]{1,24}-[0-9A-Z]{1,8})\b/', $taskText, $matches)) {
                    foreach ($matches[1] as $tokenMatch) {
                        $claims['short_ids'][$tokenMatch] = true;
                    }
                }
            }
        } catch (\Throwable) {
            // Best-effort monitor query; never block Sentry sync if monitor is offline
        }

        return $claims;
    }

    /**
     * @param  array{issue_ids: array<string, bool>, short_ids: array<string, bool>}  $monitorClaims
     */
    private function isClaimedOnMonitor(string $issueId, string $shortId, array $monitorClaims): bool
    {
        if ($issueId !== '' && isset($monitorClaims['issue_ids'][$issueId])) {
            return true;
        }
        $upperShort = strtoupper(trim($shortId));

        return $upperShort !== '' && isset($monitorClaims['short_ids'][$upperShort]);
    }

    private function ensureActiveErpFocus(int $userId): Focus
    {
        $existing = Focus::query()
            ->where('user_id', $userId)
            ->where('status', Focus::STATUS_ACTIVE)
            ->whereNull('completed_at')
            ->where(function ($query) {
                $query->where('title', self::ERP_FOCUS_TITLE)
                    ->orWhere('title', 'like', '%Beautyworld ERP%Sentry%');
            })
            ->orderByDesc('id')
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        return Focus::create([
            'user_id' => $userId,
            'title' => self::ERP_FOCUS_TITLE,
            'description' => 'Automatic P0 container for active Sentry issues on erp.beautyworld.co.id (#1 top priority ahead of all other projects).',
            'status' => Focus::STATUS_ACTIVE,
            'color' => '#EF4444',
            'started_at' => now(),
        ]);
    }

    /**
     * @return array<int, int>
     */
    private function ensureErpSentryTags(int $userId): array
    {
        $names = ['proyek:erp', 'tipe:bugfix', 'area:sentry', 'sumber:sentry'];
        $ids = [];

        foreach ($names as $name) {
            $tag = Tag::withTrashed()
                ->where('user_id', $userId)
                ->where('name', $name)
                ->first();

            if ($tag === null) {
                $tag = Tag::create([
                    'user_id' => $userId,
                    'name' => $name,
                    'color' => '#EF4444',
                ]);
            } elseif ($tag->trashed()) {
                $tag->restore();
            }

            $ids[] = (int) $tag->id;
        }

        return $ids;
    }
}
