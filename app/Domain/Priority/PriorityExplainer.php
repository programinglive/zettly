<?php

namespace App\Domain\Priority;

use App\Models\Todo;
use App\Models\TodoDependency;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;

/**
 * Explains a single task's place in the queue.
 *
 * The answer has to come from the same ranked list the queue is built from:
 * anything else would be a second opinion, and a second opinion is exactly what
 * this feature exists to remove.
 */
final class PriorityExplainer
{
    public function __construct(
        private readonly int $userId,
        private readonly UserPrioritySetting $settings,
        private readonly CarbonImmutable $today,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function explain(Todo $todo): array
    {
        $context = PriorityContextFactory::forUser($this->userId, $this->settings, $this->today);
        $gate = ReadinessGate::evaluate($todo, $context);

        $ranked = PriorityEngine::rank($this->readyTodos($context), $context);

        $position = null;
        $decidedBy = null;
        $detail = null;
        $key = [];
        $reasons = [];

        foreach ($ranked as $index => $item) {
            if ((int) $item->todo->id !== (int) $todo->id) {
                continue;
            }

            $position = $index + 1;
            $key = $item->key();
            $reasons = $item->reasons;

            if ($index > 0) {
                $explanation = PriorityEngine::explain($item, $ranked[$index - 1]);
                $decidedBy = $explanation['decided_by'];
                $detail = $explanation['detail'];
            }

            break;
        }

        return [
            'todo' => [
                'id' => (int) $todo->id,
                'title' => (string) $todo->title,
                'focus_id' => $todo->focus_id === null ? null : (int) $todo->focus_id,
                'focus_title' => $todo->focus?->title,
                'due_date' => $todo->due_date?->toDateString(),
                'queue_state' => $todo->queue_state,
                'estimate_minutes' => $todo->estimate_minutes,
                'is_p0' => $todo->isP0Live($context->today),
                'is_main_work' => $context->isMainWork($todo),
            ],
            'ready' => $gate['ready'],
            'readiness_reasons' => $gate['reasons'],
            'position' => $position,
            'committed' => $context->isCommitted($todo),
            'key' => $key,
            'reasons' => $reasons,
            'decided_by' => $decidedBy,
            'detail' => $detail,
            'blocked_by' => $this->blockedBy($todo),
            'blocks' => $this->blocks($todo),
        ];
    }

    /**
     * @return array<int, Todo>
     */
    private function readyTodos(PriorityContext $context): array
    {
        $todos = Todo::query()
            ->where('user_id', $this->userId)
            ->where('type', Todo::TYPE_TODO)
            ->where('is_completed', false)
            ->where('archived', false)
            ->with('focus:id,title')
            ->get();

        $ready = [];

        foreach ($todos as $todo) {
            if (ReadinessGate::evaluate($todo, $context)['ready']) {
                $ready[] = $todo;
            }
        }

        return $ready;
    }

    /**
     * @return array<int, array{id: int, title: string, is_completed: bool}>
     */
    private function blockedBy(Todo $todo): array
    {
        return TodoDependency::query()
            ->where('user_id', $this->userId)
            ->where('todo_id', $todo->id)
            ->with('dependsOn:id,title,is_completed')
            ->get()
            ->map(fn (TodoDependency $edge) => [
                'id' => (int) $edge->depends_on_todo_id,
                'title' => (string) ($edge->dependsOn?->title ?? ''),
                'is_completed' => (bool) ($edge->dependsOn?->is_completed ?? false),
            ])
            ->all();
    }

    /**
     * @return array<int, array{id: int, title: string, is_completed: bool}>
     */
    private function blocks(Todo $todo): array
    {
        return TodoDependency::query()
            ->where('user_id', $this->userId)
            ->where('depends_on_todo_id', $todo->id)
            ->with('todo:id,title,is_completed')
            ->get()
            ->map(fn (TodoDependency $edge) => [
                'id' => (int) $edge->todo_id,
                'title' => (string) ($edge->todo?->title ?? ''),
                'is_completed' => (bool) ($edge->todo?->is_completed ?? false),
            ])
            ->all();
    }
}
