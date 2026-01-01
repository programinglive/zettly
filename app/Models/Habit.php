<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class Habit extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'organization_id',
        'title',
        'description',
        'color',
        'icon',
        'target_frequency',
        'frequency_period',
        'is_active',
    ];

    protected $casts = [
        'target_frequency' => 'integer',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that owns the habit.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the organization that owns the habit.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the entries for the habit.
     */
    public function entries(): HasMany
    {
        return $this->hasMany(HabitEntry::class);
    }

    /**
     * Get the streak record for the habit.
     */
    public function streak(): HasMany
    {
        return $this->hasMany(HabitStreak::class);
    }

    /**
     * Get today's entry for the habit.
     */
    public function todayEntry(): HasMany
    {
        return $this->entries()->where('date', Carbon::today());
    }

    /**
     * Get entries for a specific date range.
     */
    public function entriesBetween($startDate, $endDate): HasMany
    {
        return $this->entries()->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Check if habit is completed for today.
     */
    public function isCompletedToday(): bool
    {
        return $this->todayEntry()->exists();
    }

    /**
     * Get completion count for today.
     */
    public function getTodayCount(): int
    {
        return $this->todayEntry()->sum('count') ?: 0;
    }

    /**
     * Check if today's target is met.
     */
    public function isTodayTargetMet(): bool
    {
        return $this->getTodayCount() >= $this->target_frequency;
    }

    /**
     * Get completion percentage for a date range.
     */
    public function getCompletionPercentage($startDate, $endDate): float
    {
        $totalDays = $startDate->diffInDays($endDate) + 1;

        $dailyTotals = $this->entries()
            ->whereBetween('date', [$startDate, $endDate])
            ->select('date', DB::raw('SUM(count) as total_count'))
            ->groupBy('date')
            ->get();

        $completedDays = $dailyTotals
            ->filter(fn ($entry) => $entry->total_count >= $this->target_frequency)
            ->count();

        return $totalDays > 0 ? ($completedDays / $totalDays) * 100 : 0;
    }

    /**
     * Scope to only include active habits.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to only include habits for the current user.
     */
    public function scopeForUser(Builder $query, $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to include personal and organization habits.
     */
    public function scopeAccessibleBy(Builder $query, int $userId, ?int $organizationId = null): Builder
    {
        return $query->where(function (Builder $q) use ($userId, $organizationId) {
            $q->where('user_id', $userId);

            $q->orWhere(function (Builder $orgHabits) use ($userId, $organizationId) {
                if ($organizationId) {
                    $orgHabits->where('organization_id', $organizationId);
                } else {
                    $orgHabits->whereNotNull('organization_id');
                }

                $orgHabits->whereExists(function ($exists) use ($userId) {
                    $exists->selectRaw('1')
                        ->from('organization_members')
                        ->whereColumn('organization_members.organization_id', 'habits.organization_id')
                        ->where('organization_members.user_id', $userId);
                });
            });
        });
    }
}
