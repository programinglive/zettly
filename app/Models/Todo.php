<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Todo extends Model
{
    use HasFactory, SoftDeletes;

    const TYPE_TODO = 'todo';

    const TYPE_NOTE = 'note';

    const PRIORITY_NOT_URGENT = 'not_urgent';

    const PRIORITY_URGENT = 'urgent';

    const IMPORTANCE_NOT_IMPORTANT = 'not_important';

    const IMPORTANCE_IMPORTANT = 'important';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'description',
        'priority',
        'importance',
        'is_completed',
        'completed_at',
        'due_date',
        'archived',
        'archived_at',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
        'due_date' => 'date',
        'archived' => 'boolean',
        'archived_at' => 'datetime',
    ];

    protected $appends = [
        'priority_color',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
        return $this->belongsToMany(Todo::class, 'todo_relationships', 'related_todo_id', 'todo_id')
            ->withTimestamps();
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
