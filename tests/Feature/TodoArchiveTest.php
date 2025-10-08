<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TodoArchiveTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_archive_completed_todos()
    {
        // Create a user with completed and pending todos
        $user = User::factory()->create();
        
        $completedTodo1 = Todo::factory()->create([
            'user_id' => $user->id,
            'title' => 'Completed Task 1',
            'is_completed' => true,
            'priority' => null,
        ]);
        
        $completedTodo2 = Todo::factory()->create([
            'user_id' => $user->id,
            'title' => 'Completed Task 2',
            'is_completed' => true,
            'priority' => null,
        ]);
        
        $pendingTodo = Todo::factory()->create([
            'user_id' => $user->id,
            'title' => 'Pending Task',
            'is_completed' => false,
            'priority' => 'high',
        ]);

        // Archive completed todos
        $response = $this->actingAs($user)->post('/todos/archive-completed');

        $response->assertStatus(302);
        $response->assertSessionHas('success', 'Successfully archived 2 completed todos');

        // Check that completed todos are soft deleted
        $this->assertSoftDeleted('todos', ['id' => $completedTodo1->id]);
        $this->assertSoftDeleted('todos', ['id' => $completedTodo2->id]);
        
        // Check that pending todo is not affected
        $this->assertDatabaseHas('todos', [
            'id' => $pendingTodo->id,
            'deleted_at' => null,
        ]);
    }

    public function test_archive_with_no_completed_todos()
    {
        $user = User::factory()->create();
        
        // Create only pending todos
        Todo::factory()->create([
            'user_id' => $user->id,
            'is_completed' => false,
        ]);

        $response = $this->actingAs($user)->post('/todos/archive-completed');

        $response->assertStatus(302);
        $response->assertSessionHas('info', 'No completed todos to archive');
    }

    public function test_archive_only_affects_authenticated_user_todos()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        
        // Create completed todos for both users
        $user1CompletedTodo = Todo::factory()->create([
            'user_id' => $user1->id,
            'is_completed' => true,
        ]);
        
        $user2CompletedTodo = Todo::factory()->create([
            'user_id' => $user2->id,
            'is_completed' => true,
        ]);

        // User1 archives their completed todos
        $response = $this->actingAs($user1)->post('/todos/archive-completed');

        $response->assertStatus(302);

        // Check that only user1's todo is archived
        $this->assertSoftDeleted('todos', ['id' => $user1CompletedTodo->id]);
        $this->assertDatabaseHas('todos', [
            'id' => $user2CompletedTodo->id,
            'deleted_at' => null,
        ]);
    }

    public function test_archived_todos_not_shown_in_dashboard()
    {
        $user = User::factory()->create();
        
        $completedTodo = Todo::factory()->create([
            'user_id' => $user->id,
            'is_completed' => true,
        ]);
        
        $pendingTodo = Todo::factory()->create([
            'user_id' => $user->id,
            'is_completed' => false,
        ]);

        // Archive completed todos
        $this->actingAs($user)->post('/todos/archive-completed');

        // Visit dashboard
        $response = $this->actingAs($user)->get('/dashboard');
        
        $response->assertStatus(200);
        
        // Check that only pending todo is returned by querying the database
        $visibleTodos = $user->todos()->get();
        $this->assertCount(1, $visibleTodos);
        $this->assertEquals($pendingTodo->id, $visibleTodos[0]->id);
    }

    public function test_archive_endpoint_returns_json_for_api_requests()
    {
        $user = User::factory()->create();
        
        Todo::factory()->create([
            'user_id' => $user->id,
            'is_completed' => true,
        ]);
        
        Todo::factory()->create([
            'user_id' => $user->id,
            'is_completed' => true,
        ]);

        $response = $this->actingAs($user)
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/todos/archive-completed');

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Successfully archived 2 completed todos',
            'archived_count' => 2,
        ]);
    }

    public function test_archive_endpoint_handles_no_completed_todos_for_api()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/todos/archive-completed');

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'No completed todos to archive',
        ]);
    }

    public function test_unauthorized_user_cannot_archive_todos()
    {
        $response = $this->post('/todos/archive-completed');
        
        $response->assertStatus(302);
        $response->assertRedirect('/login');
    }
}
