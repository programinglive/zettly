<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KanbanDragDropTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_reorder_todos_within_a_column(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $todoA = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'kanban_order' => 1,
        ]);

        $todoB = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'kanban_order' => 2,
        ]);

        $todoC = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'kanban_order' => 3,
        ]);

        $otherColumnTodo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'is_completed' => true,
            'priority' => null,
            'importance' => null,
            'kanban_order' => 7,
        ]);

        $response = $this->actingAs($user)
            ->from('/dashboard')
            ->post(route('todos.reorder'), [
                'column' => 'q1',
                'todo_ids' => [$todoB->id, $todoA->id],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['message' => 'Todo order updated successfully']);

        $this->assertSame(1, $todoB->fresh()->kanban_order);
        $this->assertSame(2, $todoA->fresh()->kanban_order);
        $this->assertSame(3, $todoC->fresh()->kanban_order);
        $this->assertSame(7, $otherColumnTodo->fresh()->kanban_order);
    }

    public function test_reorder_gracefully_noops_when_kanban_order_column_missing(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $todo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'kanban_order' => 1,
        ]);

        try {
            Todo::refreshKanbanOrderColumnCache(false);

            $response = $this->actingAs($user)
                ->from('/dashboard')
                ->post(route('todos.reorder'), [
                    'column' => 'q1',
                    'todo_ids' => [$todo->id],
                ]);

            $response->assertStatus(200);
            $response->assertJson(['message' => 'Todo order updated successfully']);

            $this->assertSame(1, $todo->fresh()->kanban_order);
        } finally {
            Todo::refreshKanbanOrderColumnCache(null);
        }
    }
}
