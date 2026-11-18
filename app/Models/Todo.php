<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;

class Todo extends Model
{
    use HasFactory, SoftDeletes;

    protected static ?bool $kanbanOrderColumnExists = null;

    const TYPE_TODO = 'todo';

    const TYPE_NOTE = 'note';

    const PRIORITY_NOT_URGENT = 'not_urgent';

    const PRIORITY_URGENT = 'urgent';

    const IMPORTANCE_NOT_IMPORTANT = 'not_important';

    const IMPORTANCE_IMPORTANT = 'important';

    const QUEUE_INBOX = 'inbox';

    const QUEUE_BACKLOG = 'backlog';

    const QUEUE_COMMITTED = 'committed';

    const QUEUE_STATES = [self::QUEUE_INBOX, self::QUEUE_BACKLOG, self::QUEUE_COMMITTED];

    protected $fillable = [
        'user_id',
        'organization_id',
        'focus_id',
        'type',
        'title',
        'description',
        'priority',
        'importance',
        'is_completed',
        'completed_at',
        'due_date',
        'kanban_order',
        'archived',
        'archived_at',
        'queue_state',
        'estimate_minutes',
        'triaged_at',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
        'due_date' => 'date',
        'kanban_order' => 'integer',
        'archived' => 'boolean',
        'archived_at' => 'datetime',
        'estimate_minutes' => 'integer',
        'triaged_at' => 'datetime',
        'is_p0' => 'boolean',
        'p0_since' => 'datetime',
        'p0_expires_at' => 'datetime',
    ];

    protected $appends = [
        'priority_color',
    ];

    protected static function booted(): void
    {
        static::creating(function (Todo $todo) {
            if ($todo->type !== self::TYPE_TODO) {
                return;
            }

            if ($todo->archived || $todo->kanban_order !== null || ! $todo->user_id) {
                return;
            }

            if (! self::hasKanbanOrderColumn()) {
                return;
            }

            $query = static::query()
                ->where('user_id', $todo->user_id)
                ->where('type', self::TYPE_TODO)
                ->notArchived();

            if ($todo->is_completed) {
                $query->where('is_completed', true);
            } else {
                $importance = $todo->importance ?? self::IMPORTANCE_NOT_IMPORTANT;
                $priority = $todo->priority ?? self::PRIORITY_NOT_URGENT;

                $query->where('is_completed', false)
                    ->where('importance', $importance)
                    ->where('priority', $priority);
            }

            $maxOrder = $query->max('kanban_order');

            $todo->kanban_order = ($maxOrder ?? 0) + 1;
        });
    }

    public static function hasKanbanOrderColumn(): bool
    {
        if (self::$kanbanOrderColumnExists === null) {
            self::$kanbanOrderColumnExists = Schema::hasColumn((new self)->getTable(), 'kanban_order');
        }

        return self::$kanbanOrderColumnExists;
    }

    public static function refreshKanbanOrderColumnCache(?bool $forceValue = null): void
    {
        self::$kanbanOrderColumnExists = $forceValue;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function focus(): BelongsTo
    {
        return $this->belongsTo(Focus::class);
    }

    /**
     * Get the tags that belong to this todo.
     */
    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'todo_tag');
    }

    /**
     * Get the attachments for this todo.
     */
    public function attachments()
    {
        return $this->hasMany(TodoAttachment::class);
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(TodoChecklistItem::class)->orderBy('position');
    }

    /**
     * Get the related todos (todos that this todo is linked to).
     */
    public function relatedTodos()
    {
        return $this->belongsToMany(Todo::class, 'todo_relationships', 'todo_id', 'related_todo_id')
            ->withTimestamps();
    }

    /**
     * Get the todos that link to this todo.
     */
    public function linkedByTodos()
    {
        return $this->belongsToMany(self::class, 'todo_relationships', 'related_todo_id', 'todo_id')
            ->withTimestamps();
    }

    public function statusEvents()
    {
        return $this->hasMany(TodoStatusEvent::class);
    }

    /**
     * Edges where this todo waits for another one.
     */
    public function dependencies(): HasMany
    {
        return $this->hasMany(TodoDependency::class, 'todo_id');
    }

    /**
     * Edges where other todos wait for this one.
     */
    public function dependents(): HasMany
    {
        return $this->hasMany(TodoDependency::class, 'depends_on_todo_id');
    }

    public function planItems(): HasMany
    {
        return $this->hasMany(DailyPlanItem::class);
    }

    /**
     * A P0 declaration carries an expiry, so "production critical" cannot become
     * a permanent label. An expired row reads as not-P0 without a timer job.
     */
    public function isP0Live(?\Carbon\CarbonInterface $now = null): bool
    {
        if (! $this->is_p0) {
            return false;
        }

        if ($this->p0_expires_at === null) {
            return true;
        }

        return $now ? $this->p0_expires_at->isAfter($now) : $this->p0_expires_at->isFuture();
    }

    public function isOfferable(): bool
    {
        return $this->type === self::TYPE_TODO
            && ! $this->is_completed
            && ! $this->archived
            && $this->deleted_at === null;
    }

    /**
     * Get all related todos (both directions).
     */
    public function allRelatedTodos()
    {
        $related = $this->relatedTodos()->get();
        $linkedBy = $this->linkedByTodos()->get();

        return $related->merge($linkedBy)->unique('id');
    }

    public function scopeCompleted($query)
    {
        return $query->where('is_completed', true);
    }

    public function scopePending($query)
    {
        return $query->where('is_completed', false);
    }

    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    public function scopeTasks($query)
    {
        return $query->where('type', self::TYPE_TODO);
    }

    public function scopeNotes($query)
    {
        return $query->where('type', self::TYPE_NOTE);
    }

    public function scopeHighPriority($query)
    {
        return $query->where('priority', self::PRIORITY_URGENT);
    }

    public function scopeLowPriority($query)
    {
        return $query->where('priority', self::PRIORITY_NOT_URGENT);
    }

    public function scopeArchived($query)
    {
        return $query->where('archived', true);
    }

    public function scopeNotArchived($query)
    {
        return $query->where('archived', false);
    }

    public function setPriorityAttribute($value): void
    {
        $this->attributes['priority'] = $value !== null ? strtolower($value) : null;
    }

    public function setTypeAttribute($value): void
    {
        $this->attributes['type'] = $value !== null ? strtolower($value) : null;
    }

    public function setImportanceAttribute($value): void
    {
        $this->attributes['importance'] = $value !== null ? strtolower($value) : null;
    }

    public function kanbanColumnKey(): string
    {
        if ($this->is_completed) {
            return 'completed';
        }

        $importance = $this->importance ?? self::IMPORTANCE_NOT_IMPORTANT;
        $priority = $this->priority ?? self::PRIORITY_NOT_URGENT;

        return sprintf('pending:%s:%s', $importance, $priority);
    }

    /**
     * Get all available priority levels
     */
    public static function getPriorityLevels()
    {
        return [
            self::PRIORITY_NOT_URGENT => 'Not Urgent',
            self::PRIORITY_URGENT => 'Urgent',
        ];
    }

    public static function getImportanceLevels()
    {
        return [
            self::IMPORTANCE_NOT_IMPORTANT => 'Not Important',
            self::IMPORTANCE_IMPORTANT => 'Important',
        ];
    }

    /**
     * Get priority color for UI display
     */
    public function getPriorityColorAttribute()
    {
        $priority = $this->priority !== null ? strtolower($this->priority) : null;

        return match ($priority) {
            self::PRIORITY_NOT_URGENT => '#0EA5E9',   // sky blue
            self::PRIORITY_URGENT => '#DC2626',       // red
            default => '#6B7280',                 // gray
        };
    }

    public function scopeByImportance($query, $importance)
    {
        return $query->where('importance', $importance);
    }

    public function scopeQ1($query)
    {
        return $query->where('importance', self::IMPORTANCE_IMPORTANT)
            ->where('priority', self::PRIORITY_URGENT)
            ->where('is_completed', false);
    }

    public function scopeQ2($query)
    {
        return $query->where('importance', self::IMPORTANCE_IMPORTANT)
            ->where('priority', self::PRIORITY_NOT_URGENT)
            ->where('is_completed', false);
    }

    public function scopeQ3($query)
    {
        return $query->where('importance', self::IMPORTANCE_NOT_IMPORTANT)
            ->where('priority', self::PRIORITY_URGENT)
            ->where('is_completed', false);
    }

    public function scopeQ4($query)
    {
        return $query->where('importance', self::IMPORTANCE_NOT_IMPORTANT)
            ->where('priority', self::PRIORITY_NOT_URGENT)
            ->where('is_completed', false);
    }

    public function isNote(): bool
    {
        return $this->type === self::TYPE_NOTE;
    }
}
