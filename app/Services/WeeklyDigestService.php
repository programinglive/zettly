<?php

namespace App\Services;

use App\Models\JournalEntry;
use App\Models\Todo;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Deterministic, read-only weekly work digest.
 *
 * Every section names its source so the UI can show "Not measured" instead of
 * inventing values. This service never writes and never reuses the legacy
 * ReportGenerator markdown, whose fixed shape has external consumers.
 */
class WeeklyDigestService
{
    public function forUser(User $user, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $startUtc = $start->setTimezone('UTC')->format('Y-m-d H:i:s');
        $endUtc = $end->endOfDay()->setTimezone('UTC')->format('Y-m-d H:i:s');
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();
        $horizon = $end->addDays(7)->toDateString();

        $completed = Todo::where('user_id', $user->id)
            ->where('is_completed', true)
            ->whereBetween('completed_at', [$startUtc, $endUtc])
            ->orderBy('completed_at')
            ->get(['id', 'title', 'completed_at']);

        $blocked = Todo::where('user_id', $user->id)
            ->where('is_completed', false)
            ->where('archived', false)
            ->whereHas('tags', fn ($query) => $query->whereIn('tags.name', ['blocked', 'waiting']))
            ->orderBy('id')
            ->get(['id', 'title']);

        $blockers = JournalEntry::where('user_id', $user->id)
            ->where('kind', JournalEntry::KIND_BLOCKER)
            ->whereBetween('entry_date', [$startDate, $endDate])
            ->orderBy('entry_date')
            ->get(['id', 'content', 'entry_date']);

        $decisions = JournalEntry::where('user_id', $user->id)
            ->where('kind', JournalEntry::KIND_DECISION)
            ->whereBetween('entry_date', [$startDate, $endDate])
            ->orderBy('entry_date')
            ->get(['id', 'content', 'entry_date', 'kind']);

        $notes = Todo::where('user_id', $user->id)
            ->where('type', 'note')
            ->where('archived', false)
            ->where(function ($query) use ($startUtc, $endUtc) {
                $query->whereBetween('created_at', [$startUtc, $endUtc])
                    ->orWhereBetween('updated_at', [$startUtc, $endUtc]);
            })
            ->orderBy('updated_at')
            ->get(['id', 'title', 'updated_at']);

        $dated = Todo::where('user_id', $user->id)
            ->where('type', 'todo')
            ->where('is_completed', false)
            ->where('archived', false)
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$startDate, $horizon])
            ->orderBy('due_date')
            ->orderBy('id')
            ->get(['id', 'title', 'due_date']);

        $handoffs = JournalEntry::where('user_id', $user->id)
            ->where('kind', JournalEntry::KIND_HANDOFF)
            ->whereBetween('entry_date', [$startDate, $endDate])
            ->orderBy('entry_date')
            ->get(['id', 'content', 'entry_date']);

        $undatedCompletions = Todo::where('user_id', $user->id)
            ->where('is_completed', true)
            ->whereNull('completed_at')
            ->where('archived', false)
            ->count();

        $completedItems = $completed->map(fn (Todo $todo) => [
            'id' => $todo->id,
            'title' => $todo->title,
            'date' => $todo->completed_at?->toDateString(),
            'source' => 'todos.completed_at',
        ])->values()->all();

        $blockedItems = $blocked->map(fn (Todo $todo) => [
            'id' => $todo->id,
            'title' => $todo->title,
            'date' => null,
            'source' => 'todos.tag(blocked|waiting)',
        ])->concat($blockers->map(fn (JournalEntry $entry) => [
            'id' => $entry->id,
            'title' => AgentSessionIngestor::redact((string) $entry->content, 200),
            'date' => $entry->entry_date?->toDateString(),
            'source' => 'journal_entries.kind=blocker',
        ]))->values()->all();

        $decisionItems = $decisions->map(fn (JournalEntry $entry) => [
            'id' => $entry->id,
            'title' => AgentSessionIngestor::redact((string) $entry->content, 200),
            'kind' => $entry->kind,
            'date' => $entry->entry_date?->toDateString(),
            'source' => 'journal_entries.kind=decision',
        ])->values()->all();

        $noteItems = $notes->map(fn (Todo $note) => [
            'id' => $note->id,
            'title' => $note->title,
            'date' => $note->updated_at?->toDateString(),
            'source' => 'todos.type=note',
        ])->values()->all();

        $nextItems = $dated->map(fn (Todo $todo) => [
            'id' => $todo->id,
            'title' => $todo->title,
            'date' => $todo->due_date?->toDateString(),
            'source' => 'todos.due_date',
        ])->concat($handoffs->map(fn (JournalEntry $entry) => [
            'id' => $entry->id,
            'title' => AgentSessionIngestor::redact((string) $entry->content, 200),
            'date' => $entry->entry_date?->toDateString(),
            'source' => 'journal_entries.kind=handoff',
        ]))->sortBy(fn (array $item) => [$item['date'] ?? '9999-12-31', $item['id']])->values()->all();

        return [
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
                'timezone' => 'Asia/Jakarta',
            ],
            'sections' => [
                'completed_work' => $this->section(
                    'Completed Work', 'todos.completed_at', $completedItems,
                    'No todos were completed with a recorded completion date in this period.'
                ),
                'blocked_work' => $this->section(
                    'Blocked Work', 'todos.tag(blocked|waiting), journal_entries.kind=blocker', $blockedItems,
                    'No blocked work was recorded in this period.'
                ),
                'important_decisions' => $this->section(
                    'Important Decisions', 'journal_entries.kind=decision', $decisionItems,
                    'No decisions were recorded in this period.'
                ),
                'knowledge_captured' => $this->section(
                    'Knowledge Captured', 'todos.type=note', $noteItems,
                    'No notes were captured in this period.'
                ),
                'next_actions' => $this->section(
                    'Next Actions', 'todos.due_date, journal_entries.kind=handoff', $nextItems,
                    'No sourced next actions in this period.'
                ),
            ],
            'metrics' => [
                'tasks_completed' => [
                    'value' => $completed->count(),
                    'provenance' => 'todos.completed_at',
                ],
                // No valid source is read for these values in P0: never render 0 or "Unavailable".
                'agent_active_minutes' => [
                    'value' => 'Not measured',
                    'provenance' => 'agent_sessions.duration_seconds',
                ],
                'machines' => [
                    'value' => 'Not measured',
                    'provenance' => 'agent_sessions.machine',
                ],
                'projects' => [
                    'value' => 'Not measured',
                    'provenance' => 'agent_sessions.project',
                ],
            ],
            'data_quality' => [
                'undated_completions' => $undatedCompletions,
            ],
        ];
    }

    private function section(string $label, string $provenance, array $items, string $message): array
    {
        return [
            'label' => $label,
            'provenance' => $provenance,
            'status' => $items === [] ? 'no_data' : 'ok',
            'items' => $items,
            'message' => $items === [] ? $message : null,
        ];
    }
}
