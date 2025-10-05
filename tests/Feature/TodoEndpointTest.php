<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TodoEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_todos_index_endpoint_works(): void
    {
        $user = User::factory()->create();
        Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->get('/todos');

        $response->assertStatus(200);
        $this->assertStringContainsString('<!DOCTYPE html>', $response->getContent());
    }

    public function test_todos_create_endpoint_works(): void
    {
        $response = $this->get('/todos/create');

        $response->assertStatus(200);
        $this->assertStringContainsString('<!DOCTYPE html>', $response->getContent());
    }

    public function test_todos_store_endpoint_works(): void
    {
        $user = User::factory()->create();

        $todoData = [
            'title' => 'Test Todo',
            'description' => 'Test Description',
            'user_id' => $user->id,
        ];

        $response = $this->post('/todos', $todoData);

        $response->assertRedirect('/todos');
        $this->assertDatabaseHas('todos', $todoData);
    }

    public function test_todos_show_endpoint_works(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->get("/todos/{$todo->id}");

        $response->assertStatus(200);
        $this->assertStringContainsString('<!DOCTYPE html>', $response->getContent());
    }

    public function test_todos_edit_endpoint_works(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->get("/todos/{$todo->id}/edit");

        $response->assertStatus(200);
        $this->assertStringContainsString('<!DOCTYPE html>', $response->getContent());
    }

    public function test_todos_update_endpoint_works(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $updatedData = [
            'title' => 'Updated Title',
            'description' => 'Updated Description',
            'is_completed' => true,
        ];

        $response = $this->put("/todos/{$todo->id}", $updatedData);

        $response->assertRedirect('/todos');
        $this->assertDatabaseHas('todos', array_merge(['id' => $todo->id], $updatedData));
    }

    public function test_todos_delete_endpoint_works(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->delete("/todos/{$todo->id}");

        $response->assertRedirect('/todos');
        $this->assertDatabaseMissing('todos', ['id' => $todo->id]);
    }

    public function test_todos_toggle_endpoint_works(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id, 'is_completed' => false]);

        $response = $this->post("/todos/{$todo->id}/toggle");

        $response->assertRedirect('/todos');
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'is_completed' => true,
        ]);
    }
}
