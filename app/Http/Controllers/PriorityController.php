<?php

namespace App\Http\Controllers;

use App\Domain\Priority\DayPlanner;
use App\Domain\Priority\PriorityException;
use App\Domain\Priority\PriorityExplainer;
use App\Domain\Priority\PriorityQueueBuilder;
use App\Domain\Priority\PrioritySettingsService;
use App\Models\Todo;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PriorityController extends Controller
{
    private function resolveToday(Request $request): CarbonImmutable
    {
        $date = $request->query('date') ?? $request->input('date');

        return $date
            ? CarbonImmutable::parse($date)->startOfDay()
            : CarbonImmutable::now()->startOfDay();
    }

    public function index(Request $request): Response|JsonResponse
    {
        $userId = (int) Auth::id();
        $settings = (new PrioritySettingsService($userId))->get();
        $today = $this->resolveToday($request);

        $data = (new PriorityQueueBuilder($userId, $settings, $today))->build();

        $props = [
            'date' => $data['date'],
            'settings' => $data['settings'],
            'capacity' => $data['capacity'],
            'main_work' => $data['main_work'],
            'today' => $data['today'],
            'next' => $data['next'],
            'proposal' => $data['proposal'],
            'triage' => $data['triage'],
            'warnings' => $data['warnings'],
            'counts' => $data['counts'],
        ];

        if ($request->wantsJson()) {
            return response()->json($props);
        }

        return Inertia::render('Priority/Index', $props);
    }

    public function commitItem(Request $request): RedirectResponse|JsonResponse
    {
        $data = $request->validate([
            'todo_id' => ['required', 'integer'],
            'reason' => ['nullable', 'string', 'max:500'],
            'allow_over_capacity' => ['sometimes', 'boolean'],
            'date' => ['sometimes', 'nullable', 'date'],
        ]);

        $reason = trim((string) ($data['reason'] ?? ''));
        if (mb_strlen($reason) < 8) {
            $reason = 'Pinned to Today from Priority Queue';
        }

        $userId = (int) Auth::id();
        $todo = Todo::query()->where('user_id', $userId)->find($data['todo_id']);
        if ($todo === null) {
            abort(404);
        }

        $settings = (new PrioritySettingsService($userId))->get();
        $planner = new DayPlanner($userId, $settings, $this->resolveToday($request));

        try {
            $planner->commit(
                $todo,
                $reason,
                (bool) ($data['allow_over_capacity'] ?? false),
                'web',
            );
        } catch (PriorityException $exception) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $exception->getMessage(), 'code' => $exception->errorCode], 422);
            }

            return back()->withErrors(['priority' => $exception->getMessage()]);
        }

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back();
    }

    public function uncommitItem(Request $request, int $todo): RedirectResponse|JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
            'date' => ['sometimes', 'nullable', 'date'],
        ]);

        $reason = trim((string) ($data['reason'] ?? ''));
        if (mb_strlen($reason) < 8) {
            $reason = 'Removed from Today in Priority Queue';
        }

        $userId = (int) Auth::id();
        $model = Todo::query()->where('user_id', $userId)->find($todo);
        if ($model === null) {
            abort(404);
        }

        $settings = (new PrioritySettingsService($userId))->get();
        $planner = new DayPlanner($userId, $settings, $this->resolveToday($request));
        $planner->uncommit($model, $reason, 'web');

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back();
    }

    public function explain(Request $request, int $todo): JsonResponse
    {
        $userId = (int) Auth::id();
        $model = Todo::query()->where('user_id', $userId)->find($todo);
        if ($model === null) {
            abort(404);
        }

        $settings = (new PrioritySettingsService($userId))->get();
        $explainer = new PriorityExplainer($userId, $settings, $this->resolveToday($request));

        return response()->json([
            'success' => true,
            'data' => $explainer->explain($model),
        ]);
    }
}
