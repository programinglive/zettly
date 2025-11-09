<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TodoArchiveTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

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
        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post('/todos/archive-completed', ['_token' => 'test-token']);

        $response->assertStatus(302);
        $response->assertSessionHas('success', 'Successfully archived 2 completed todos');

        // Check that completed todos are archived
        $this->assertDatabaseHas('todos', [
            'id' => $completedTodo1->id,
            'archived' => true,
        ]);
        $this->assertDatabaseHas('todos', [
            'id' => $completedTodo2->id,
            'archived' => true,
        ]);

        // Check that pending todo is not affected
        $this->assertDatabaseHas('todos', [
            'id' => $pendingTodo->id,
            'archived' => false,
        ]);
    }

    public function test_archive_requires_reason()
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'is_completed' => true,
            'archived' => false,
        ]);

        $response = $this->actingAs($user)
            ->from('/todos/'.$todo->id)
            ->post(route('todos.archive', $todo), []);

        $response->assertRedirect('/todos/'.$todo->id);
        $response->assertSessionHasErrors('reason');

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'archived' => false,
        ]);
    }

    public function test_restore_requires_reason()
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'is_completed' => true,
            'archived' => true,
            'archived_at' => now(),
        ]);

        $response = $this->actingAs($user)
            ->from('/todos/'.$todo->id)
            ->post(route('todos.restore', $todo), []);

        $response->assertRedirect('/todos/'.$todo->id);
        $response->assertSessionHasErrors('reason');

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'archived' => true,
        ]);
    }

    public function test_archive_creates_status_event_with_reason()
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'is_completed' => true,
        ]);

        $this->actingAs($user)
            ->post(route('todos.archive', $todo), ['reason' => 'Finished project']);

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'archived' => true,
        ]);

        $this->assertDatabaseHas('todo_status_events', [
            'todo_id' => $todo->id,
            'from_state' => 'completed',
            'to_state' => 'archived',
            'reason' => 'Finished project',
        ]);
    }

    public function test_restore_creates_status_event_with_reason()
    {
        $user = User::factory()->create();
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'is_completed' => true,
            'archived' => true,
            'archived_at' => now(),
        ]);

        $this->actingAs($user)
            ->post(route('todos.restore', $todo), ['reason' => 'Need to revisit']);

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'archived' => false,
        ]);

        $this->assertDatabaseHas('todo_status_events', [
            'todo_id' => $todo->id,
            'from_state' => 'archived',
            'to_state' => 'completed',
            'reason' => 'Need to revisit',
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

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post('/todos/archive-completed', ['_token' => 'test-token']);

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
        $response = $this->actingAs($user1)
            ->withSession(['_token' => 'test-token'])
            ->post('/todos/archive-completed', ['_token' => 'test-token']);

        $response->assertStatus(302);

        // Check that only user1's todo is archived
        $this->assertDatabaseHas('todos', [
            'id' => $user1CompletedTodo->id,
            'archived' => true,
        ]);
        $this->assertDatabaseHas('todos', [
            'id' => $user2CompletedTodo->id,
            'archived' => false,
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
        $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post('/todos/archive-completed', ['_token' => 'test-token']);

        // Visit dashboard
        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertStatus(200);

        // Check that only pending todo is returned by querying the database (excluding archived)
        $visibleTodos = $user->todos()->notArchived()->get();
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
            ->withSession(['_token' => 'test-token'])
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/todos/archive-completed', ['_token' => 'test-token']);

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
            ->withSession(['_token' => 'test-token'])
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/todos/archive-completed', ['_token' => 'test-token']);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'No completed todos to archive',
        ]);
    }

    public function test_unauthorized_user_cannot_archive_todos()
    {
        $response = $this->withSession(['_token' => 'test-token'])
            ->post('/todos/archive-completed', ['_token' => 'test-token']);

        $response->assertStatus(302);
        $response->assertRedirect('/login');
    }

    public function test_archived_page_shows_only_archived_todos()
    {
        $user = User::factory()->create();

        // Create archived and non-archived todos
        $archivedTodo = Todo::factory()->create([
            'user_id' => $user->id,
            'title' => 'Archived Todo',
            'is_completed' => true,
            'archived' => true,
            'archived_at' => now(),
        ]);

        $activeTodo = Todo::factory()->create([
            'user_id' => $user->id,
            'title' => 'Active Todo',
            'is_completed' => false,
            'archived' => false,
        ]);

        $response = $this->actingAs($user)->get('/todos/archived');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Todos/Archived')
            ->has('todos.data', 1)
            ->where('todos.data.0.id', $archivedTodo->id)
            ->where('todos.data.0.title', 'Archived Todo')
            ->where('todos.total', 1)
        );
    }

    public function test_archived_page_requires_authentication()
    {
        $response = $this->get('/todos/archived');

        $response->assertStatus(302);
        $response->assertRedirect('/login');
    }
}
