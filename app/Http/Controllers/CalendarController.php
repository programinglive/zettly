<?php

namespace App\Http\Controllers;

use App\Domain\Priority\WeeklyFocusAllocationService;
use App\Models\Todo;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    public function __construct(private readonly WeeklyFocusAllocationService $allocationService)
    {
    }

    public function index(Request $request): Response|JsonResponse
    {
        $userId = (int) $request->user()->id;

        $activeDateStr = (string) $request->query('date', now()->format('Y-m-d'));
        try {
            $activeDate = CarbonImmutable::parse($activeDateStr);
        } catch (\Throwable) {
            $activeDate = CarbonImmutable::now();
        }

        $monthParam = (string) $request->query('month', $activeDate->format('Y-m'));
        if (preg_match('/^\d{4}-\d{2}$/', $monthParam) === 1) {
            $monthDate = CarbonImmutable::parse($monthParam . '-01');
        } else {
            $monthDate = $activeDate->startOfMonth();
        }

        $schedule = $this->allocationService->getSchedule($userId);
        $calendar = $this->allocationService->buildCalendar($userId, $monthDate, $activeDate);

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'month' => $calendar['month'],
                'schedule' => $schedule,
                'calendar' => $calendar,
            ]);
        }

        return Inertia::render('Calendar/Index', [
            'month' => $calendar['month'],
            'schedule' => $schedule,
            'calendar' => $calendar,
        ]);
    }

    public function updateAllocations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'allocations' => ['required', 'array'],
        ]);

        $schedule = $this->allocationService->updateSchedule(
            userId: (int) $request->user()->id,
            updates: $validated['allocations'],
            source: $request->is('api/*') ? 'api' : 'web'
        );

        return response()->json([
            'schedule' => $schedule,
        ]);
    }

    public function scheduleTodo(Request $request, Todo $todo): JsonResponse
    {
        if ((int) $todo->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'due_date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $todo->due_date = $validated['due_date'] ?? null;
        $todo->save();

        return response()->json([
            'todo' => [
                'id' => (int) $todo->id,
                'title' => (string) $todo->title,
                'due_date' => $todo->due_date?->format('Y-m-d'),
            ],
        ]);
    }
}
