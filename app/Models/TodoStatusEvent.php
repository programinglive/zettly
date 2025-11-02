<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TodoStatusEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'todo_id',
        'user_id',
        'from_state',
        'to_state',
        'reason',
    ];

    public function todo()
    {
        return $this->belongsTo(Todo::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
