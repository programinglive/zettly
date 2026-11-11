<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Focus extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_PAUSED = 'paused';

    public const STATUS_COMPLETED = 'completed';

    /**
     * Every state a focus may hold. `status` is the current state used by
     * queries; `completed_at` stays the audit fact of when work finished.
     *
     * @var list<string>
     */
    public const STATUSES = [self::STATUS_ACTIVE, self::STATUS_PAUSED, self::STATUS_COMPLETED];

    public const DEFAULT_COLOR = '#6366F1';

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'status',
        'color',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function statusEvents(): HasMany
    {
        return $this->hasMany(FocusStatusEvent::class)->latest('id');
    }

    /**
     * A note is a Todo with type note, so both relations read the same table.
     */
    public function todos(): HasMany
    {
        return $this->hasMany(Todo::class)->where('type', Todo::TYPE_TODO);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Todo::class)->where('type', Todo::TYPE_NOTE);
    }

    public function drawings(): HasMany
    {
        return $this->hasMany(Drawing::class);
    }

    public function journalEntries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }

    /**
     * Active means running now: a paused focus keeps its row open but is not
     * active. This single rule is used by the model, the controller and the API.
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE && $this->completed_at === null;
    }

    public function isPaused(): bool
    {
        return $this->status === self::STATUS_PAUSED && $this->completed_at === null;
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED || $this->completed_at !== null;
    }
}
