<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One user's committed work for one day.
 *
 * The limit and capacity are snapshotted so an old day still explains itself
 * after the settings change.
 */
class DailyPlan extends Model
{
    use HasFactory;

    public const ITEM_PLANNED = 'planned';

    public const ITEM_DONE = 'done';

    public const ITEM_DROPPED = 'dropped';

    protected $fillable = [
        'user_id',
        'plan_date',
        'wip_limit_snapshot',
        'capacity_minutes_snapshot',
        'closed_at',
    ];

    protected $casts = [
        'plan_date' => 'date',
        'wip_limit_snapshot' => 'integer',
        'capacity_minutes_snapshot' => 'integer',
        'closed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DailyPlanItem::class)->orderBy('position');
    }

    public function activeItems(): HasMany
    {
        return $this->items()->whereIn('state', [self::ITEM_PLANNED, self::ITEM_DONE]);
    }
}
