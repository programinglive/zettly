<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Todo extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'is_completed',
        'completed_at',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
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
}
