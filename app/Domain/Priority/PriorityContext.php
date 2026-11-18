<?php

namespace App\Domain\Priority;

use App\Models\MainWork;
use App\Models\Todo;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;

/**
 * Everything the ranking needs, gathered once per request.
 *
 * Passing the state in keeps PriorityEngine pure: the same todo list and the same
 * context always produce the same order, with no hidden database reads.
 */
final class PriorityContext
{
    /**
     * @param  array<int, array<int, int>>  $blockedIds  todo id => open blocking ids
     * @param  array<int, int>  $unblockCounts  todo id => open tasks waiting on it
     * @param  array<int, int>  $committedIds  todo ids already in today's plan
     */
    public function __construct(
        public readonly CarbonImmutable $today,
        public readonly UserPrioritySetting $settings,
        public readonly ?MainWork $mainWork = null,
        public readonly ?string $mainWorkLabel = null,
        public readonly array $blockedIds = [],
        public readonly array $unblockCounts = [],
        public readonly array $committedIds = [],
    ) {}

    public function hasMainWork(): bool
    {
        return $this->mainWork !== null;
    }

    public function isMainWork(Todo $todo): bool
    {
        if ($this->mainWork === null) {
            return false;
        }

        if ($this->mainWork->target_type === MainWork::TARGET_TODO) {
            return (int) $this->mainWork->target_id === (int) $todo->id;
        }

        if ($this->mainWork->target_type === MainWork::TARGET_FOCUS) {
            return $todo->focus_id !== null && (int) $todo->focus_id === (int) $this->mainWork->target_id;
        }

        return false;
    }

    /**
     * @return array<int, int>
     */
    public function blockingIdsFor(Todo $todo): array
    {
        return $this->blockedIds[(int) $todo->id] ?? [];
    }

    public function unblockCountFor(Todo $todo): int
    {
        return (int) ($this->unblockCounts[(int) $todo->id] ?? 0);
    }

    public function isCommitted(Todo $todo): bool
    {
        return in_array((int) $todo->id, $this->committedIds, true);
    }

    public function mainWorkLabel(): ?string
    {
        return $this->mainWorkLabel;
    }
}
