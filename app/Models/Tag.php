<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tag extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'organization_id',
        'name',
        'color',
    ];

    /**
     * Get the user that owns the tag.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the organization that owns the tag.
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the todos that belong to this tag.
     */
    public function todos()
    {
        return $this->belongsToMany(Todo::class, 'todo_tag');
    }

    /**
     * Scope to get tags for a specific user.
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}
