<?php

namespace Tests\Feature\Priority;

use App\Models\Focus;
use App\Models\Todo;
use App\Models\User;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PriorityWebTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->travelTo(CarbonImmutable::parse('2026-11-17 08:00', 'Asia/Jakarta'));

        UserPrioritySetting::create([
            'user_id' => $this->user->id,
            'wip_limit' => 3,
            'daily_capacity_minutes' => 240,
            'queue_size' => 5,
            'require_focus' => false,
            'require_estimate' => false,
            'max_p0' => 2,
            'main_work_strict' => true,
            'enabled' => true,
        ]);
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $response = $this->get('/priority');
        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_can_view_priority_page(): void
    {
        Todo::create([
            'user_id' => $this->user->id,
            'title' => 'Test Task for UI',
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'is_completed' => false,
            'archived' => false,
        ]);

        $response = $this->actingAs($this->user)->get('/priority');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Priority/Index')
            ->has('today')
            ->has('next')
            ->has('proposal')
            ->has('triage')
            ->has('warnings')
        );
    }

    public function test_json_request_returns_priority_props(): void
    {
        $response = $this->actingAs($this->user)->getJson('/priority');

        $response->assertOk();
        $response->assertJsonStructure([
            'date',
            'capacity',
            'main_work',
            'today',
            'next',
            'proposal',
            'triage',
            'warnings',
            'counts',
        ]);
    }

    public function test_authenticated_user_can_commit_uncommit_and_explain_via_web_routes(): void
    {
        $todo = Todo::create([
            'user_id' => $this->user->id,
            'title' => 'Web Commit Task',
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'is_completed' => false,
            'archived' => false,
        ]);

        $this->actingAs($this->user)
            ->post('/priority/plan/items', [
                'todo_id' => $todo->id,
                'reason' => 'Committing from Priority Queue UI',
            ])
            ->assertRedirect();

        $this->actingAs($this->user)
            ->getJson("/priority/explain/{$todo->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.todo.id', $todo->id);

        $this->actingAs($this->user)
            ->delete("/priority/plan/items/{$todo->id}", [
                'reason' => 'Removing from today plan in UI',
            ])
            ->assertRedirect();
    }

    public function test_web_pin_and_remove_work_in_one_click_without_manual_reason(): void
    {
        $todo = Todo::create([
            'user_id' => $this->user->id,
            'title' => 'One Click Pin Task',
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'is_completed' => false,
            'archived' => false,
        ]);

        $this->actingAs($this->user)
            ->post('/priority/plan/items', ['todo_id' => $todo->id])
            ->assertRedirect();

        $this->actingAs($this->user)
            ->delete("/priority/plan/items/{$todo->id}")
            ->assertRedirect();
    }
}
