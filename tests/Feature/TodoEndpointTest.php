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

        $response = $this->actingAs($user)->get('/todos');

        $response->assertStatus(200);
        $this->assertStringContainsString('<!DOCTYPE html>', $response->getContent());
    }

    public function test_todos_create_endpoint_works(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/todos/create');

        $response->assertStatus(200);
        $this->assertStringContainsString('<!DOCTYPE html>', $response->getContent());
    }

    public function test_todos_store_endpoint_works(): void
    {
        $user = User::factory()->create();

        $todoData = [
            'title' => 'Test Todo',
            'description' => 'Test Description',
            'priority' => 'high',
        ];

        $response = $this->actingAs($user)->post('/todos', $todoData);

        $response->assertStatus(302);
        $this->assertDatabaseHas('todos', array_merge($todoData, ['user_id' => $user->id]));
    }

    public function test_todos_show_endpoint_works(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get("/todos/{$todo->id}");

        $response->assertStatus(200);
        $this->assertStringContainsString('<!DOCTYPE html>', $response->getContent());
    }

    public function test_todos_edit_endpoint_works(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get("/todos/{$todo->id}/edit");

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

        $response = $this->actingAs($user)->put("/todos/{$todo->id}", $updatedData);

        $response->assertStatus(302);
        $this->assertDatabaseHas('todos', array_merge(['id' => $todo->id], $updatedData));
    }

    public function test_todos_delete_endpoint_works(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->delete("/todos/{$todo->id}");

        $response->assertStatus(302);
        $this->assertSoftDeleted('todos', ['id' => $todo->id]);
    }

    public function test_todos_toggle_endpoint_works(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id, 'is_completed' => false]);

        $response = $this->actingAs($user)->post("/todos/{$todo->id}/toggle");

        $response->assertStatus(302);
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'is_completed' => true,
        ]);
    }
}
