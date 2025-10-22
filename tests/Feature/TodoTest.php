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
        /** @var User $user */
        $user = User::factory()->create();
        Todo::factory()->asTask()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('todos.index'));

        $response->assertStatus(200);
    }

    public function test_user_can_create_note_without_priority(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $payload = [
            'title' => 'Personal Note',
            'description' => 'Remember to hydrate',
            'type' => 'note',
        ];

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post(route('todos.store'), array_merge($payload, ['_token' => 'test-token']));

        $response->assertRedirect();

        $this->assertDatabaseHas('todos', [
            'title' => 'Personal Note',
            'type' => 'note',
            'priority' => null,
            'user_id' => $user->id,
        ]);
    }

    public function test_note_priority_is_reset_on_update(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $note = Todo::factory()->asNote()->create(['user_id' => $user->id]);

        $payload = [
            'title' => 'Updated Note',
            'description' => 'New body',
            'priority' => 'urgent',
            'type' => 'note',
        ];

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->put(route('todos.update', $note), array_merge($payload, ['_token' => 'test-token']));

        $response->assertRedirect();

        $this->assertDatabaseHas('todos', [
            'id' => $note->id,
            'title' => 'Updated Note',
            'type' => 'note',
            'priority' => null,
        ]);
    }

    public function test_user_can_create_todo(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $todoData = [
            'title' => 'Test Todo',
            'description' => 'Test Description',
            'priority' => 'high',
            'user_id' => $user->id,
            'type' => 'todo',
        ];

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post(route('todos.store'), array_merge($todoData, ['_token' => 'test-token']));

        $response->assertRedirect();
        $this->assertDatabaseHas('todos', array_merge($todoData, ['priority' => 'high']));
    }

    public function test_user_can_view_todo(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->asTask()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('todos.show', $todo));

        $response->assertStatus(200);
        $response->assertSee($todo->title);
    }

    public function test_user_can_update_todo(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->asTask()->create(['user_id' => $user->id]);

        $updatedData = [
            'title' => 'Updated Title',
            'description' => 'Updated Description',
            'is_completed' => true,
        ];

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->put(route('todos.update', $todo), array_merge($updatedData, ['_token' => 'test-token']));

        $response->assertRedirect();
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'title' => 'Updated Title',
            'description' => 'Updated Description',
            'is_completed' => 1,
            'type' => 'todo',
        ]);
    }

    public function test_user_can_create_todo_with_checklist_items(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $payload = [
            'title' => 'Checklist Todo',
            'description' => 'Todo with checklist items',
            'priority' => 'medium',
            'checklist_items' => [
                ['title' => 'Item A', 'is_completed' => false],
                ['title' => 'Item B', 'is_completed' => true],
            ],
            'type' => 'todo',
        ];

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post(route('todos.store'), array_merge($payload, ['_token' => 'test-token']));
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
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->asTask()->create(['user_id' => $user->id]);

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
            'type' => 'todo',
        ];

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->put(route('todos.update', $todo), array_merge($payload, ['_token' => 'test-token']));

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
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->asTask()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->delete(route('todos.destroy', $todo), ['_token' => 'test-token']);

        $response->assertRedirect();
        $this->assertSoftDeleted('todos', ['id' => $todo->id]);
    }

    public function test_user_can_toggle_todo_completion(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'priority' => 'high',
            'is_completed' => false,
        ]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post(route('todos.toggle', $todo), ['_token' => 'test-token']);

        $response->assertRedirect();
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'is_completed' => true,
            'priority' => null,
        ]);
    }

    public function test_archiving_completed_todos_clears_priority(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $completedTodo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'priority' => 'urgent',
            'is_completed' => true,
            'completed_at' => now()->subDay(),
            'archived' => false,
        ]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post(route('todos.archive-completed'), ['_token' => 'test-token']);

        $response->assertRedirect();

        $this->assertDatabaseHas('todos', [
            'id' => $completedTodo->id,
            'archived' => true,
            'priority' => null,
        ]);
    }

    public function test_user_can_update_eisenhower_placement(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'priority' => 'medium',
            'importance' => 'low',
        ]);

        $response = $this->actingAs($user)
            ->from('/dashboard')
            ->withSession(['_token' => 'test-token'])
            ->post(route('todos.update-eisenhower', $todo), [
                '_token' => 'test-token',
                'importance' => 'high',
                'priority' => 'urgent',
            ]);

        $response->assertRedirect('/dashboard');

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'importance' => 'high',
            'priority' => 'urgent',
        ]);
    }

    public function test_eisenhower_update_requires_task_type(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $note = Todo::factory()->asNote()->create([
            'user_id' => $user->id,
        ]);
        $originalImportance = $note->importance;

        $response = $this->actingAs($user)
            ->from('/dashboard')
            ->withSession(['_token' => 'test-token'])
            ->post(route('todos.update-eisenhower', $note), [
                '_token' => 'test-token',
                'importance' => 'high',
                'priority' => 'urgent',
            ]);

        $response->assertRedirect('/dashboard');
        $response->assertSessionHas('error');

        $this->assertDatabaseHas('todos', [
            'id' => $note->id,
            'priority' => null,
            'importance' => $originalImportance,
        ]);
    }

    public function test_eisenhower_update_validates_input(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'importance' => 'low',
            'priority' => 'low',
        ]);

        $response = $this->actingAs($user)
            ->from('/dashboard')
            ->withSession(['_token' => 'test-token'])
            ->post(route('todos.update-eisenhower', $todo), [
                '_token' => 'test-token',
                'importance' => 'mega-important',
                'priority' => 'mega-urgent',
            ]);

        $response->assertRedirect('/dashboard');
        $response->assertSessionHasErrors(['importance', 'priority']);

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'importance' => 'low',
            'priority' => 'low',
        ]);
    }

    public function test_todo_creation_requires_title(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post(route('todos.store'), [
                'description' => 'Test Description',
                'user_id' => $user->id,
                '_token' => 'test-token',
            ]);

        $response->assertSessionHasErrors('title');
    }

    public function test_todo_priority_validation(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Test valid priorities
        $validPriorities = ['low', 'medium', 'high', 'urgent'];
        foreach ($validPriorities as $priority) {
            $response = $this->actingAs($user)
                ->withSession(['_token' => 'test-token'])
                ->post(route('todos.store'), [
                    'title' => 'Test Todo',
                    'description' => 'Test Description',
                    'priority' => $priority,
                    'user_id' => $user->id,
                    'type' => 'todo',
                    '_token' => 'test-token',
                ]);

            $response->assertRedirect();
            $this->assertDatabaseHas('todos', [
                'title' => 'Test Todo',
                'priority' => $priority,
                'user_id' => $user->id,
                'type' => 'todo',
            ]);
        }

        // Test invalid priority
        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post(route('todos.store'), [
                'title' => 'Test Todo',
                'description' => 'Test Description',
                'priority' => 'invalid',
                'user_id' => $user->id,
                'type' => 'todo',
                '_token' => 'test-token',
            ]);

        $response->assertSessionHasErrors('priority');
    }

    public function test_todo_defaults_to_medium_priority(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post(route('todos.store'), [
                'title' => 'Test Todo',
                'description' => 'Test Description',
                'user_id' => $user->id,
                '_token' => 'test-token',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('todos', [
            'title' => 'Test Todo',
            'priority' => 'medium', // Should default to medium
            'user_id' => $user->id,
        ]);
    }

    public function test_priority_is_normalized_and_color_resolved(): void
    {
        $todo = Todo::factory()->asTask()->create([
            'priority' => 'HIGH',
        ]);

        $this->assertSame('high', $todo->priority);
        $this->assertSame('#EF4444', $todo->priority_color);

        $todo->priority = 'Urgent';
        $todo->save();
        $todo->refresh();

        $this->assertSame('urgent', $todo->priority);
        $this->assertSame('#DC2626', $todo->priority_color);
    }
}
