<?php

namespace App\Http\Controllers;

use App\Domain\Priority\PriorityQueueBuilder;
use App\Domain\Priority\PrioritySettingsService;
use App\Models\Todo;
use App\Services\AgentSessionIngestor;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * @zettly-code ZC-ZETTLY-DASH-001
 * @purpose Serve the priority-first Today dashboard payload with consistent user-scoped counters and measurable Focus progress
 * @domain dashboard
 * @invariant Active Focus counts in metrics and Current Work must share the same scope, empty Focuses must return null progress (never 100%), and serialized todo payload growth must stay under 500 bytes
 * @bug-fix BUG-ZETTLY-DASH-195
 * @root-cause Hardcoded limit(5) on activeFoci caused 6-vs-5 UI mismatch and uncompacted null keys exceeded the 500-byte DashboardPayloadTest growth ceiling
 * @fix Raised bounded activeFoci view to 10 with authoritative total_active counter and stripped null keys from openTaskItems via array_filter
 * @related PriorityQueueBuilder, Focus, Todo
 * @tests DashboardPayloadTest, DashboardPriorityOverhaulTest
 */
class DashboardController extends Controller
{
    public static function resolvePriorityTier(?bool $isP0, ?string $priority, ?string $importance): string
    {
        if ($isP0) {
            return 'P0';
        }
        if ($priority === null || $importance === null) {
            return 'UNPRIORITIZED';
        }
        if ($priority === Todo::PRIORITY_URGENT && $importance === Todo::IMPORTANCE_IMPORTANT) {
            return 'P1';
        }
        if ($importance === Todo::IMPORTANCE_IMPORTANT || $priority === Todo::PRIORITY_URGENT) {
            return 'P2';
        }

        return 'P3';
    }

    public function __invoke(Request $request)
    {
        $user = $request->user();
        $todayDate = CarbonImmutable::now()->startOfDay();

        $selectedTagIds = collect($request->input('tags', []))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $tasksQuery = $user->todos()->notArchived()->tasks();

        if (! empty($selectedTagIds)) {
            $tasksQuery->whereHas('tags', function ($query) use ($selectedTagIds) {
                $query->whereIn('tags.id', $selectedTagIds);
            });
        }

        $availableTags = $user->tags()
            ->orderBy('name')
            ->get(['id', 'name', 'color']);

        $notes = $user->todos()
            ->notArchived()
            ->notes()
            ->with('tags')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        $totalActiveFoci = $user->activeFoci()->count();
        $activeFoci = $user->activeFoci()
            ->withCount([
                'todos as open_tasks_count' => fn ($q) => $q->notArchived()->where('is_completed', false),
                'todos as completed_tasks_count' => fn ($q) => $q->notArchived()->where('is_completed', true),
                'todos as p0_tasks_count' => fn ($q) => $q->notArchived()->where('is_completed', false)->where('is_p0', true),
                'todos as high_tasks_count' => fn ($q) => $q->notArchived()->where('is_completed', false)->where('priority', Todo::PRIORITY_URGENT)->where('importance', Todo::IMPORTANCE_IMPORTANT),
            ])
            ->orderByDesc('started_at')
            ->limit(10)
            ->get(['id', 'title', 'status', 'started_at']);

        $focusTitlesById = $activeFoci->pluck('title', 'id');

        $prioritySettings = (new PrioritySettingsService((int) $user->id))->get();

        if ($prioritySettings->enabled) {
            $priorityQueue = (new PriorityQueueBuilder(
                (int) $user->id,
                $prioritySettings,
                $todayDate,
            ))->build(5);

            $mainWork = $priorityQueue['main_work'];
            $prioritizedItems = collect(array_merge($priorityQueue['today'] ?? [], $priorityQueue['next'] ?? []));
            if (! empty($selectedTagIds)) {
                $matchingIds = (clone $tasksQuery)->where('is_completed', false)->pluck('id')->all();
                $prioritizedItems = $prioritizedItems->filter(fn ($item) => in_array((int) $item['id'], $matchingIds, true))->values();
            }
            $prioritizedItems = $prioritizedItems->take(5);
            $prioritizedIds = $prioritizedItems->pluck('id')->all();
        } else {
            $mainWork = null;
            $prioritizedItems = collect();
            $prioritizedIds = [];
        }

        $remainingSlots = max(0, 5 - $prioritizedItems->count());
        $fallbackItems = $remainingSlots > 0
            ? (clone $tasksQuery)
                ->where('is_completed', false)
                ->when(! empty($prioritizedIds), fn ($q) => $q->whereNotIn('id', $prioritizedIds))
                ->orderByDesc('created_at')
                ->limit($remainingSlots)
                ->get(['id', 'title', 'due_date', 'priority', 'importance', 'is_p0', 'focus_id'])
                ->map(fn ($todo) => array_filter([
                    'id' => $todo->id,
                    'title' => $todo->title,
                    'due_date' => $todo->due_date?->toDateString(),
                    'priority' => $todo->priority,
                    'importance' => $todo->importance,
                    'priority_tier' => self::resolvePriorityTier((bool) $todo->is_p0, $todo->priority, $todo->importance),
                    'focus_title' => $todo->focus_id ? ($focusTitlesById[$todo->focus_id] ?? null) : null,
                ], fn ($v) => $v !== null))
            : collect();

        $openTaskItems = $prioritizedItems->map(fn ($item) => array_filter([
            'id' => $item['id'],
            'title' => $item['title'],
            'due_date' => $item['due_date'] ?? null,
            'priority' => $item['priority'] ?? null,
            'importance' => $item['importance'] ?? null,
            'priority_tier' => self::resolvePriorityTier(
                (bool) ($item['is_p0'] ?? false),
                $item['priority'] ?? null,
                $item['importance'] ?? null
            ),
            'focus_title' => isset($item['focus_id']) ? ($focusTitlesById[$item['focus_id']] ?? null) : null,
        ], fn ($v) => $v !== null))->concat($fallbackItems)->values();

        $openOverallCount = (clone $tasksQuery)->where('is_completed', false)->count();
        $completedCount = (clone $tasksQuery)->where('is_completed', true)->count();
        $openTodayCount = (clone $tasksQuery)
            ->where('is_completed', false)
            ->where(function ($q) use ($todayDate) {
                $q->where('queue_state', Todo::QUEUE_COMMITTED)
                    ->orWhereDate('due_date', '<=', $todayDate->toDateString());
            })
            ->count();
        $overdueCount = (clone $tasksQuery)
            ->where('is_completed', false)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $todayDate->toDateString())
            ->count();
        $unprioritizedCount = (clone $tasksQuery)
            ->where('is_completed', false)
            ->where(function ($q) {
                $q->whereNull('priority')->orWhereNull('importance');
            })
            ->count();
        $p0Count = (clone $tasksQuery)
            ->where('is_completed', false)
            ->where('is_p0', true)
            ->count();

        $recentJournal = $user->journalEntries()
            ->orderByDesc('entry_date')
            ->limit(5)
            ->get(['id', 'kind', 'entry_date', 'content']);

        $focusItems = $activeFoci->map(function ($focus) {
            $openCount = (int) ($focus->open_tasks_count ?? 0);
            $completedTasks = (int) ($focus->completed_tasks_count ?? 0);
            $totalTasks = $openCount + $completedTasks;
            // Never report 100% progress when no tasks exist.
            $progressPercent = $totalTasks > 0 ? (int) round(($completedTasks / $totalTasks) * 100) : null;
            $workState = $openCount > 0
                ? 'active_with_tasks'
                : ($completedTasks > 0 ? 'needs_next_action' : 'planning');
            $priorityTier = ((int) ($focus->p0_tasks_count ?? 0)) > 0
                ? 'P0'
                : (((int) ($focus->high_tasks_count ?? 0)) > 0 ? 'P1' : ($openCount > 0 ? 'P2' : 'P3'));

            return [
                'id' => $focus->id,
                'title' => $focus->title,
                'status' => $focus->status,
                'open_tasks_count' => $openCount,
                'completed_tasks_count' => $completedTasks,
                'total_tasks_count' => $totalTasks,
                'progress_percent' => $progressPercent,
                'work_state' => $workState,
                'priority_tier' => $priorityTier,
            ];
        })->values()->all();

        $emptyOpenTasksMessage = $totalActiveFoci > 0
            ? 'Your active Focuses need actionable tasks. Create or select the next step.'
            : 'No open tasks are recorded in this workspace.';

        $today = [
            'metrics' => [
                'open_today' => $openTodayCount,
                'open_overall' => $openOverallCount,
                'completed' => $completedCount,
                'active_focuses' => $totalActiveFoci,
                'overdue' => $overdueCount,
                'unprioritized' => $unprioritizedCount,
                'p0_critical' => $p0Count,
            ],
            'current_work' => [
                'status' => ($activeFoci->isNotEmpty() || $mainWork !== null) ? 'ok' : 'no_data',
                'main_work' => $mainWork,
                'total_active' => $totalActiveFoci,
                'items' => $focusItems,
                'message' => ($activeFoci->isNotEmpty() || $mainWork !== null)
                    ? null
                    : 'No active focus is recorded. Open Tasks to start one.',
            ],
            'open_tasks' => [
                'status' => $openTaskItems->isNotEmpty() ? 'ok' : 'no_data',
                'items' => $openTaskItems->all(),
                'total_open' => $openOverallCount,
                'message' => $openTaskItems->isNotEmpty()
                    ? null
                    : $emptyOpenTasksMessage,
            ],
            'recent_activity' => [
                'status' => $recentJournal->isNotEmpty() ? 'ok' : 'no_data',
                'items' => $recentJournal->map(fn ($entry) => [
                    'id' => $entry->id,
                    'kind' => $entry->kind,
                    'entry_date' => $entry->entry_date?->toDateString(),
                    'excerpt' => AgentSessionIngestor::redact((string) $entry->content, 200),
                ])->values()->all(),
                'message' => $recentJournal->isNotEmpty()
                    ? null
                    : 'No journal entries have been recorded yet.',
            ],
            'linked_notes' => [
                'status' => $notes->isNotEmpty() ? 'ok' : 'no_data',
                'items' => $notes->take(5)->map(fn ($note) => [
                    'id' => $note->id,
                    'title' => $note->title,
                    'updated_at' => $note->updated_at?->toDateTimeString(),
                ])->values()->all(),
                'message' => $notes->isNotEmpty()
                    ? null
                    : 'No notes are linked to this workspace yet.',
            ],
        ];

        return Inertia::render('Dashboard', [
            'tasks' => [
                'open' => $openOverallCount,
                'completed' => $completedCount,
            ],
            'filters' => [
                'tags' => $selectedTagIds,
            ],
            'availableTags' => $availableTags,
            'notes' => $notes,
            'preferences' => [
                'workspace_view' => $user->workspace_view ?? null,
            ],
            'today' => $today,
        ]);
    }
}
