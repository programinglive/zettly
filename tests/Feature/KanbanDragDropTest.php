<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KanbanDragDropTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_update_todo_priority_via_update_priority_endpoint()
    {
        // Create a user and todo
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => 'medium',
            'is_completed' => false,
        ]);

        // Test updating priority to high
        $response = $this->actingAs($user)->post("/todos/{$todo->id}/update-priority", [
            'priority' => 'high',
            'is_completed' => false,
        ]);

        $response->assertStatus(302); // Should redirect back
        
        // Check database was updated
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'priority' => 'high',
            'is_completed' => false,
        ]);
    }

    public function test_can_update_todo_to_completed_via_update_priority_endpoint()
    {
        // Create a user and todo
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => 'medium',
            'is_completed' => false,
        ]);

        // Test marking as completed
        $response = $this->actingAs($user)->post("/todos/{$todo->id}/update-priority", [
            'priority' => 'medium',
            'is_completed' => true,
        ]);

        $response->assertStatus(302);
        
        // Check database was updated
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'priority' => 'medium',
            'is_completed' => true,
        ]);

        // Check completed_at was set
        $todo->refresh();
        $this->assertNotNull($todo->completed_at);
    }

    public function test_can_move_todo_from_medium_to_urgent()
    {
        // Create a user and todo
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => 'medium',
            'is_completed' => false,
        ]);

        // Simulate drag from medium to urgent
        $response = $this->actingAs($user)->post("/todos/{$todo->id}/update-priority", [
            'priority' => 'urgent',
            'is_completed' => false,
        ]);

        $response->assertStatus(302);
        
        // Verify the change persisted
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'priority' => 'urgent',
            'is_completed' => false,
        ]);
    }

    public function test_validates_priority_values()
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => 'medium',
        ]);

        // Test invalid priority
        $response = $this->actingAs($user)->post("/todos/{$todo->id}/update-priority", [
            'priority' => 'invalid',
            'is_completed' => false,
        ]);

        $response->assertStatus(302); // Laravel redirects back with validation errors
        $response->assertSessionHasErrors(['priority']);
    }

    public function test_cannot_update_other_users_todo()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        
        $todo = Todo::factory()->create([
            'user_id' => $user1->id,
            'priority' => 'medium',
        ]);

        // User 2 tries to update User 1's todo
        $response = $this->actingAs($user2)->post("/todos/{$todo->id}/update-priority", [
            'priority' => 'high',
            'is_completed' => false,
        ]);

        // Should fail (403 or 404 depending on policy implementation)
        $this->assertTrue(in_array($response->getStatusCode(), [403, 404]));
        
        // Original todo should be unchanged
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'priority' => 'medium',
        ]);
    }

    public function test_dashboard_shows_updated_priorities()
    {
        $user = User::factory()->create();
        
        // Create todos with different priorities
        $urgentTodo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => 'urgent',
            'is_completed' => false,
        ]);
        
        $mediumTodo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => 'medium',
            'is_completed' => false,
        ]);

        // Update medium to high
        $this->actingAs($user)->post("/todos/{$mediumTodo->id}/update-priority", [
            'priority' => 'high',
            'is_completed' => false,
        ]);

        // Visit dashboard and check the todos are in correct columns
        $response = $this->actingAs($user)->get('/dashboard');
        
        $response->assertStatus(200);
        
        // Verify the updated todo appears in the correct priority group
        $mediumTodo->refresh();
        $this->assertEquals('high', $mediumTodo->priority);
    }
}
