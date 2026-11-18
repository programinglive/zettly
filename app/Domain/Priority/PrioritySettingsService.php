<?php

namespace App\Domain\Priority;

use App\Models\PriorityDecision;
use App\Models\UserPrioritySetting;
use Illuminate\Support\Facades\DB;

/**
 * Reads and writes the per-user priority policy.
 *
 * A missing row is not an error: defaults are returned without writing, so
 * enabling the engine is always an explicit act of the owner. Every write is
 * audited with the previous and the new values.
 */
final class PrioritySettingsService
{
    public const EDITABLE = [
        'wip_limit',
        'daily_capacity_minutes',
        'queue_size',
        'require_focus',
        'require_estimate',
        'max_p0',
        'main_work_strict',
        'enabled',
    ];

    public const RANGES = [
        'wip_limit' => [1, 20],
        'daily_capacity_minutes' => [0, 1440],
        'queue_size' => [1, 50],
        'max_p0' => [1, 3],
    ];

    public function __construct(private readonly int $userId) {}

    public function get(): UserPrioritySetting
    {
        return UserPrioritySetting::query()->where('user_id', $this->userId)->first()
            ?? UserPrioritySetting::defaultsFor($this->userId);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(array $attributes, string $source, int $actorId, ?string $reason = null): UserPrioritySetting
    {
        $changes = array_intersect_key($attributes, array_flip(self::EDITABLE));

        if ($changes === []) {
            return $this->get();
        }

        return DB::transaction(function () use ($changes, $source, $actorId, $reason) {
            $current = $this->get();
            $before = $this->snapshot($current);

            $settings = UserPrioritySetting::updateOrCreate(
                ['user_id' => $this->userId],
                $changes,
            );

            (new PriorityAudit)->record(
                userId: $this->userId,
                action: PriorityDecision::ACTION_SETTINGS_CHANGE,
                source: $source,
                reason: $reason,
                before: $before,
                after: $this->snapshot($settings),
                actorUserId: $actorId,
            );

            return $settings->fresh();
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $settings = $this->get();

        return [
            'wip_limit' => (int) $settings->wip_limit,
            'daily_capacity_minutes' => (int) $settings->daily_capacity_minutes,
            'queue_size' => (int) $settings->queue_size,
            'require_focus' => (bool) $settings->require_focus,
            'require_estimate' => (bool) $settings->require_estimate,
            'max_p0' => (int) $settings->max_p0,
            'main_work_strict' => (bool) $settings->main_work_strict,
            'enabled' => (bool) $settings->enabled,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshot(UserPrioritySetting $settings): array
    {
        return [
            'wip_limit' => (int) $settings->wip_limit,
            'daily_capacity_minutes' => (int) $settings->daily_capacity_minutes,
            'queue_size' => (int) $settings->queue_size,
            'require_focus' => (bool) $settings->require_focus,
            'require_estimate' => (bool) $settings->require_estimate,
            'max_p0' => (int) $settings->max_p0,
            'main_work_strict' => (bool) $settings->main_work_strict,
            'enabled' => (bool) $settings->enabled,
        ];
    }
}
