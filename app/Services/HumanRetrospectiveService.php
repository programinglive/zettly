<?php

namespace App\Services;

use App\Models\Todo;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class HumanRetrospectiveService
{
    private const TIMEZONE = 'Asia/Jakarta';

    private const EXTERNAL_WAITING_PATTERN = '/\b(support|waiting|external|vendor|ticket|blocked|pending|approval|follow[\s-]?up|npm support)\b|#[0-9]{4,}/i';

    /**
     * Build the bounded list of scheduled or external-waiting open tasks that
     * belong on Calendar and must stay visible on Today so hanging items are never missed.
     */
    public function buildExternalSchedule(User $user, ?CarbonImmutable $referenceDate = null, int $limit = 3): array
    {
        $today = ($referenceDate ?? CarbonImmutable::now(self::TIMEZONE))->setTimezone(self::TIMEZONE)->startOfDay();

        $candidates = $user->todos()
            ->notArchived()
            ->tasks()
            ->where('is_completed', false)
            ->get(['id', 'title', 'description', 'due_date', 'priority', 'importance', 'is_p0']);

        $items = $candidates
            ->map(function (Todo $todo) use ($today) {
                $isExternal = self::isExternalWaiting($todo->title, $todo->description);
                $due = $todo->due_date ? CarbonImmutable::parse($todo->due_date->toDateString(), self::TIMEZONE)->startOfDay() : null;
                $daysDiff = $due !== null ? (int) $today->diffInDays($due, false) : null;
                $isOverdue = $daysDiff !== null && $daysDiff < 0;
                $isDueToday = $daysDiff === 0;
                $isHighPriority = (bool) $todo->is_p0
                    || ($todo->priority === Todo::PRIORITY_URGENT && $todo->importance === Todo::IMPORTANCE_IMPORTANT);

                if (! $isExternal && ! ($isHighPriority && ($isOverdue || $isDueToday))) {
                    return null;
                }

                $dueString = $due?->toDateString();

                return [
                    'id' => (int) $todo->id,
                    'title' => self::cleanTitle($todo->title),
                    'due_date' => $dueString,
                    'is_external_waiting' => $isExternal,
                    'is_overdue' => $isOverdue,
                    '_rank' => [
                        $isOverdue ? 0 : ($isDueToday ? 1 : ($isExternal ? 2 : 3)),
                        $dueString ?? '9999-12-31',
                        (int) $todo->id,
                    ],
                ];
            })
            ->filter()
            ->sortBy('_rank')
            ->values();

        $totalMatching = $items->count();
        $bounded = $items
            ->take($limit)
            ->map(function (array $item) {
                unset($item['_rank']);

                return array_filter($item, fn ($value) => $value !== null && $value !== false);
            })
            ->values()
            ->all();

        return [
            'status' => count($bounded) > 0 ? 'ok' : 'no_data',
            'total' => $totalMatching,
            'items' => $bounded,
        ];
    }

    /**
     * Build a human-readable retrospective for daily, weekly, or monthly periods.
     */
    public function buildRetrospective(User $user, string $period = 'daily', ?CarbonImmutable $referenceDate = null): array
    {
        $period = in_array($period, ['daily', 'weekly', 'monthly'], true) ? $period : 'daily';
        $now = ($referenceDate ?? CarbonImmutable::now(self::TIMEZONE))->setTimezone(self::TIMEZONE);

        [$start, $end, $label, $rangeLabel] = match ($period) {
            'weekly' => [
                $now->startOfWeek()->startOfDay(),
                $now->endOfWeek()->endOfDay(),
                'This Week',
                $now->startOfWeek()->format('M j').' – '.$now->endOfWeek()->format('M j, Y'),
            ],
            'monthly' => [
                $now->startOfMonth()->startOfDay(),
                $now->endOfMonth()->endOfDay(),
                'This Month',
                $now->format('F Y'),
            ],
            default => [
                $now->startOfDay(),
                $now->endOfDay(),
                'Today',
                $now->format('M j, Y'),
            ],
        };

        $startUtc = $start->setTimezone('UTC');
        $endUtc = $end->setTimezone('UTC');

        $completedTasks = $user->todos()
            ->notArchived()
            ->tasks()
            ->where('is_completed', true)
            ->whereBetween('completed_at', [$startUtc, $endUtc])
            ->orderByDesc('completed_at')
            ->get(['id', 'title', 'completed_at', 'focus_id']);

        $completedFocuses = $user->foci()
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$startUtc, $endUtc])
            ->orderByDesc('completed_at')
            ->get(['id', 'title', 'completed_at']);

        $openTasksCount = $user->todos()
            ->notArchived()
            ->tasks()
            ->where('is_completed', false)
            ->count();

        $overdueCount = $user->todos()
            ->notArchived()
            ->tasks()
            ->where('is_completed', false)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $now->toDateString())
            ->count();

        $unprioritizedCount = $user->todos()
            ->notArchived()
            ->tasks()
            ->where('is_completed', false)
            ->where(function ($q) {
                $q->whereNull('priority')->orWhereNull('importance');
            })
            ->count();

        $staleCompletedFocuses = $user->activeFoci()
            ->withCount([
                'todos as open_tasks_count' => fn ($q) => $q->notArchived()->where('is_completed', false),
                'todos as completed_tasks_count' => fn ($q) => $q->notArchived()->where('is_completed', true),
            ])
            ->get(['id', 'title'])
            ->filter(fn ($focus) => (int) $focus->open_tasks_count === 0 && (int) $focus->completed_tasks_count > 0)
            ->values();

        $externalSchedule = $this->buildExternalSchedule($user, $now, 3);
        $externalWaitingItems = collect($externalSchedule['items'])
            ->filter(fn ($item) => ! empty($item['is_external_waiting']))
            ->values();

        $completedCount = $completedTasks->count();
        $completedFocusCount = $completedFocuses->count();

        $doneHighlights = $completedTasks
            ->take($period === 'daily' ? 3 : 5)
            ->map(fn (Todo $todo) => [
                'id' => (int) $todo->id,
                'title' => self::cleanTitle($todo->title),
            ])
            ->values()
            ->all();

        $summary = $this->composeSummary(
            $period,
            $completedCount,
            $completedFocusCount,
            $openTasksCount,
            $overdueCount,
            $externalWaitingItems->count()
        );

        $wentWell = $this->composeWentWell(
            $period,
            $completedCount,
            $completedFocuses,
            $overdueCount,
            $openTasksCount
        );

        $blockers = $this->composeBlockers(
            $overdueCount,
            $externalWaitingItems,
            $staleCompletedFocuses
        );

        $improvements = $this->composeImprovements(
            $unprioritizedCount,
            $staleCompletedFocuses->count(),
            $overdueCount,
            $externalWaitingItems->count(),
            $completedCount,
            $openTasksCount
        );

        return [
            'period' => $period,
            'label' => $label,
            'range_label' => $rangeLabel,
            'summary' => $summary,
            'completed_count' => $completedCount,
            'completed_focus_count' => $completedFocusCount,
            'done_highlights' => $doneHighlights,
            'went_well' => $wentWell,
            'blockers' => $blockers,
            'improvements' => $improvements,
        ];
    }

    /**
     * Build all three primary retrospective horizons (daily, weekly, monthly).
     */
    public function buildAllPeriods(User $user, ?CarbonImmutable $referenceDate = null): array
    {
        return [
            'daily' => $this->buildRetrospective($user, 'daily', $referenceDate),
            'weekly' => $this->buildRetrospective($user, 'weekly', $referenceDate),
            'monthly' => $this->buildRetrospective($user, 'monthly', $referenceDate),
        ];
    }

    public static function isExternalWaiting(?string $title, ?string $description = null): bool
    {
        $haystack = trim((string) $title.' '.(string) $description);
        if ($haystack === '') {
            return false;
        }

        return preg_match(self::EXTERNAL_WAITING_PATTERN, $haystack) === 1;
    }

    public static function cleanTitle(?string $title): string
    {
        $clean = trim((string) $title);
        $clean = preg_replace('/^\[Dev Workflow[^\]]*\]\s*/i', '', $clean) ?? $clean;

        return trim($clean);
    }

    private function composeSummary(
        string $period,
        int $completedCount,
        int $completedFocusCount,
        int $openTasksCount,
        int $overdueCount,
        int $externalWaitingCount
    ): string {
        $timeframe = match ($period) {
            'weekly' => 'This week',
            'monthly' => 'This month',
            default => 'Today',
        };

        $parts = [];

        if ($completedCount > 0 && $completedFocusCount > 0) {
            $parts[] = sprintf(
                '%s you completed %d %s and closed %d %s.',
                $timeframe,
                $completedCount,
                $completedCount === 1 ? 'task' : 'tasks',
                $completedFocusCount,
                $completedFocusCount === 1 ? 'focus' : 'focuses'
            );
        } elseif ($completedCount > 0) {
            $parts[] = sprintf(
                '%s you completed %d %s.',
                $timeframe,
                $completedCount,
                $completedCount === 1 ? 'task' : 'tasks'
            );
        } elseif ($openTasksCount > 0) {
            $parts[] = sprintf(
                '%s has no completed tasks yet, with %d open %s waiting in your queue.',
                $timeframe,
                $openTasksCount,
                $openTasksCount === 1 ? 'task' : 'tasks'
            );
        } else {
            $parts[] = sprintf('%s is completely clear with no open tasks remaining.', $timeframe);
        }

        if ($overdueCount > 0) {
            $parts[] = sprintf(
                '%d %s past due and needs immediate attention.',
                $overdueCount,
                $overdueCount === 1 ? 'item is' : 'items are'
            );
        } elseif ($externalWaitingCount > 0) {
            $parts[] = sprintf(
                '%d external %s tracked on your calendar so it does not slip.',
                $externalWaitingCount,
                $externalWaitingCount === 1 ? 'follow-up is' : 'follow-ups are'
            );
        }

        return implode(' ', $parts);
    }

    private function composeWentWell(
        string $period,
        int $completedCount,
        Collection $completedFocuses,
        int $overdueCount,
        int $openTasksCount
    ): array {
        $items = [];
        $timeframe = match ($period) {
            'weekly' => 'this week',
            'monthly' => 'this month',
            default => 'today',
        };

        if ($completedCount >= 3) {
            $items[] = "Strong execution momentum: {$completedCount} tasks wrapped up {$timeframe}.";
        } elseif ($completedCount > 0) {
            $word = $completedCount === 1 ? 'task' : 'tasks';
            $items[] = "Steady progress: {$completedCount} {$word} completed {$timeframe}.";
        }

        if ($completedFocuses->isNotEmpty()) {
            $count = $completedFocuses->count();
            $first = self::cleanTitle($completedFocuses->first()->title);
            $items[] = $count === 1
                ? "Finished and closed focus \"{$first}\" cleanly."
                : "Closed {$count} focuses completely, including \"{$first}\".";
        }

        if ($overdueCount === 0) {
            $items[] = 'Zero overdue tasks — your commitments are on schedule.';
        }

        if ($openTasksCount <= 3 && $openTasksCount > 0) {
            $items[] = "Focused queue: only {$openTasksCount} open " . ($openTasksCount === 1 ? 'task' : 'tasks') . ' in flight.';
        }

        if (empty($items)) {
            $items[] = 'Clean slate ready to pick your highest-leverage priority next.';
        }

        return array_slice($items, 0, 3);
    }

    private function composeBlockers(
        int $overdueCount,
        Collection $externalWaitingItems,
        Collection $staleCompletedFocuses
    ): array {
        $items = [];

        if ($overdueCount > 0) {
            $word = $overdueCount === 1 ? 'task is' : 'tasks are';
            $items[] = "{$overdueCount} {$word} overdue and holding up your schedule.";
        }

        foreach ($externalWaitingItems->take(2) as $waiting) {
            $dueNote = ! empty($waiting['due_date']) ? " (follow up by {$waiting['due_date']})" : '';
            $items[] = "Waiting on external dependency: {$waiting['title']}{$dueNote}.";
        }

        if ($staleCompletedFocuses->isNotEmpty()) {
            $count = $staleCompletedFocuses->count();
            $items[] = $count === 1
                ? "1 active focus (\"{$staleCompletedFocuses->first()->title}\") has 0 open tasks left and still needs closure."
                : "{$count} active focuses have 0 open tasks left and are still sitting open on Today.";
        }

        return array_slice($items, 0, 3);
    }

    private function composeImprovements(
        int $unprioritizedCount,
        int $staleFocusCount,
        int $overdueCount,
        int $externalWaitingCount,
        int $completedCount,
        int $openTasksCount
    ): array {
        $items = [];

        if ($staleFocusCount > 0) {
            $items[] = 'Close completed focuses as soon as their last task finishes so Current Work reflects only active streams.';
        }

        if ($overdueCount > 0) {
            $items[] = 'Reschedule or resolve overdue items on Calendar before taking on new work.';
        }

        if ($unprioritizedCount > 0) {
            $word = $unprioritizedCount === 1 ? 'task' : 'tasks';
            $items[] = "Assign priority (P1–P3) to {$unprioritizedCount} unprioritized {$word} so Today ranks what matters most.";
        }

        if ($externalWaitingCount > 0) {
            $items[] = 'Keep external waiting issues pinned to a Calendar follow-up date so stalled threads get chased on time.';
        }

        if (empty($items)) {
            if ($completedCount > 0 && $openTasksCount === 0) {
                $items[] = 'Queue is clear — take a moment to plan tomorrow’s top 1–3 priorities before signing off.';
            } else {
                $items[] = 'Protect deep-work blocks for your top P1 item before expanding scope.';
            }
        }

        return array_slice($items, 0, 3);
    }
}
