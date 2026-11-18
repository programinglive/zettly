<?php

namespace App\Http\Controllers;

use App\Domain\Priority\PriorityQueueBuilder;
use App\Domain\Priority\PrioritySettingsService;
use App\Models\Todo;
use App\Services\AgentSessionIngestor;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();

        $selectedTagIds = collect($request->input('tags', []))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        // The page component destructures `todos` and never reads it: the todo list
        // lives on /todos and /todos/board. Sending it meant loading every
        // non-archived task with tags, both link directions and attachments, then
        // serializing all of it - about 570 bytes per todo that no screen rendered.
        // Keep the counts, which are what a dashboard actually needs.
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

        $activeFoci = $user->activeFoci()
            ->orderByDesc('started_at')
            ->limit(5)
            ->get(['id', 'title', 'status']);

        $prioritySettings = (new PrioritySettingsService((int) $user->id))->get();

        if ($prioritySettings->enabled) {
            $priorityQueue = (new PriorityQueueBuilder(
                (int) $user->id,
                $prioritySettings,
                CarbonImmutable::now()->startOfDay(),
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
                ->get(['id', 'title', 'due_date', 'priority', 'importance'])
                ->map(fn ($todo) => [
                    'id' => $todo->id,
                    'title' => $todo->title,
                    'due_date' => $todo->due_date?->toDateString(),
                    'priority' => $todo->priority,
                    'importance' => $todo->importance,
                ])
            : collect();

        $openTaskItems = $prioritizedItems->map(fn ($item) => [
            'id' => $item['id'],
            'title' => $item['title'],
            'due_date' => $item['due_date'] ?? null,
            'priority' => $item['priority'] ?? null,
            'importance' => $item['importance'] ?? null,
        ])->concat($fallbackItems)->values();

        $recentJournal = $user->journalEntries()
            ->orderByDesc('entry_date')
            ->limit(5)
            ->get(['id', 'kind', 'entry_date', 'content']);

        $today = [
            'current_work' => [
                'status' => ($activeFoci->isNotEmpty() || $mainWork !== null) ? 'ok' : 'no_data',
                'main_work' => $mainWork,
                'items' => $activeFoci->map(fn ($focus) => [
                    'id' => $focus->id,
                    'title' => $focus->title,
                    'status' => $focus->status,
                ])->values()->all(),
                'message' => ($activeFoci->isNotEmpty() || $mainWork !== null)
                    ? null
                    : 'No active focus is recorded. Open Tasks to start one.',
            ],
            'open_tasks' => [
                'status' => $openTaskItems->isNotEmpty() ? 'ok' : 'no_data',
                'items' => $openTaskItems->all(),
                'total_open' => (clone $tasksQuery)->where('is_completed', false)->count(),
                'message' => $openTaskItems->isNotEmpty()
                    ? null
                    : 'No open tasks are recorded in this workspace.',
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
                'open' => (clone $tasksQuery)->where('is_completed', false)->count(),
                'completed' => (clone $tasksQuery)->where('is_completed', true)->count(),
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
