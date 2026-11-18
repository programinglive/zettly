<?php

namespace App\Domain\Priority;

use App\Models\Focus;
use App\Models\MainWork;
use App\Models\PriorityDecision;
use App\Models\Todo;
use Illuminate\Support\Facades\DB;

/**
 * Owns the single protected work item.
 *
 * One row per user. Replacing it records both the previous and the new value in
 * priority_decisions, so "why did my main work change" is always answerable.
 */
final class MainWorkService
{
    public function __construct(private readonly int $userId) {}

    public function get(): ?MainWork
    {
        $mainWork = MainWork::query()->where('user_id', $this->userId)->first();

        if ($mainWork === null) {
            return null;
        }

        return $this->targetExists($mainWork) ? $mainWork : null;
    }

    public function label(): ?string
    {
        $mainWork = $this->get();

        if ($mainWork === null) {
            return null;
        }

        if ($mainWork->isFocus()) {
            return Focus::query()->whereKey($mainWork->target_id)->value('title');
        }

        return Todo::query()->whereKey($mainWork->target_id)->value('title');
    }

    public function set(string $targetType, int $targetId, string $reason, string $source, int $actorId): MainWork
    {
        if (! in_array($targetType, MainWork::TARGETS, true)) {
            throw new PriorityException('invalid_target', 'Main work must point at a focus or a task.');
        }

        if (mb_strlen(trim($reason)) < 8) {
            throw PriorityException::reasonRequired();
        }

        $this->assertOwnedTarget($targetType, $targetId);

        return DB::transaction(function () use ($targetType, $targetId, $reason, $source, $actorId) {
            $before = $this->snapshot($this->get());

            $mainWork = MainWork::updateOrCreate(
                ['user_id' => $this->userId],
                [
                    'target_type' => $targetType,
                    'target_id' => $targetId,
                    'reason' => $reason,
                    'source' => $source,
                    'assigned_by' => $actorId,
                    'assigned_at' => now(),
                ],
            );

            (new PriorityAudit)->record(
                userId: $this->userId,
                action: PriorityDecision::ACTION_SET_MAIN_WORK,
                source: $source,
                reason: $reason,
                todoId: $targetType === MainWork::TARGET_TODO ? $targetId : null,
                focusId: $targetType === MainWork::TARGET_FOCUS ? $targetId : null,
                before: $before,
                after: $this->snapshot($mainWork),
                actorUserId: $actorId,
            );

            return $mainWork;
        });
    }

    public function clear(string $reason, string $source, int $actorId): bool
    {
        if (mb_strlen(trim($reason)) < 8) {
            throw PriorityException::reasonRequired();
        }

        $current = $this->get();

        if ($current === null) {
            return false;
        }

        return DB::transaction(function () use ($current, $reason, $source, $actorId) {
            $before = $this->snapshot($current);

            $current->delete();

            (new PriorityAudit)->record(
                userId: $this->userId,
                action: PriorityDecision::ACTION_CLEAR_MAIN_WORK,
                source: $source,
                reason: $reason,
                todoId: $before['target_type'] === MainWork::TARGET_TODO ? $before['target_id'] : null,
                focusId: $before['target_type'] === MainWork::TARGET_FOCUS ? $before['target_id'] : null,
                before: $before,
                after: null,
                actorUserId: $actorId,
            );

            return true;
        });
    }

    private function assertOwnedTarget(string $targetType, int $targetId): void
    {
        $exists = $targetType === MainWork::TARGET_FOCUS
            ? Focus::query()->where('user_id', $this->userId)->whereKey($targetId)->exists()
            : Todo::query()->where('user_id', $this->userId)->whereKey($targetId)->exists();

        if (! $exists) {
            throw PriorityException::forbidden('Main work must point at your own focus or task.');
        }
    }

    private function targetExists(MainWork $mainWork): bool
    {
        return $mainWork->isFocus()
            ? Focus::query()->where('user_id', $this->userId)->whereKey($mainWork->target_id)->exists()
            : Todo::query()->where('user_id', $this->userId)->whereKey($mainWork->target_id)->exists();
    }

    /**
     * @return array{target_type: string, target_id: int, reason: ?string}|null
     */
    private function snapshot(?MainWork $mainWork): ?array
    {
        if ($mainWork === null) {
            return null;
        }

        return [
            'target_type' => $mainWork->target_type,
            'target_id' => (int) $mainWork->target_id,
            'reason' => $mainWork->reason,
        ];
    }
}
