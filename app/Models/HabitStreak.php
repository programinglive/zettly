<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HabitStreak extends Model
{
    use HasFactory;

    protected $fillable = [
        'habit_id',
        'current_streak',
        'longest_streak',
        'last_completion_date',
    ];

    protected $casts = [
        'current_streak' => 'integer',
        'longest_streak' => 'integer',
        'last_completion_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the habit that owns the streak.
     */
    public function habit(): BelongsTo
    {
        return $this->belongsTo(Habit::class);
    }
}
