<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One todo inside one day's plan.
 */
class DailyPlanItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'daily_plan_id',
        'todo_id',
        'position',
        'state',
        'reason',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(DailyPlan::class, 'daily_plan_id');
    }

    public function todo(): BelongsTo
    {
        return $this->belongsTo(Todo::class);
    }
}
