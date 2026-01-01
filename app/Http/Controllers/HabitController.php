<?php

namespace App\Http\Controllers;

use App\Models\Habit;
use App\Models\HabitEntry;
use App\Models\HabitStreak;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class HabitController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $organizationId = $request->get('organization_id');
        
        $habits = Habit::accessibleBy($user->id, $organizationId)
            ->active()
            ->with(['entries' => function ($query) {
                $query->whereBetween('date', [
                    Carbon::now()->subDays(30),
                    Carbon::now()->addDays(7)
                ]);
            }])
            ->orderBy('created_at', 'desc')
            ->get();

        // Load today's completion status
        $habits->each(function ($habit) {
            $habit->today_completed = $habit->isCompletedToday();
            $habit->today_count = $habit->getTodayCount();
            $habit->today_target_met = $habit->isTodayTargetMet();
        });

        return inertia('Habits/Index', [
            'habits' => $habits,
            'currentOrganization' => $organizationId ? $user->organizations()->find($organizationId) : null,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        return inertia('Habits/Create', [
            'organizations' => Auth::user()->organizations,
            'currentOrganization' => $request->get('organization_id'),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'color' => 'required|string|max:7',
            'icon' => 'required|string|max:50',
            'target_frequency' => 'required|integer|min:1|max:100',
            'frequency_period' => 'required|in:daily,weekly,monthly',
            'organization_id' => 'nullable|exists:organizations,id',
        ]);

        $habit = Habit::create([
            'user_id' => Auth::id(),
            'organization_id' => $validated['organization_id'] ?? null,
            ...$validated,
        ]);

        // Create initial streak record
        HabitStreak::create([
            'habit_id' => $habit->id,
            'current_streak' => 0,
            'longest_streak' => 0,
        ]);

        return redirect()->route('habits.index', [
            'organization_id' => $validated['organization_id'] ?? null
        ])->with('success', 'Habit created successfully!');
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Habit $habit)
    {
        $this->authorizeHabit($habit, $request);

        $startDate = $request->get('start_date', Carbon::now()->subDays(30));
        $endDate = $request->get('end_date', Carbon::now());

        $entries = $habit->entriesBetween($startDate, $endDate)
            ->orderBy('date', 'desc')
            ->get();

        $stats = $this->calculateHabitStats($habit, $startDate, $endDate);

        return inertia('Habits/Show', [
            'habit' => $habit->load(['user', 'organization']),
            'entries' => $entries,
            'stats' => $stats,
            'startDate' => $startDate,
            'endDate' => $endDate,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Habit $habit)
    {
        $this->authorizeHabit($habit, request());

        return inertia('Habits/Edit', [
            'habit' => $habit,
            'organizations' => Auth::user()->organizations,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Habit $habit)
    {
        $this->authorizeHabit($habit, $request);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'color' => 'required|string|max:7',
            'icon' => 'required|string|max:50',
            'target_frequency' => 'required|integer|min:1|max:100',
            'frequency_period' => 'required|in:daily,weekly,monthly',
            'is_active' => 'boolean',
            'organization_id' => 'nullable|exists:organizations,id',
        ]);

        $habit->update($validated);

        return redirect()->route('habits.show', $habit)
            ->with('success', 'Habit updated successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Habit $habit)
    {
        $this->authorizeHabit($habit, request());

        $habit->delete();

        return redirect()->route('habits.index')
            ->with('success', 'Habit deleted successfully!');
    }

    /**
     * Toggle habit completion for today.
     */
    public function toggle(Request $request, Habit $habit): JsonResponse
    {
        $this->authorizeHabit($habit, $request);

        $today = Carbon::today();
        $count = $request->get('count', 1);
        $notes = $request->get('notes');

        $existingEntry = $habit->entries()->forDate($today)->first();

        if ($existingEntry) {
            if ($count > 0) {
                $existingEntry->update([
                    'count' => $count,
                    'notes' => $notes,
                ]);
            } else {
                $existingEntry->delete();
            }
        } elseif ($count > 0) {
            $habit->entries()->create([
                'date' => $today,
                'count' => $count,
                'notes' => $notes,
            ]);
        }

        // Update streak
        $this->updateStreak($habit);

        return response()->json([
            'completed' => $habit->isCompletedToday(),
            'count' => $habit->getTodayCount(),
            'target_met' => $habit->isTodayTargetMet(),
        ]);
    }

    /**
     * Get habit statistics.
     */
    public function stats(Request $request, Habit $habit): JsonResponse
    {
        $this->authorizeHabit($habit, $request);

        $startDate = $request->get('start_date', Carbon::now()->subDays(30));
        $endDate = $request->get('end_date', Carbon::now());

        $stats = $this->calculateHabitStats($habit, $startDate, $endDate);

        return response()->json($stats);
    }

    /**
     * Calculate habit statistics.
     */
    private function calculateHabitStats(Habit $habit, Carbon $startDate, Carbon $endDate): array
    {
        $entries = $habit->entriesBetween($startDate, $endDate)->get();
        $totalDays = $startDate->diffInDays($endDate) + 1;

        $completedDays = $entries->filter(function ($entry) use ($habit) {
            return $entry->count >= $habit->target_frequency;
        })->count();

        $completionRate = $totalDays > 0 ? ($completedDays / $totalDays) * 100 : 0;

        // Get streak info
        $streak = $habit->streak()->first();

        return [
            'completion_rate' => round($completionRate, 1),
            'completed_days' => $completedDays,
            'total_days' => $totalDays,
            'current_streak' => $streak?->current_streak ?? 0,
            'longest_streak' => $streak?->longest_streak ?? 0,
            'total_completions' => $entries->sum('count'),
        ];
    }

    /**
     * Update habit streak based on recent entries.
     */
    private function updateStreak(Habit $habit): void
    {
        $streak = $habit->streak()->firstOrCreate([], [
            'current_streak' => 0,
            'longest_streak' => 0,
        ]);

        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        $todayEntry = $habit->entries()->forDate($today)->first();
        $yesterdayEntry = $habit->entries()->forDate($yesterday)->first();

        if ($todayEntry && $todayEntry->count >= $habit->target_frequency) {
            if ($yesterdayEntry && $yesterdayEntry->count >= $habit->target_frequency) {
                // Continue streak
                $streak->current_streak++;
            } else {
                // Start new streak
                $streak->current_streak = 1;
            }

            if ($streak->current_streak > $streak->longest_streak) {
                $streak->longest_streak = $streak->current_streak;
            }

            $streak->last_completion_date = $today;
        } elseif (!$todayEntry && $yesterdayEntry && $yesterdayEntry->count >= $habit->target_frequency) {
            // Streak broken
            if ($streak->current_streak > $streak->longest_streak) {
                $streak->longest_streak = $streak->current_streak;
            }
            $streak->current_streak = 0;
        }

        $streak->save();
    }

    /**
     * Authorize habit access.
     */
    private function authorizeHabit(Habit $habit, Request $request): void
    {
        $user = Auth::user();
        
        // Check if user owns the habit or has access through organization
        if ($habit->user_id !== $user->id) {
            if ($habit->organization_id) {
                $isMember = $user->organizations()
                    ->where('organizations.id', $habit->organization_id)
                    ->exists();
                
                if (!$isMember) {
                    if ($request->wantsJson() || $request->is('api/*')) {
                        response()->json(['message' => 'Unauthorized'], 403)->throwResponse();
                    }
                    abort(403);
                }
            } else {
                if ($request->wantsJson() || $request->is('api/*')) {
                    response()->json(['message' => 'Unauthorized'], 403)->throwResponse();
                }
                abort(403);
            }
        }
    }
}
