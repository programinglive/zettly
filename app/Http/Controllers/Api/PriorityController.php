<?php

namespace App\Http\Controllers\Api;

use App\Domain\Priority\DayPlanner;
use App\Domain\Priority\MainWorkService;
use App\Domain\Priority\PriorityException;
use App\Domain\Priority\PriorityExplainer;
use App\Domain\Priority\PriorityQueueBuilder;
use App\Domain\Priority\PrioritySettingsService;
use App\Http\Controllers\Api\Concerns\MapsPriorityErrors;
use App\Http\Controllers\Controller;
use App\Models\DailyPlan;
use App\Models\PriorityDecision;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Thin HTTP adapter over App\Domain\Priority.
 *
 * This controller validates input, scopes everything to the signed-in owner and
 * shapes the JSON. It never sorts, never scores and never decides what "next"
 * means: that answer comes from PriorityQueueBuilder.
 */
class PriorityController extends Controller
{
    use MapsPriorityErrors;

    private function settingsService(): PrioritySettingsService
    {
        return new PrioritySettingsService((int) Auth::id());
    }

    private function today(Request $request): CarbonImmutable
    {
        $date = $request->query('date') ?? $request->input('date');

        return $date
            ? CarbonImmutable::parse($date)->startOfDay()
            : CarbonImmutable::now()->startOfDay();
    }

    public function queue(Request $request): JsonResponse
    {
        $builder = new PriorityQueueBuilder(
            (int) Auth::id(),
            $this->settingsService()->get(),
            $this->today($request),
        );

        $limit = $request->query('limit');
        $payload = $builder->build($limit === null ? null : (int) $limit);

        return response()->json(['success' => true, 'data' => $payload]);
    }

    public function explain(string $todo): JsonResponse
    {
        try {
            $model = $this->ownedTodo($todo);
        } catch (PriorityException $exception) {
            return $this->priorityError($exception);
        }

        $explainer = new PriorityExplainer(
            (int) Auth::id(),
            $this->settingsService()->get(),
            CarbonImmutable::now()->startOfDay(),
        );

        return response()->json([
            'success' => true,
            'data' => $explainer->explain($model),
        ]);
    }

    public function ensurePlan(Request $request): JsonResponse
    {
        $planner = new DayPlanner(
            (int) Auth::id(),
            $this->settingsService()->get(),
            $this->today($request),
        );

        return response()->json([
            'success' => true,
            'data' => $this->planPayload($planner->ensurePlan()),
        ]);
    }

    public function commitItem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'todo_id' => ['required', 'integer'],
            'reason' => ['required', 'string', 'min:8', 'max:500'],
            'allow_over_capacity' => ['sometimes', 'boolean'],
            'date' => ['sometimes', 'nullable', 'date'],
        ]);

        try {
            $todo = $this->ownedTodo($data['todo_id']);
            $planner = new DayPlanner(
                (int) Auth::id(),
                $this->settingsService()->get(),
                $this->today($request),
            );

            $item = $planner->commit(
                $todo,
                $data['reason'],
                (bool) ($data['allow_over_capacity'] ?? false),
                'api',
            );
        } catch (PriorityException $exception) {
            return $this->priorityError($exception);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'todo_id' => (int) $item->todo_id,
                'position' => (int) $item->position,
                'state' => $item->state,
                'plan_date' => $planner->ensurePlan()->plan_date?->toDateString(),
            ],
        ]);
    }

    public function uncommitItem(Request $request, string $todo): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:8', 'max:500'],
            'date' => ['sometimes', 'nullable', 'date'],
        ]);

        try {
            $model = $this->ownedTodo($todo);
            $planner = new DayPlanner(
                (int) Auth::id(),
                $this->settingsService()->get(),
                $this->today($request),
            );

            $removed = $planner->uncommit($model, $data['reason'], 'api');
        } catch (PriorityException $exception) {
            return $this->priorityError($exception);
        }

        return response()->json(['success' => true, 'data' => ['removed' => $removed]]);
    }

    public function mainWork(): JsonResponse
    {
        $service = new MainWorkService((int) Auth::id());
        $mainWork = $service->get();

        return response()->json([
            'success' => true,
            'data' => $mainWork === null ? null : [
                'target_type' => $mainWork->target_type,
                'target_id' => (int) $mainWork->target_id,
                'label' => $service->label(),
                'reason' => $mainWork->reason,
                'assigned_at' => optional($mainWork->assigned_at)->toIso8601String(),
            ],
        ]);
    }

    public function setMainWork(Request $request): JsonResponse
    {
        $data = $request->validate([
            'target_type' => ['required', 'string', 'in:focus,todo'],
            'target_id' => ['required', 'integer'],
            'reason' => ['required', 'string', 'min:8', 'max:500'],
        ]);

        $service = new MainWorkService((int) Auth::id());

        try {
            $service->set(
                $data['target_type'],
                (int) $data['target_id'],
                $data['reason'],
                'api',
                (int) Auth::id(),
            );
        } catch (PriorityException $exception) {
            return $this->priorityError($exception);
        }

        return $this->mainWork();
    }

    public function clearMainWork(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:8', 'max:500'],
        ]);

        try {
            (new MainWorkService((int) Auth::id()))->clear($data['reason'], 'api', (int) Auth::id());
        } catch (PriorityException $exception) {
            return $this->priorityError($exception);
        }

        return response()->json(['success' => true, 'data' => null]);
    }

    public function settings(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->settingsService()->payload()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'wip_limit' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'daily_capacity_minutes' => ['sometimes', 'integer', 'min:0', 'max:1440'],
            'queue_size' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'require_focus' => ['sometimes', 'boolean'],
            'require_estimate' => ['sometimes', 'boolean'],
            'max_p0' => ['sometimes', 'integer', 'min:1', 'max:3'],
            'main_work_strict' => ['sometimes', 'boolean'],
            'enabled' => ['sometimes', 'boolean'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $service = $this->settingsService();
        $service->update($data, 'api', (int) Auth::id(), $data['reason'] ?? null);

        return response()->json(['success' => true, 'data' => $service->payload()]);
    }

    public function history(Request $request): JsonResponse
    {
        $query = PriorityDecision::query()->where('user_id', Auth::id());

        if ($request->filled('todo_id')) {
            $query->where('todo_id', (int) $request->query('todo_id'));
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', CarbonImmutable::parse($request->query('from'))->startOfDay());
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', CarbonImmutable::parse($request->query('to'))->endOfDay());
        }

        $limit = max(1, min(200, (int) ($request->query('limit') ?? 50)));

        $rows = $query->orderByDesc('id')->limit($limit)->get()->map(fn (PriorityDecision $row) => [
            'id' => (int) $row->id,
            'action' => $row->action,
            'source' => $row->source,
            'todo_id' => $row->todo_id === null ? null : (int) $row->todo_id,
            'focus_id' => $row->focus_id === null ? null : (int) $row->focus_id,
            'reason' => $row->reason,
            'before' => $row->before,
            'after' => $row->after,
            'created_at' => optional($row->created_at)->toIso8601String(),
        ]);

        return response()->json(['success' => true, 'data' => $rows]);
    }

    /**
     * @return array<string, mixed>
     */
    private function planPayload(DailyPlan $plan): array
    {
        return [
            'id' => (int) $plan->id,
            'plan_date' => $plan->plan_date?->toDateString(),
            'wip_limit' => (int) $plan->wip_limit_snapshot,
            'capacity_minutes' => (int) $plan->capacity_minutes_snapshot,
            'closed_at' => optional($plan->closed_at)->toIso8601String(),
            'items' => $plan->items()->with('todo:id,title,estimate_minutes')->get()->map(fn ($item) => [
                'todo_id' => (int) $item->todo_id,
                'title' => (string) ($item->todo?->title ?? ''),
                'position' => (int) $item->position,
                'state' => $item->state,
                'reason' => $item->reason,
                'estimate_minutes' => $item->todo?->estimate_minutes,
            ])->all(),
        ];
    }
}
