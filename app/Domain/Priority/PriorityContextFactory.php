<?php

namespace App\Domain\Priority;

use App\Models\DailyPlan;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;

/**
 * Builds a PriorityContext once per request.
 *
 * Keeping this in one place is what lets the engine stay pure and lets the API,
 * CLI and UI share identical inputs.
 */
final class PriorityContextFactory
{
    public function __construct(private readonly int $userId) {}

    public static function forUser(int $userId, UserPrioritySetting $settings, CarbonImmutable $today): PriorityContext
    {
        return (new self($userId))->build($settings, $today);
    }

    public function build(UserPrioritySetting $settings, CarbonImmutable $today): PriorityContext
    {
        $graph = new DependencyGraph($this->userId);
        $mainWorkService = new MainWorkService($this->userId);

        return new PriorityContext(
            today: $today,
            settings: $settings,
            mainWork: $mainWorkService->get(),
            mainWorkLabel: $mainWorkService->label(),
            blockedIds: $graph->blockedIds(),
            unblockCounts: $graph->unblockCounts(),
            committedIds: $this->committedIds($today),
        );
    }

    /**
     * @return array<int, int>
     */
    private function committedIds(CarbonImmutable $today): array
    {
        $plan = DailyPlan::query()
            ->where('user_id', $this->userId)
            ->where('plan_date', $today->toDateString())
            ->first();

        if ($plan === null) {
            return [];
        }

        return $plan->items()
            ->whereIn('state', [DailyPlan::ITEM_PLANNED, DailyPlan::ITEM_DONE])
            ->pluck('todo_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
}
