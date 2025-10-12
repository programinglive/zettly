<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TodoTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_todos_list(): void
    {
        $user = User::factory()->create();
        Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('todos.index'));

        $response->assertStatus(200);
    }

    public function test_user_can_create_todo(): void
    {
        $user = User::factory()->create();

        $todoData = [
            'title' => 'Test Todo',
            'description' => 'Test Description',
            'priority' => 'high',
            'user_id' => $user->id,
        ];

        $response = $this->actingAs($user)->post(route('todos.store'), $todoData);

        $response->assertRedirect();
        $this->assertDatabaseHas('todos', $todoData);
    }

    public function test_user_can_view_todo(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('todos.show', $todo));

        $response->assertStatus(200);
        $response->assertSee($todo->title);
    }

    public function test_user_can_update_todo(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $updatedData = [
            'title' => 'Updated Title',
            'description' => 'Updated Description',
            'is_completed' => true,
        ];

        $response = $this->actingAs($user)->put(route('todos.update', $todo), $updatedData);

        $response->assertRedirect();
        $this->assertDatabaseHas('todos', array_merge(['id' => $todo->id], $updatedData));
    }

    public function test_user_can_create_todo_with_checklist_items(): void
    {
        $user = User::factory()->create();

        $payload = [
            'title' => 'Checklist Todo',
            'description' => 'Todo with checklist items',
            'priority' => 'medium',
            'checklist_items' => [
                ['title' => 'Item A', 'is_completed' => false],
                ['title' => 'Item B', 'is_completed' => true],
            ],
        ];

        $response = $this->actingAs($user)->post(route('todos.store'), $payload);
        $response->assertRedirect();

        $todo = Todo::where('title', 'Checklist Todo')->first();
        $this->assertNotNull($todo);
        $this->assertDatabaseHas('todo_checklist_items', [
            'todo_id' => $todo->id,
            'title' => 'Item A',
            'is_completed' => false,
            'position' => 0,
        ]);
        $this->assertDatabaseHas('todo_checklist_items', [
            'todo_id' => $todo->id,
            'title' => 'Item B',
            'is_completed' => true,
            'position' => 1,
        ]);
        $this->assertEquals(2, $todo->checklistItems()->count());
    }

    public function test_user_can_update_todo_checklist_items(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $existingItem = $todo->checklistItems()->create([
            'title' => 'Existing item',
            'is_completed' => false,
            'position' => 0,
        ]);
        $itemToRemove = $todo->checklistItems()->create([
            'title' => 'Remove me',
            'is_completed' => false,
            'position' => 1,
        ]);

        $payload = [
            'title' => 'Updated Title',
            'description' => 'Updated Description',
            'priority' => 'high',
            'checklist_items' => [
                ['id' => $existingItem->id, 'title' => 'Existing item updated', 'is_completed' => true],
                ['title' => 'Brand new item', 'is_completed' => false],
            ],
        ];

        $response = $this->actingAs($user)->put(route('todos.update', $todo), $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('todo_checklist_items', [
            'id' => $existingItem->id,
            'title' => 'Existing item updated',
            'is_completed' => true,
            'position' => 0,
        ]);

        $this->assertDatabaseHas('todo_checklist_items', [
            'todo_id' => $todo->id,
            'title' => 'Brand new item',
            'is_completed' => false,
            'position' => 1,
        ]);

        $this->assertDatabaseMissing('todo_checklist_items', [
            'id' => $itemToRemove->id,
        ]);
    }

    public function test_user_can_delete_todo(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->delete(route('todos.destroy', $todo));

        $response->assertRedirect();
        $this->assertSoftDeleted('todos', ['id' => $todo->id]);
    }

    public function test_user_can_toggle_todo_completion(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id, 'is_completed' => false]);

        $response = $this->actingAs($user)->post(route('todos.toggle', $todo));

        $response->assertRedirect();
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'is_completed' => true,
        ]);
    }

    public function test_todo_creation_requires_title(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('todos.store'), [
            'description' => 'Test Description',
            'user_id' => $user->id,
        ]);

        $response->assertSessionHasErrors('title');
    }

    public function test_todo_priority_validation(): void
    {
        $user = User::factory()->create();

        // Test valid priorities
        $validPriorities = ['low', 'medium', 'high', 'urgent'];
        foreach ($validPriorities as $priority) {
            $response = $this->actingAs($user)->post(route('todos.store'), [
                'title' => 'Test Todo',
                'description' => 'Test Description',
                'priority' => $priority,
                'user_id' => $user->id,
            ]);

            $response->assertRedirect();
            $this->assertDatabaseHas('todos', [
                'title' => 'Test Todo',
                'priority' => $priority,
                'user_id' => $user->id,
            ]);
        }

        // Test invalid priority
        $response = $this->actingAs($user)->post(route('todos.store'), [
            'title' => 'Test Todo',
            'description' => 'Test Description',
            'priority' => 'invalid',
            'user_id' => $user->id,
        ]);

        $response->assertSessionHasErrors('priority');
    }

    public function test_todo_defaults_to_medium_priority(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('todos.store'), [
            'title' => 'Test Todo',
            'description' => 'Test Description',
            'user_id' => $user->id,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('todos', [
            'title' => 'Test Todo',
            'priority' => 'medium', // Should default to medium
            'user_id' => $user->id,
        ]);
    }
}
