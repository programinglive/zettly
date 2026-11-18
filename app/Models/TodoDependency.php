<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * "todo_id cannot start until depends_on_todo_id is done".
 */
class TodoDependency extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'todo_id',
        'depends_on_todo_id',
        'source',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function todo(): BelongsTo
    {
        return $this->belongsTo(Todo::class, 'todo_id');
    }

    public function dependsOn(): BelongsTo
    {
        return $this->belongsTo(Todo::class, 'depends_on_todo_id');
    }
}
