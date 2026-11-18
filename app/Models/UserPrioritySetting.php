<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per-user policy for the priority engine.
 *
 * A missing row means the engine is off for that user. Reading defaults never
 * writes: the row is created the first time the owner changes a setting or
 * enables the engine.
 */
class UserPrioritySetting extends Model
{
    use HasFactory;

    public const DEFAULT_WIP_LIMIT = 3;

    public const DEFAULT_CAPACITY_MINUTES = 240;

    public const DEFAULT_QUEUE_SIZE = 8;

    public const DEFAULT_MAX_P0 = 2;

    protected $fillable = [
        'user_id',
        'wip_limit',
        'daily_capacity_minutes',
        'queue_size',
        'require_focus',
        'require_estimate',
        'max_p0',
        'main_work_strict',
        'enabled',
    ];

    protected $casts = [
        'wip_limit' => 'integer',
        'daily_capacity_minutes' => 'integer',
        'queue_size' => 'integer',
        'require_focus' => 'boolean',
        'require_estimate' => 'boolean',
        'max_p0' => 'integer',
        'main_work_strict' => 'boolean',
        'enabled' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function defaultsFor(int $userId): self
    {
        return new self([
            'user_id' => $userId,
            'wip_limit' => self::DEFAULT_WIP_LIMIT,
            'daily_capacity_minutes' => self::DEFAULT_CAPACITY_MINUTES,
            'queue_size' => self::DEFAULT_QUEUE_SIZE,
            'require_focus' => true,
            'require_estimate' => false,
            'max_p0' => self::DEFAULT_MAX_P0,
            'main_work_strict' => true,
            'enabled' => false,
        ]);
    }
}
