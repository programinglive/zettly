<?php

namespace App\Domain\Priority;

use App\Models\PriorityDecision;
use App\Models\Todo;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Production-critical declarations.
 *
 * The cap and the expiry are the safety rails that stop P0 from becoming a
 * second urgency flag: at most `max_p0` live declarations per user, each lasting
 * at most 72 hours, every change audited with its reason.
 */
final class P0Service
{
    public const DEFAULT_EXPIRY_HOURS = 24;

    public const MAX_EXPIRY_HOURS = 72;

    public function __construct(
        private readonly int $userId,
        private readonly UserPrioritySetting $settings,
    ) {}

    public function liveCount(): int
    {
        return Todo::query()
            ->where('user_id', $this->userId)
            ->where('is_p0', true)
            ->where(function ($query) {
                $query->whereNull('p0_expires_at')
                    ->orWhere('p0_expires_at', '>', now());
            })
            ->count();
    }

    public function declare(Todo $todo, string $reason, ?CarbonImmutable $expiresAt, string $source, int $actorId): Todo
    {
        if ((int) $todo->user_id !== $this->userId) {
            throw PriorityException::forbidden('You may only declare P0 on your own tasks.');
        }

        if (mb_strlen(trim($reason)) < 8) {
            throw PriorityException::reasonRequired();
        }

        $expires = $expiresAt ?? CarbonImmutable::now()->addHours(self::DEFAULT_EXPIRY_HOURS);

        if ($expires->lessThanOrEqualTo(CarbonImmutable::now())) {
            throw new PriorityException('p0_expiry_invalid', 'A P0 expiry must be in the future.');
        }

        $hours = (int) ceil(CarbonImmutable::now()->diffInMinutes($expires, false) / 60);
        if ($hours > self::MAX_EXPIRY_HOURS) {
            throw PriorityException::p0ExpiryTooLong($hours, self::MAX_EXPIRY_HOURS);
        }

        $alreadyLive = $todo->isP0Live();
        if (! $alreadyLive && $this->liveCount() >= $this->settings->max_p0) {
            throw PriorityException::p0LimitReached($this->settings->max_p0);
        }

        return DB::transaction(function () use ($todo, $reason, $expires, $source, $actorId) {
            $before = [
                'is_p0' => (bool) $todo->is_p0,
                'p0_reason' => $todo->p0_reason,
                'p0_expires_at' => optional($todo->p0_expires_at)->toIso8601String(),
            ];

            $todo->forceFill([
                'is_p0' => true,
                'p0_reason' => $reason,
                'p0_since' => $todo->p0_since ?? now(),
                'p0_expires_at' => $expires,
                'p0_by' => $actorId,
            ])->save();

            (new PriorityAudit)->record(
                userId: $this->userId,
                action: PriorityDecision::ACTION_P0_SET,
                source: $source,
                reason: $reason,
                todoId: $todo->id,
                before: $before,
                after: [
                    'is_p0' => true,
                    'p0_expires_at' => $expires->toIso8601String(),
                ],
                actorUserId: $actorId,
            );

            return $todo->fresh();
        });
    }

    public function clear(Todo $todo, string $reason, string $source, int $actorId): Todo
    {
        if ((int) $todo->user_id !== $this->userId) {
            throw PriorityException::forbidden('You may only clear P0 on your own tasks.');
        }

        if (mb_strlen(trim($reason)) < 8) {
            throw PriorityException::reasonRequired();
        }

        return DB::transaction(function () use ($todo, $reason, $source, $actorId) {
            $before = [
                'is_p0' => (bool) $todo->is_p0,
                'p0_reason' => $todo->p0_reason,
                'p0_expires_at' => optional($todo->p0_expires_at)->toIso8601String(),
            ];

            $todo->forceFill([
                'is_p0' => false,
                'p0_reason' => null,
                'p0_since' => null,
                'p0_expires_at' => null,
                'p0_by' => null,
            ])->save();

            (new PriorityAudit)->record(
                userId: $this->userId,
                action: PriorityDecision::ACTION_P0_CLEAR,
                source: $source,
                reason: $reason,
                todoId: $todo->id,
                before: $before,
                after: ['is_p0' => false],
                actorUserId: $actorId,
            );

            return $todo->fresh();
        });
    }
}
