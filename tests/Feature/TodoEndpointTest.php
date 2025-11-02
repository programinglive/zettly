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
        /** @var User $user */
        $user = User::factory()->create();
        Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get('/todos');

        $response->assertStatus(200);
        $this->assertStringContainsString('<!DOCTYPE html>', $response->getContent());
    }

    public function test_todos_create_endpoint_works(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/todos/create');

        $response->assertStatus(200);
        $this->assertStringContainsString('<!DOCTYPE html>', $response->getContent());
    }

    public function test_todos_store_endpoint_works(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $todoData = [
            'title' => 'Test Todo',
            'description' => 'Test Description',
            'due_date' => now()->addDay()->toDateString(),
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
        ];

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post('/todos', array_merge($todoData, ['_token' => 'test-token']));

        $response->assertStatus(302);

        $this->assertDatabaseHas('todos', [
            'title' => $todoData['title'],
            'description' => $todoData['description'],
            'priority' => $todoData['priority'],
            'importance' => $todoData['importance'],
            'user_id' => $user->id,
        ]);

    }

    public function test_todos_show_endpoint_works(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get("/todos/{$todo->id}");

        $response->assertStatus(200);
        $this->assertStringContainsString('<!DOCTYPE html>', $response->getContent());
    }

    public function test_todos_edit_endpoint_works(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get("/todos/{$todo->id}/edit");

        $response->assertStatus(200);
        $this->assertStringContainsString('<!DOCTYPE html>', $response->getContent());
    }

    public function test_todos_update_endpoint_works(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $updatedData = [
            'title' => 'Updated Title',
            'description' => 'Updated Description',
            'is_completed' => true,
            'reason' => 'Finished via endpoint test',
        ];

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->put("/todos/{$todo->id}", array_merge($updatedData, ['_token' => 'test-token']));

        $response->assertStatus(302);
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'title' => $updatedData['title'],
            'description' => $updatedData['description'],
            'is_completed' => $updatedData['is_completed'],
        ]);
    }

    public function test_todos_delete_endpoint_works(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->withHeaders(['X-CSRF-TOKEN' => 'test-token'])
            ->delete("/todos/{$todo->id}", ['_token' => 'test-token']);

        $response->assertStatus(302);
        $this->assertSoftDeleted('todos', ['id' => $todo->id]);
    }

    public function test_todos_toggle_endpoint_works(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $todo = Todo::factory()->create(['user_id' => $user->id, 'is_completed' => false]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->withHeaders(['X-CSRF-TOKEN' => 'test-token'])
            ->post("/todos/{$todo->id}/toggle", [
                '_token' => 'test-token',
                'reason' => 'Finished via endpoint test',
            ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'is_completed' => true,
        ]);
    }
}
