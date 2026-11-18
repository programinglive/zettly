<?php

namespace Tests\Feature\Priority;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The schema the priority engine depends on.
 *
 * Every column here is additive: no existing column is renamed or dropped, so a
 * rollback of the feature leaves the previous behaviour intact.
 */
class PrioritySchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_priority_tables_exist(): void
    {
        foreach ([
            'main_work',
            'user_priority_settings',
            'todo_dependencies',
            'daily_plans',
            'daily_plan_items',
            'priority_decisions',
        ] as $table) {
            $this->assertTrue(Schema::hasTable($table), "Missing table: {$table}");
        }
    }

    public function test_todos_carry_queue_state_and_p0_columns(): void
    {
        foreach ([
            'queue_state',
            'estimate_minutes',
            'triaged_at',
            'is_p0',
            'p0_reason',
            'p0_since',
            'p0_expires_at',
            'p0_by',
        ] as $column) {
            $this->assertTrue(Schema::hasColumn('todos', $column), "Missing todos column: {$column}");
        }
    }

    public function test_a_new_todo_starts_in_the_inbox(): void
    {
        $user = User::factory()->create();

        $todo = Todo::create([
            'user_id' => $user->id,
            'title' => 'Fresh request',
            'type' => Todo::TYPE_TODO,
        ]);

        $this->assertSame(Todo::QUEUE_INBOX, $todo->fresh()->queue_state);
        $this->assertFalse((bool) $todo->fresh()->is_p0);
    }

    public function test_a_user_can_only_hold_one_main_work_row(): void
    {
        $user = User::factory()->create();
        $focusA = $user->foci()->create(['title' => 'A']);
        $focusB = $user->foci()->create(['title' => 'B']);

        \App\Models\MainWork::create([
            'user_id' => $user->id,
            'target_type' => \App\Models\MainWork::TARGET_FOCUS,
            'target_id' => $focusA->id,
            'reason' => 'Primary delivery',
            'source' => 'cli',
            'assigned_by' => $user->id,
            'assigned_at' => now(),
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        \App\Models\MainWork::create([
            'user_id' => $user->id,
            'target_type' => \App\Models\MainWork::TARGET_FOCUS,
            'target_id' => $focusB->id,
            'reason' => 'Second focus',
            'source' => 'cli',
            'assigned_by' => $user->id,
            'assigned_at' => now(),
        ]);
    }

    public function test_a_dependency_edge_is_unique_per_pair(): void
    {
        $user = User::factory()->create();
        $a = Todo::create(['user_id' => $user->id, 'title' => 'A', 'type' => Todo::TYPE_TODO]);
        $b = Todo::create(['user_id' => $user->id, 'title' => 'B', 'type' => Todo::TYPE_TODO]);

        \App\Models\TodoDependency::create([
            'user_id' => $user->id,
            'todo_id' => $a->id,
            'depends_on_todo_id' => $b->id,
            'source' => 'cli',
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        \App\Models\TodoDependency::create([
            'user_id' => $user->id,
            'todo_id' => $a->id,
            'depends_on_todo_id' => $b->id,
            'source' => 'cli',
        ]);
    }
}
