<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class AgentSession extends Model
{
    use HasFactory;

    const STATUS_IN_PROGRESS = 'in_progress';

    const STATUS_COMPLETED = 'completed';

    const STATUS_BLOCKED = 'blocked';

    protected $fillable = [
        'user_id',
        'session_id',
        'project',
        'title',
        'category',
        'status',
        'started_at',
        'last_activity_at',
        'completed_at',
        'duration_seconds',
        'files_changed',
        'errors',
        'outcome',
        'machine',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'completed_at' => 'datetime',
        'duration_seconds' => 'integer',
        'files_changed' => 'array',
        'errors' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(AgentEvent::class);
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function scopeBetween(Builder $query, Carbon $from, Carbon $to): Builder
    {
        return $query->where('started_at', '<=', $to->copy()->endOfDay())
            ->where(function (Builder $query) use ($from) {
                $query->where('last_activity_at', '>=', $from->copy()->startOfDay())
                    ->orWhere('started_at', '>=', $from->copy()->startOfDay());
            });
    }
}
