<?php

namespace App\Domain\Priority;

use App\Models\DailyPlan;
use App\Models\Todo;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;

/**
 * Assembles the one queue every client renders.
 *
 * Two rules keep this honest and small:
 *   - `today` is what the owner committed, never a guess.
 *   - `next` is the ranked remainder, capped by `queue_size`, and it never
 *     carries descriptions or related-item graphs, so the payload stays small
 *     enough for the MCP client's response limit.
 */
final class PriorityQueueBuilder
{
    public const TITLE_LIMIT = 140;

    public function __construct(
        private readonly int $userId,
        private readonly UserPrioritySetting $settings,
        private readonly CarbonImmutable $today,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(?int $limit = null): array
    {
        $context = PriorityContextFactory::forUser($this->userId, $this->settings, $this->today);

        $todos = Todo::query()
            ->where('user_id', $this->userId)
            ->where('type', Todo::TYPE_TODO)
            ->where('is_completed', false)
            ->where('archived', false)
            ->with(['focus:id,title', 'tags:id,name,color'])
            ->get();

        $ready = [];
        $triage = ['inbox' => 0, 'needs_focus' => 0, 'needs_estimate' => 0, 'blocked' => 0, 'p0' => 0];
        $triageIds = [];

        foreach ($todos as $todo) {
            $gate = ReadinessGate::evaluate($todo, $context);

            if ($gate['ready']) {
                $ready[] = $todo;

                continue;
            }

            $triageIds[] = (int) $todo->id;
            foreach ($gate['reasons'] as $reason) {
                $key = str_starts_with($reason, 'blocked_by:') ? 'blocked' : $reason;
                $triage[$key] = ($triage[$key] ?? 0) + 1;
            }
        }

        $ranked = PriorityEngine::rank($ready, $context);
        $plan = $this->plan();
        $committedOrder = $plan === null ? [] : $plan->items()
            ->whereIn('state', [DailyPlan::ITEM_PLANNED, DailyPlan::ITEM_DONE])
            ->orderBy('position')
            ->pluck('todo_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $byId = [];
        foreach ($ranked as $item) {
            $byId[(int) $item->todo->id] = $item;
        }

        $todayItems = [];
        foreach ($committedOrder as $todoId) {
            if (isset($byId[$todoId])) {
                $todayItems[] = $this->present($byId[$todoId], true);
            }
        }

        $queueSize = $limit !== null ? max(1, min(50, $limit)) : $this->settings->queue_size;
        $nextItems = [];
        foreach ($ranked as $item) {
            if (in_array((int) $item->todo->id, $committedOrder, true)) {
                continue;
            }

            $nextItems[] = $this->present($item, false);

            if (count($nextItems) >= $queueSize) {
                break;
            }
        }

        $remainingSlots = max(0, $this->settings->wip_limit - count($todayItems));
        $proposal = array_slice(array_column($nextItems, 'id'), 0, $remainingSlots);

        $minutesPlanned = 0;
        foreach ($todayItems as $item) {
            $minutesPlanned += (int) ($item['estimate_minutes'] ?? 0);
        }

        return [
            'date' => $this->today->toDateString(),
            'day_allocation' => $context->dayAllocation,
            'settings' => [
                'wip_limit' => $this->settings->wip_limit,
                'daily_capacity_minutes' => $this->settings->daily_capacity_minutes,
                'queue_size' => $this->settings->queue_size,
                'require_focus' => $this->settings->require_focus,
                'require_estimate' => $this->settings->require_estimate,
                'main_work_strict' => $this->settings->main_work_strict,
            ],
            'capacity' => [
                'wip_limit' => $this->settings->wip_limit,
                'committed' => count($todayItems),
                'minutes_planned' => $minutesPlanned,
                'minutes_capacity' => $this->settings->daily_capacity_minutes,
            ],
            'main_work' => $this->mainWorkPayload($context),
            'today' => $todayItems,
            'next' => $nextItems,
            'proposal' => $proposal,
            'triage' => $triage + ['total' => count($triageIds)],
            'warnings' => $this->warnings($ranked, $committedOrder, $todayItems, $nextItems, $minutesPlanned),
            'counts' => [
                'open' => $todos->count(),
                'offerable' => count($ready),
                'excluded' => count($triageIds),
            ],
        ];
    }

    private function plan(): ?DailyPlan
    {
        return DailyPlan::query()
            ->where('user_id', $this->userId)
            ->whereDate('plan_date', $this->today->toDateString())
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function present(RankedTodo $item, bool $committed): array
    {
        $todo = $item->todo;
        $daysLeft = $todo->due_date === null
            ? null
            : (int) $this->today->startOfDay()->diffInDays(CarbonImmutable::instance($todo->due_date)->startOfDay(), false);

        return [
            'id' => (int) $todo->id,
            'title' => mb_strimwidth((string) $todo->title, 0, self::TITLE_LIMIT, '…'),
            'focus_id' => $todo->focus_id === null ? null : (int) $todo->focus_id,
            'focus_title' => $todo->focus?->title,
            'due_date' => $todo->due_date?->toDateString(),
            'days_left' => $daysLeft,
            'quadrant' => $this->quadrant($todo),
            'importance' => $todo->importance,
            'priority' => $todo->priority,
            'estimate_minutes' => $todo->estimate_minutes,
            'queue_state' => $todo->queue_state,
            'is_p0' => $item->isP0,
            'is_main_work' => $item->isMainWork,
            'matches_day_theme' => $item->matchesDayTheme,
            'blocked_by' => $item->blockedBy,
            'reasons' => $item->reasons,
            'key' => $item->key(),
            'committed' => $committed,
        ];
    }

    private function quadrant(Todo $todo): ?string
    {
        if ($todo->importance === null || $todo->priority === null) {
            return null;
        }

        $important = $todo->importance === Todo::IMPORTANCE_IMPORTANT;
        $urgent = $todo->priority === Todo::PRIORITY_URGENT;

        return match (true) {
            $important && $urgent => 'q1',
            $important && ! $urgent => 'q2',
            ! $important && $urgent => 'q3',
            default => 'q4',
        };
    }

    /**
     * @return array{target_type: ?string, target_id: ?int, label: ?string}|null
     */
    private function mainWorkPayload(PriorityContext $context): ?array
    {
        if ($context->mainWork === null) {
            return null;
        }

        return [
            'target_type' => $context->mainWork->target_type,
            'target_id' => (int) $context->mainWork->target_id,
            'label' => $context->mainWorkLabel(),
        ];
    }

    /**
     * Warnings never reorder anything; they make the cost of the chosen order
     * visible.
     *
     * @param  array<int, RankedTodo>  $ranked
     * @param  array<int, int>  $committedOrder
     * @param  array<int, array<string, mixed>>  $todayItems
     * @param  array<int, array<string, mixed>>  $nextItems
     * @return array<int, array<string, mixed>>
     */
    private function warnings(array $ranked, array $committedOrder, array $todayItems, array $nextItems, int $minutesPlanned): array
    {
        $warnings = [];

        $mainWorkIndex = null;
        foreach ($ranked as $index => $item) {
            if ($item->isMainWork) {
                $mainWorkIndex = $index;
                break;
            }
        }

        foreach ($ranked as $index => $item) {
            $daysLeft = $item->todo->due_date === null
                ? null
                : (int) $this->today->startOfDay()->diffInDays(CarbonImmutable::instance($item->todo->due_date)->startOfDay(), false);

            if ($daysLeft === null || $daysLeft > 3) {
                continue;
            }

            if (in_array((int) $item->todo->id, $committedOrder, true)) {
                continue;
            }

            if ($mainWorkIndex !== null && $index > $mainWorkIndex) {
                $warnings[] = [
                    'code' => 'deadline_at_risk',
                    'todo_id' => (int) $item->todo->id,
                    'title' => mb_strimwidth((string) $item->todo->title, 0, 80, '…'),
                    'due_date' => $item->todo->due_date?->toDateString(),
                    'days_left' => $daysLeft,
                    'displaced_by' => 'main_work',
                ];
            }
        }

        if (count($todayItems) >= $this->settings->wip_limit) {
            foreach ($nextItems as $item) {
                if ($item['days_left'] !== null && $item['days_left'] <= 3) {
                    $warnings[] = [
                        'code' => 'deadline_uncommitted',
                        'todo_id' => $item['id'],
                        'title' => $item['title'],
                        'due_date' => $item['due_date'],
                        'days_left' => $item['days_left'],
                    ];
                }
            }
        }

        if ($this->settings->daily_capacity_minutes > 0 && $minutesPlanned > $this->settings->daily_capacity_minutes) {
            $warnings[] = [
                'code' => 'capacity_exceeded',
                'minutes_planned' => $minutesPlanned,
                'minutes_capacity' => $this->settings->daily_capacity_minutes,
            ];
        }

        foreach ($ranked as $item) {
            if (! $item->isMainWork || $item->todo->due_date === null) {
                continue;
            }

            $daysLeft = (int) $this->today->startOfDay()->diffInDays(CarbonImmutable::instance($item->todo->due_date)->startOfDay(), false);
            if ($daysLeft < 0) {
                $warnings[] = [
                    'code' => 'main_work_overdue',
                    'todo_id' => (int) $item->todo->id,
                    'title' => mb_strimwidth((string) $item->todo->title, 0, 80, '…'),
                    'due_date' => $item->todo->due_date?->toDateString(),
                    'days_left' => $daysLeft,
                ];
            }

            break;
        }

        return $warnings;
    }
}
