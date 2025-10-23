<?php

namespace Tests\Feature\Api;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TodoApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_marking_todo_completed_via_api_clears_priority(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'is_completed' => false,
            'completed_at' => null,
        ]);

        Sanctum::actingAs($user);

        $response = $this->putJson(route('api.todos.update', $todo), [
            'title' => 'Updated API Todo',
            'description' => 'Updated via API test',
            'type' => Todo::TYPE_TODO,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'is_completed' => true,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.id', $todo->id);
        $response->assertJsonPath('data.is_completed', true);
        $response->assertJsonPath('data.priority', null);
        $response->assertJsonPath('data.importance', null);

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'is_completed' => true,
            'priority' => null,
            'importance' => null,
        ]);
    }

    public function test_toggling_todo_via_api_clears_priority_when_completed(): void
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'is_completed' => false,
            'completed_at' => null,
        ]);

        Sanctum::actingAs($user);

        $response = $this->patchJson(route('api.todos.toggle', $todo));

        $response->assertOk();
        $response->assertJsonPath('data.id', $todo->id);
        $response->assertJsonPath('data.is_completed', true);
        $response->assertJsonPath('data.priority', null);
        $response->assertJsonPath('data.importance', null);

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'is_completed' => true,
            'priority' => null,
            'importance' => null,
        ]);
    }
}
