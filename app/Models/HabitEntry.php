<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class HabitEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'habit_id',
        'date',
        'count',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the habit that owns the entry.
     */
    public function habit(): BelongsTo
    {
        return $this->belongsTo(Habit::class);
    }

    /**
     * Scope to entries for a specific date.
     */
    public function scopeForDate($query, $date)
    {
        return $query->where('date', $date);
    }

    /**
     * Scope to entries for a date range.
     */
    public function scopeBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Scope to today's entries.
     */
    public function scopeToday($query)
    {
        return $query->where('date', Carbon::today());
    }
}
