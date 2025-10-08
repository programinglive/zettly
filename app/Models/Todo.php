<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Todo extends Model
{
    use HasFactory, SoftDeletes;

    // Priority constants
    const PRIORITY_LOW = 'low';

    const PRIORITY_MEDIUM = 'medium';

    const PRIORITY_HIGH = 'high';

    const PRIORITY_URGENT = 'urgent';

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'priority',
        'is_completed',
        'completed_at',
        'archived',
        'archived_at',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
        'archived' => 'boolean',
        'archived_at' => 'datetime',
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
     * Get the related todos (todos that this todo is linked to).
     */
    public function relatedTodos()
    {
        return $this->belongsToMany(Todo::class, 'todo_relationships', 'todo_id', 'related_todo_id')
            ->withPivot('relationship_type')
            ->withTimestamps();
    }

    /**
     * Get the todos that link to this todo.
     */
    public function linkedByTodos()
    {
        return $this->belongsToMany(Todo::class, 'todo_relationships', 'related_todo_id', 'todo_id')
            ->withPivot('relationship_type')
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

    public function scopeHighPriority($query)
    {
        return $query->whereIn('priority', [self::PRIORITY_HIGH, self::PRIORITY_URGENT]);
    }

    public function scopeLowPriority($query)
    {
        return $query->whereIn('priority', [self::PRIORITY_LOW, self::PRIORITY_MEDIUM]);
    }

    public function scopeArchived($query)
    {
        return $query->where('archived', true);
    }

    public function scopeNotArchived($query)
    {
        return $query->where('archived', false);
    }

    /**
     * Get all available priority levels
     */
    public static function getPriorityLevels()
    {
        return [
            self::PRIORITY_LOW => 'Low',
            self::PRIORITY_MEDIUM => 'Medium',
            self::PRIORITY_HIGH => 'High',
            self::PRIORITY_URGENT => 'Urgent',
        ];
    }

    /**
     * Get priority color for UI display
     */
    public function getPriorityColorAttribute()
    {
        return match ($this->priority) {
            self::PRIORITY_LOW => '#10B981',      // green
            self::PRIORITY_MEDIUM => '#F59E0B',   // yellow
            self::PRIORITY_HIGH => '#EF4444',     // red
            self::PRIORITY_URGENT => '#DC2626',   // dark red
            default => '#6B7280',                 // gray
        };
    }
}
