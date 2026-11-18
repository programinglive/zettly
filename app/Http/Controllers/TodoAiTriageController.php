<?php

namespace App\Http\Controllers;

use App\Domain\Priority\DependencyGraph;
use App\Domain\Priority\PriorityException;
use App\Models\Todo;
use App\Services\Ai\KenariConfigurationException;
use App\Services\Ai\KenariModelNotAllowedException;
use App\Services\Ai\KenariRequestException;
use App\Services\Ai\TodoIntelligenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Handles on-demand, human-reviewed AI triage suggestions and explicit application.
 */
class TodoAiTriageController extends Controller
{
    public function __construct(private readonly TodoIntelligenceService $intelligenceService)
    {
    }

    public function suggest(Request $request, Todo $todo): JsonResponse
    {
        if (! config('coding_agent.ai_triage_enabled', false)) {
            return response()->json(['error' => 'AI Todo triage is currently disabled.'], 403);
        }

        if ((int) $todo->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        if ($todo->type !== Todo::TYPE_TODO) {
            return response()->json(['error' => 'AI triage is only available for Todo items.'], 422);
        }

        $validated = $request->validate([
            'model' => ['nullable', 'string', 'max:120'],
        ]);

        try {
            $result = $this->intelligenceService->suggest($todo, $validated['model'] ?? null);

            return response()->json($result);
        } catch (KenariConfigurationException $e) {
            return response()->json(['error' => $e->getMessage()], 503);
        } catch (KenariModelNotAllowedException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (KenariRequestException $e) {
            return response()->json(['error' => 'AI triage request failed. Please try again.'], 502);
        }
    }

    public function apply(Request $request, Todo $todo): JsonResponse
    {
        if (! config('coding_agent.ai_triage_enabled', false)) {
            return response()->json(['error' => 'AI Todo triage is currently disabled.'], 403);
        }

        if ((int) $todo->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        if ($todo->type !== Todo::TYPE_TODO) {
            return response()->json(['error' => 'AI triage is only available for Todo items.'], 422);
        }

        $validated = $request->validate([
            'expected_updated_at' => ['required', 'string'],
            'priority' => ['nullable', 'in:urgent,not_urgent'],
            'importance' => ['nullable', 'in:important,not_important'],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'dependency_todo_ids' => ['nullable', 'array'],
            'dependency_todo_ids.*' => ['integer', 'distinct'],
        ]);

        try {
            $outcome = DB::transaction(function () use ($request, $todo, $validated) {
                $locked = Todo::query()->whereKey($todo->id)->lockForUpdate()->firstOrFail();

                $currentUpdatedAt = $locked->updated_at?->toIso8601String();
                if ($currentUpdatedAt !== $validated['expected_updated_at']) {
                    return ['conflict' => true];
                }

                if (array_key_exists('priority', $validated)) {
                    $locked->priority = $validated['priority'];
                }
                if (array_key_exists('importance', $validated)) {
                    $locked->importance = $validated['importance'];
                }
                if (array_key_exists('due_date', $validated)) {
                    $locked->due_date = $validated['due_date'];
                }

                $locked->save();

                $depIds = $validated['dependency_todo_ids'] ?? [];
                if ($depIds !== []) {
                    $graph = new DependencyGraph((int) $request->user()->id);
                    $candidates = Todo::query()
                        ->where('user_id', $request->user()->id)
                        ->where('type', Todo::TYPE_TODO)
                        ->when(
                            $locked->organization_id !== null,
                            fn ($q) => $q->where('organization_id', $locked->organization_id),
                            fn ($q) => $q->whereNull('organization_id')
                        )
                        ->whereIn('id', $depIds)
                        ->get()
                        ->keyBy('id');

                    foreach ($depIds as $depId) {
                        $depTodo = $candidates->get((int) $depId);
                        if (! $depTodo) {
                            throw PriorityException::forbidden("Dependency Todo #{$depId} is invalid or out of scope.");
                        }

                        $graph->add($locked, $depTodo, 'ai_reviewed');
                    }
                }

                $locked->refresh();

                return [
                    'conflict' => false,
                    'todo' => $locked,
                ];
            });
        } catch (PriorityException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        if ($outcome['conflict']) {
            return response()->json([
                'error' => 'This Todo was modified by another request. Please refresh and re-run AI triage.',
            ], 409);
        }

        return response()->json([
            'todo' => [
                'id' => $outcome['todo']->id,
                'priority' => $outcome['todo']->priority,
                'importance' => $outcome['todo']->importance,
                'due_date' => $outcome['todo']->due_date?->format('Y-m-d'),
                'updated_at' => $outcome['todo']->updated_at?->toIso8601String(),
            ],
        ]);
    }
}
