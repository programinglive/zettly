<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The one work item a user protects from being displaced.
 *
 * One row per user (unique index). History is in priority_decisions, never here.
 */
class MainWork extends Model
{
    use HasFactory;

    public const TARGET_FOCUS = 'focus';

    public const TARGET_TODO = 'todo';

    public const TARGETS = [self::TARGET_FOCUS, self::TARGET_TODO];

    protected $table = 'main_work';

    protected $fillable = [
        'user_id',
        'target_type',
        'target_id',
        'reason',
        'source',
        'assigned_by',
        'assigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function focus(): BelongsTo
    {
        return $this->belongsTo(Focus::class, 'target_id');
    }

    public function todo(): BelongsTo
    {
        return $this->belongsTo(Todo::class, 'target_id');
    }

    public function isFocus(): bool
    {
        return $this->target_type === self::TARGET_FOCUS;
    }

    public function isTodo(): bool
    {
        return $this->target_type === self::TARGET_TODO;
    }
}
