<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
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
            'priority' => Todo::PRIORITY_NOT_URGENT,
            'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
            'is_completed' => false,
        ]);

        // Test updating priority to urgent & important
        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post("/todos/{$todo->id}/update-priority", [
                'priority' => Todo::PRIORITY_URGENT,
                'importance' => Todo::IMPORTANCE_IMPORTANT,
                'is_completed' => false,
                '_token' => 'test-token',
            ]);

        $response->assertStatus(302); // Should redirect back

        // Check database was updated
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'is_completed' => false,
        ]);
    }

    public function test_can_update_todo_to_completed_via_update_priority_endpoint()
    {
        // Create a user and todo
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => Todo::PRIORITY_NOT_URGENT,
            'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
            'is_completed' => false,
        ]);

        // Test marking as completed
        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post("/todos/{$todo->id}/update-priority", [
                'priority' => Todo::PRIORITY_NOT_URGENT,
                'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
                'is_completed' => true,
                '_token' => 'test-token',
            ]);

        $response->assertStatus(302);

        // Check database was updated - priority should be null when completed
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'priority' => null,
            'importance' => null,
            'is_completed' => true,
        ]);

        // Check completed_at was set
        $todo->refresh();
        $this->assertNotNull($todo->completed_at);
    }

    public function test_can_move_todo_from_not_urgent_to_urgent()
    {
        // Create a user and todo
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => Todo::PRIORITY_NOT_URGENT,
            'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
            'is_completed' => false,
        ]);

        // Simulate drag from not urgent to urgent
        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post("/todos/{$todo->id}/update-priority", [
                'priority' => Todo::PRIORITY_URGENT,
                'importance' => Todo::IMPORTANCE_IMPORTANT,
                'is_completed' => false,
                '_token' => 'test-token',
            ]);

        $response->assertStatus(302);

        // Verify the change persisted
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'is_completed' => false,
        ]);
    }

    public function test_validates_priority_values()
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => Todo::PRIORITY_NOT_URGENT,
            'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
        ]);

        // Test invalid priority
        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post("/todos/{$todo->id}/update-priority", [
                'priority' => 'invalid',
                'is_completed' => false,
                '_token' => 'test-token',
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
            'priority' => Todo::PRIORITY_NOT_URGENT,
            'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
        ]);

        // User 2 tries to update User 1's todo
        $response = $this->actingAs($user2)
            ->withSession(['_token' => 'test-token'])
            ->post("/todos/{$todo->id}/update-priority", [
                'priority' => Todo::PRIORITY_URGENT,
                'importance' => Todo::IMPORTANCE_IMPORTANT,
                'is_completed' => false,
                '_token' => 'test-token',
            ]);

        // Should fail (403 or 404 depending on policy implementation)
        $this->assertTrue(in_array($response->getStatusCode(), [403, 404]));

        // Original todo should be unchanged
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'priority' => Todo::PRIORITY_NOT_URGENT,
            'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
        ]);
    }

    public function test_dashboard_shows_updated_priorities()
    {
        $this->withoutVite();

        $user = User::factory()->create();

        // Create todos with different priorities
        $urgentTodo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'is_completed' => false,
        ]);

        $mediumTodo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => Todo::PRIORITY_NOT_URGENT,
            'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
            'is_completed' => false,
        ]);

        // Update not urgent & not important todo to urgent & important
        $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post("/todos/{$mediumTodo->id}/update-priority", [
                'priority' => Todo::PRIORITY_URGENT,
                'importance' => Todo::IMPORTANCE_IMPORTANT,
                'is_completed' => false,
                '_token' => 'test-token',
            ]);

        // Visit dashboard and check the todos are in correct columns
        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertStatus(200);

        $response->assertInertia(function (Assert $page) {
            $page->component('Dashboard')
                ->where('stats.important_urgent', 2)
                ->where('stats.important_not_urgent', 0)
                ->where('stats.not_important_urgent', 0)
                ->where('stats.not_important_not_urgent', 0)
                ->where('stats.completed', 0)
                ->where('stats.archived', 0);
        });

        // Verify the updated todo appears in the correct priority group
        $mediumTodo->refresh();
        $this->assertEquals(Todo::PRIORITY_URGENT, $mediumTodo->priority);
        $this->assertEquals(Todo::IMPORTANCE_IMPORTANT, $mediumTodo->importance);
    }

    public function test_completed_todo_has_null_priority()
    {
        // Create a user and todo with high priority
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'is_completed' => false,
        ]);

        // Mark as completed (simulating drag to completed column)
        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post("/todos/{$todo->id}/update-priority", [
                'is_completed' => true,
                '_token' => 'test-token',
            ]);

        $response->assertStatus(302);

        // Check database was updated
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'priority' => null,
            'importance' => null,
            'is_completed' => true,
        ]);

        // Check completed_at was set
        $todo->refresh();
        $this->assertNotNull($todo->completed_at);
        $this->assertNull($todo->priority);
        $this->assertNull($todo->importance);
    }

    public function test_uncompleting_todo_restores_default_priority()
    {
        // Create a completed todo with null priority
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'priority' => null,
            'importance' => null,
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        // Move back to medium priority (simulating drag from completed to medium-low)
        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post("/todos/{$todo->id}/update-priority", [
                'priority' => Todo::PRIORITY_NOT_URGENT,
                'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
                'is_completed' => false,
                '_token' => 'test-token',
            ]);

        $response->assertStatus(302);

        // Check database was updated
        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'priority' => Todo::PRIORITY_NOT_URGENT,
            'is_completed' => false,
        ]);

        // Check completed_at was cleared
        $todo->refresh();
        $this->assertNull($todo->completed_at);
        $this->assertEquals(Todo::PRIORITY_NOT_URGENT, $todo->priority);
        $this->assertEquals(Todo::IMPORTANCE_NOT_IMPORTANT, $todo->importance);
    }
}
