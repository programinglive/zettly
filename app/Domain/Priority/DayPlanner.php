<?php

namespace App\Domain\Priority;

use App\Models\DailyPlan;
use App\Models\DailyPlanItem;
use App\Models\Todo;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Turns the ranked list into a bounded day.
 *
 * The WIP limit and the minute capacity are enforced here, on the server, so no
 * client can commit a fourth task by asking politely. A live P0 is the single
 * exception: production is already broken.
 */
final class DayPlanner
{
    public const RULE_WIP = 'wip';

    public const RULE_CAPACITY = 'capacity';

    public function __construct(
        private readonly int $userId,
        private readonly UserPrioritySetting $settings,
        private readonly CarbonImmutable $today,
    ) {}

    public function ensurePlan(): DailyPlan
    {
        $plan = DailyPlan::query()
            ->where('user_id', $this->userId)
            ->whereDate('plan_date', $this->today->toDateString())
            ->first();

        if ($plan !== null) {
            return $plan;
        }

        return DailyPlan::create([
            'user_id' => $this->userId,
            'plan_date' => $this->today->toDateString(),
            'wip_limit_snapshot' => $this->settings->wip_limit,
            'capacity_minutes_snapshot' => $this->settings->daily_capacity_minutes,
        ]);
    }

    /**
     * @return Collection<int, DailyPlanItem>
     */
    public function todayItems(): Collection
    {
        return $this->ensurePlan()
            ->items()
            ->whereIn('state', [DailyPlan::ITEM_PLANNED, DailyPlan::ITEM_DONE])
            ->get();
    }

    public function commit(Todo $todo, string $reason, bool $allowOverCapacity, string $source): DailyPlanItem
    {
        $this->assertReason($reason);

        $plan = $this->ensurePlan();

        $existing = $plan->items()->where('todo_id', $todo->id)->first();
        if ($existing !== null && $existing->state !== DailyPlan::ITEM_DROPPED) {
            return $existing;
        }

        $context = PriorityContextFactory::forUser($this->userId, $this->settings, $this->today);
        $todo->loadMissing('tags:id,name,color');
        $blocking = $context->blockingIdsFor($todo);
        if ($blocking !== []) {
            throw PriorityException::blocked($blocking);
        }

        $liveP0 = $todo->isP0Live($this->today);
        $active = $this->todayItems();
        $override = false;

        if (! $liveP0 && $active->count() >= $this->settings->wip_limit) {
            if (! $allowOverCapacity) {
                throw PriorityException::wipLimitReached($this->settings->wip_limit);
            }

            $override = true;
        }

        $capacity = $this->settings->daily_capacity_minutes;
        if (! $liveP0 && $capacity > 0) {
            $requested = (int) $active->sum(fn (DailyPlanItem $item) => (int) ($item->todo?->estimate_minutes ?? 0))
                + (int) ($todo->estimate_minutes ?? 0);

            if ($requested > $capacity && ! $allowOverCapacity) {
                throw PriorityException::capacityExceeded($capacity, $requested);
            }

            if ($requested > $capacity) {
                $override = true;
            }
        }

        $matchesDayTheme = $context->matchesDayTheme($todo);
        $dayAllocationTheme = $context->dayAllocation['theme'] ?? null;

        return DB::transaction(function () use ($plan, $todo, $reason, $source, $override, $existing, $matchesDayTheme, $dayAllocationTheme) {
            $item = $existing ?? $plan->items()->create([
                'todo_id' => $todo->id,
                'position' => (int) $plan->items()->max('position') + 1,
                'state' => DailyPlan::ITEM_PLANNED,
                'reason' => $reason,
            ]);

            if ($existing !== null) {
                $item->forceFill(['state' => DailyPlan::ITEM_PLANNED, 'reason' => $reason])->save();
            }

            $todo->forceFill(['queue_state' => Todo::QUEUE_COMMITTED])->save();

            (new PriorityAudit)->record(
                userId: $this->userId,
                action: $override ? \App\Models\PriorityDecision::ACTION_OVERRIDE : \App\Models\PriorityDecision::ACTION_COMMIT,
                source: $source,
                reason: $reason,
                todoId: $todo->id,
                after: [
                    'plan_id' => $plan->id,
                    'plan_date' => $plan->plan_date?->toDateString(),
                    'state' => $item->state,
                    'override' => $override,
                    'live_p0' => $todo->isP0Live($this->today),
                    'day_allocation_theme' => $dayAllocationTheme,
                    'matches_day_theme' => $matchesDayTheme,
                ],
            );

            return $item;
        });
    }

    public function uncommit(Todo $todo, string $reason, string $source): bool
    {
        $this->assertReason($reason);

        $plan = $this->ensurePlan();
        $item = $plan->items()->where('todo_id', $todo->id)->first();

        if ($item === null || $item->state === DailyPlan::ITEM_DROPPED) {
            return false;
        }

        return DB::transaction(function () use ($item, $todo, $reason, $source) {
            $item->forceFill([
                'state' => DailyPlan::ITEM_DROPPED,
                'reason' => $reason,
            ])->save();

            $todo->forceFill(['queue_state' => Todo::QUEUE_BACKLOG])->save();

            (new PriorityAudit)->record(
                userId: $this->userId,
                action: \App\Models\PriorityDecision::ACTION_UNCOMMIT,
                source: $source,
                reason: $reason,
                todoId: $todo->id,
                before: ['state' => DailyPlan::ITEM_PLANNED],
                after: ['state' => DailyPlan::ITEM_DROPPED],
            );

            return true;
        });
    }

    private function assertReason(string $reason): void
    {
        if (mb_strlen(trim($reason)) < 8) {
            throw PriorityException::reasonRequired();
        }
    }
}
