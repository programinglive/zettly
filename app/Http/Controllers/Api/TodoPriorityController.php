<?php

namespace App\Http\Controllers\Api;

use App\Domain\Priority\DependencyGraph;
use App\Domain\Priority\P0Service;
use App\Domain\Priority\PriorityAudit;
use App\Domain\Priority\PriorityException;
use App\Domain\Priority\PrioritySettingsService;
use App\Http\Controllers\Api\Concerns\MapsPriorityErrors;
use App\Http\Controllers\Controller;
use App\Models\PriorityDecision;
use App\Models\Todo;
use App\Models\TodoDependency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * The per-task half of the priority API: dependencies, queue state and P0.
 *
 * All of it is additive to the existing todo endpoints, so a client that only
 * knows `/api/v1/todos` keeps working unchanged.
 */
class TodoPriorityController extends Controller
{
    use MapsPriorityErrors;

    public function dependencies(string $todo): JsonResponse
    {
        try {
            $model = $this->ownedTodo($todo);
        } catch (PriorityException $exception) {
            return $this->priorityError($exception);
        }

        $graph = new DependencyGraph((int) Auth::id());

        $blockedBy = collect($graph->dependenciesOf($model))->map(fn (Todo $item) => [
            'id' => (int) $item->id,
            'title' => (string) $item->title,
            'is_completed' => (bool) $item->is_completed,
        ])->values()->all();

        $blocks = TodoDependency::query()
            ->where('user_id', Auth::id())
            ->where('depends_on_todo_id', $model->id)
            ->with('todo:id,title,is_completed')
            ->get()
            ->map(fn (TodoDependency $edge) => [
                'id' => (int) $edge->todo_id,
                'title' => (string) ($edge->todo?->title ?? ''),
                'is_completed' => (bool) ($edge->todo?->is_completed ?? false),
            ])
            ->all();

        return response()->json([
            'success' => true,
            'data' => [
                'todo_id' => (int) $model->id,
                'blocked_by' => $blockedBy,
                'blocks' => $blocks,
            ],
        ]);
    }

    public function addDependency(Request $request, string $todo): JsonResponse
    {
        try {
            $data = $request->validate([
                'depends_on_todo_id' => ['required', 'integer'],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->priorityError(PriorityException::validationFailed($e->errors()));
        }

        try {
            $model = $this->ownedTodo($todo);
            $blocker = $this->ownedTodo($data['depends_on_todo_id']);

            $edge = (new DependencyGraph((int) Auth::id()))->add($model, $blocker, 'api');
        } catch (PriorityException $exception) {
            return $this->priorityError($exception);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'todo_id' => (int) $edge->todo_id,
                'depends_on_todo_id' => (int) $edge->depends_on_todo_id,
            ],
        ]);
    }

    public function removeDependency(string $todo, string $dependency): JsonResponse
    {
        try {
            $model = $this->ownedTodo($todo);
            $removed = (new DependencyGraph((int) Auth::id()))->remove($model, (int) $dependency);
        } catch (PriorityException $exception) {
            return $this->priorityError($exception);
        }

        if ($removed) {
            (new PriorityAudit)->record(
                userId: (int) Auth::id(),
                action: PriorityDecision::ACTION_DEPENDENCY_REMOVE,
                source: 'api',
                reason: null,
                todoId: (int) $model->id,
                after: ['depends_on_todo_id' => (int) $dependency],
                actorUserId: (int) Auth::id(),
            );
        }

        return response()->json(['success' => true, 'data' => ['removed' => $removed]]);
    }

    public function updateQueueState(Request $request, string $todo): JsonResponse
    {
        $data = $request->validate([
            'queue_state' => ['required', 'string', 'in:'.implode(',', Todo::QUEUE_STATES)],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $model = $this->ownedTodo($todo);
        } catch (PriorityException $exception) {
            return $this->priorityError($exception);
        }

        $before = $model->queue_state;
        $model->forceFill([
            'queue_state' => $data['queue_state'],
            'triaged_at' => $data['queue_state'] === Todo::QUEUE_BACKLOG ? now() : $model->triaged_at,
        ])->save();

        (new PriorityAudit)->record(
            userId: (int) Auth::id(),
            action: PriorityDecision::ACTION_STATE_MOVE,
            source: 'api',
            reason: $data['reason'] ?? null,
            todoId: (int) $model->id,
            before: ['queue_state' => $before],
            after: ['queue_state' => $model->queue_state],
            actorUserId: (int) Auth::id(),
        );

        return response()->json([
            'success' => true,
            'data' => ['id' => (int) $model->id, 'queue_state' => $model->queue_state],
        ]);
    }

    public function declareP0(Request $request, string $todo): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:8', 'max:500'],
            'expires_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $expiresAt = isset($data['expires_at'])
            ? \Carbon\CarbonImmutable::parse($data['expires_at'])
            : null;

        try {
            $model = $this->ownedTodo($todo);
            $service = new P0Service((int) Auth::id(), (new PrioritySettingsService((int) Auth::id()))->get());
            $updated = $service->declare($model, $data['reason'], $expiresAt, 'api', (int) Auth::id());
        } catch (PriorityException $exception) {
            return $this->priorityError($exception);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (int) $updated->id,
                'is_p0' => (bool) $updated->is_p0,
                'p0_reason' => $updated->p0_reason,
                'p0_expires_at' => optional($updated->p0_expires_at)->toIso8601String(),
            ],
        ]);
    }

    public function clearP0(Request $request, string $todo): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:8', 'max:500'],
        ]);

        try {
            $model = $this->ownedTodo($todo);
            $service = new P0Service((int) Auth::id(), (new PrioritySettingsService((int) Auth::id()))->get());
            $updated = $service->clear($model, $data['reason'], 'api', (int) Auth::id());
        } catch (PriorityException $exception) {
            return $this->priorityError($exception);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (int) $updated->id,
                'is_p0' => (bool) $updated->is_p0,
                'p0_reason' => $updated->p0_reason,
                'p0_expires_at' => optional($updated->p0_expires_at)->toIso8601String(),
            ],
        ]);
    }
}
