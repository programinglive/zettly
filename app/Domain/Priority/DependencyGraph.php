<?php

namespace App\Domain\Priority;

use App\Models\Todo;
use App\Models\TodoDependency;
use Illuminate\Support\Facades\DB;

/**
 * Directed "must finish before" edges for one user.
 *
 * Reads are batched into two queries so a 200-task queue does not turn into 400
 * round trips. Cycle detection is a depth-first walk of the dependency tree:
 * portable, and it reports the path when it refuses.
 */
final class DependencyGraph
{
    public function __construct(private readonly int $userId) {}

    /**
     * todo id => open blocking todo ids.
     *
     * @return array<int, array<int, int>>
     */
    public function blockedIds(): array
    {
        $rows = DB::table('todo_dependencies as d')
            ->join('todos as t', 't.id', '=', 'd.depends_on_todo_id')
            ->where('d.user_id', $this->userId)
            ->whereNull('t.deleted_at')
            ->where('t.is_completed', false)
            ->where('t.archived', false)
            ->select('d.todo_id', 'd.depends_on_todo_id')
            ->get();

        $blocked = [];

        foreach ($rows as $row) {
            $blocked[(int) $row->todo_id][] = (int) $row->depends_on_todo_id;
        }

        foreach ($blocked as $todoId => $ids) {
            $blocked[$todoId] = array_values(array_unique($ids));
            sort($blocked[$todoId]);
        }

        return $blocked;
    }

    /**
     * todo id => how many open tasks are waiting on it.
     *
     * @return array<int, int>
     */
    public function unblockCounts(): array
    {
        $rows = DB::table('todo_dependencies as d')
            ->join('todos as t', 't.id', '=', 'd.todo_id')
            ->where('d.user_id', $this->userId)
            ->whereNull('t.deleted_at')
            ->where('t.is_completed', false)
            ->where('t.archived', false)
            ->select('d.depends_on_todo_id', DB::raw('COUNT(*) as waiting'))
            ->groupBy('d.depends_on_todo_id')
            ->get();

        $counts = [];

        foreach ($rows as $row) {
            $counts[(int) $row->depends_on_todo_id] = (int) $row->waiting;
        }

        return $counts;
    }

    /**
     * @return array<int, Todo> the tasks this one directly waits for
     */
    public function dependenciesOf(Todo $todo): array
    {
        return Todo::query()
            ->whereIn('id', TodoDependency::query()
                ->where('user_id', $this->userId)
                ->where('todo_id', $todo->id)
                ->pluck('depends_on_todo_id'))
            ->get()
            ->all();
    }

    public function add(Todo $todo, Todo $dependsOn, string $source): TodoDependency
    {
        if ((int) $todo->user_id !== $this->userId || (int) $dependsOn->user_id !== $this->userId) {
            throw PriorityException::forbidden('A dependency must stay inside your own tasks.');
        }

        if ((int) $todo->id === (int) $dependsOn->id) {
            throw new PriorityException('dependency_self', 'A task cannot wait on itself.');
        }

        $cycle = $this->cyclePath((int) $todo->id, (int) $dependsOn->id);
        if ($cycle !== []) {
            throw PriorityException::dependencyCycle($cycle);
        }

        return TodoDependency::firstOrCreate(
            [
                'todo_id' => $todo->id,
                'depends_on_todo_id' => $dependsOn->id,
            ],
            [
                'user_id' => $this->userId,
                'source' => $source,
            ],
        );
    }

    public function remove(Todo $todo, int $dependsOnId): bool
    {
        return TodoDependency::query()
            ->where('user_id', $this->userId)
            ->where('todo_id', $todo->id)
            ->where('depends_on_todo_id', $dependsOnId)
            ->delete() > 0;
    }

    /**
     * The path that would close a loop, or an empty array when adding is safe.
     *
     * @return array<int, int>
     */
    public function cyclePath(int $todoId, int $dependsOnId): array
    {
        // Adding "todo waits for dependsOn" closes a loop when dependsOn already
        // waits, directly or transitively, for todo.
        $edges = $this->edgesForUser();

        $stack = [[$dependsOnId, [$dependsOnId]]];
        $seen = [];

        while ($stack !== []) {
            [$node, $path] = array_pop($stack);

            if ($node === $todoId) {
                return array_merge([$todoId], $path);
            }

            if (isset($seen[$node])) {
                continue;
            }
            $seen[$node] = true;

            foreach ($edges[$node] ?? [] as $next) {
                $stack[] = [$next, array_merge($path, [$next])];
            }
        }

        return [];
    }

    /**
     * @return array<int, array<int, int>>
     */
    private function edgesForUser(): array
    {
        $rows = TodoDependency::query()
            ->where('user_id', $this->userId)
            ->get(['todo_id', 'depends_on_todo_id']);

        $edges = [];

        foreach ($rows as $row) {
            $edges[(int) $row->todo_id][] = (int) $row->depends_on_todo_id;
        }

        return $edges;
    }
}
