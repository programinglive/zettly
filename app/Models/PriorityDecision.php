<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The audit trail for a priority-changing action.
 *
 * `before` and `after` hold the minimal JSON that explains the change, not whole
 * models, so the table stays readable and cheap to query.
 */
class PriorityDecision extends Model
{
    use HasFactory;

    public const ACTION_RANK = 'rank';

    public const ACTION_COMMIT = 'commit';

    public const ACTION_UNCOMMIT = 'uncommit';

    public const ACTION_OVERRIDE = 'override';

    public const ACTION_SET_MAIN_WORK = 'set_main_work';

    public const ACTION_CLEAR_MAIN_WORK = 'clear_main_work';

    public const ACTION_STATE_MOVE = 'state_move';

    public const ACTION_DEPENDENCY_ADD = 'dependency_add';

    public const ACTION_DEPENDENCY_REMOVE = 'dependency_remove';

    public const ACTION_SETTINGS_CHANGE = 'settings_change';

    public const ACTION_P0_SET = 'p0_set';

    public const ACTION_P0_CLEAR = 'p0_clear';

    public const ACTION_WEEKLY_FOCUS = 'weekly_focus_allocation';

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'todo_id',
        'focus_id',
        'action',
        'source',
        'actor_user_id',
        'actor_token_id',
        'reason',
        'before',
        'after',
    ];

    protected $casts = [
        'before' => 'array',
        'after' => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function todo(): BelongsTo
    {
        return $this->belongsTo(Todo::class);
    }
}
