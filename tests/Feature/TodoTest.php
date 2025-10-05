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

        $response = $this->get(route('todos.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Todos/Index')
            ->has('todos')
        );
    }

    public function test_user_can_create_todo(): void
    {
        $user = User::factory()->create();

        $todoData = [
            'title' => 'Test Todo',
            'description' => 'Test Description',
            'user_id' => $user->id,
        ];

        $response = $this->post(route('todos.store'), $todoData);

        $response->assertRedirect(route('todos.index'));
        $this->assertDatabaseHas('todos', $todoData);
    }

    public function test_user_can_view_todo(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->get(route('todos.show', $todo));

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

        $response = $this->put(route('todos.update', $todo), $updatedData);

        $response->assertRedirect(route('todos.index'));
        $this->assertDatabaseHas('todos', array_merge(['id' => $todo->id], $updatedData));
    }

    public function test_user_can_delete_todo(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->delete(route('todos.destroy', $todo));

        $response->assertRedirect(route('todos.index'));
        $this->assertDatabaseMissing('todos', ['id' => $todo->id]);
    }

    public function test_user_can_toggle_todo_completion(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id, 'is_completed' => false]);

        $response = $this->post(route('todos.toggle', $todo));

        $response->assertRedirect(route('todos.index'));
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'is_completed' => true,
        ]);
    }

    public function test_todo_creation_requires_title(): void
    {
        $user = User::factory()->create();

        $response = $this->post(route('todos.store'), [
            'description' => 'Test Description',
            'user_id' => $user->id,
        ]);

        $response->assertSessionHasErrors('title');
    }

    public function test_todo_creation_requires_valid_user(): void
    {
        $response = $this->post(route('todos.store'), [
            'title' => 'Test Todo',
            'description' => 'Test Description',
            'user_id' => 999, // Non-existent user
        ]);

        $response->assertSessionHasErrors('user_id');
    }
}
