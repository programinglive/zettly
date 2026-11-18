<?php

namespace Tests\Feature\CodingAgent;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\TodoDependency;
use App\Models\User;
use App\Models\UserPrioritySetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodingAgentDependencyGuardAndPriorityTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create([
            'email' => 'owner@example.com',
            'email_verified_at' => now(),
        ]);

        config([
            'coding_agent.enabled' => true,
            'coding_agent.owner_user_id' => $this->owner->id,
            'coding_agent.owner_email' => 'owner@example.com',
            'coding_agent.models' => ['qwen3-5-397b-a17b:free'],
            'coding_agent.default_model' => 'qwen3-5-397b-a17b:free',
            'coding_agent.repositories' => [
                'zettly' => [
                    'slug' => 'zettly',
                    'remote' => 'programinglive/zettly',
                    'base' => 'main',
                ],
            ],
        ]);
    }

    public function test_blocked_todo_cannot_be_dispatched_even_when_p0(): void
    {
        $blocker = Todo::factory()->for($this->owner)->create([
            'title' => 'Blocker task',
            'is_completed' => false,
        ]);
        $target = Todo::factory()->for($this->owner)->create([
            'title' => 'Target task',
            'is_completed' => false,
            'is_p0' => true,
            'p0_reason' => 'Urgent prod issue',
            'p0_since' => now(),
            'p0_expires_at' => now()->addHours(12),
        ]);

        TodoDependency::create([
            'user_id' => $this->owner->id,
            'todo_id' => $target->id,
            'depends_on_todo_id' => $blocker->id,
            'source' => 'manual',
        ]);

        $response = $this->actingAs($this->owner)->postJson('/agent/jobs', [
            'todo_id' => $target->id,
            'repository' => 'zettly',
            'instruction' => 'Implement target task',
            'client_request_id' => 'req-blocked-1',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'todo_blocked_by_dependencies')
            ->assertJsonPath('blocking_todo_ids.0', $blocker->id);

        $this->assertDatabaseCount('coding_agent_jobs', 0);
    }

    public function test_associative_todo_relationship_does_not_block_dispatch(): void
    {
        $related = Todo::factory()->for($this->owner)->create(['is_completed' => false]);
        $target = Todo::factory()->for($this->owner)->create(['is_completed' => false]);

        $target->relatedTodos()->attach($related->id);

        $response = $this->actingAs($this->owner)->post('/agent/jobs', [
            'todo_id' => $target->id,
            'repository' => 'zettly',
            'instruction' => 'Implement target task',
            'client_request_id' => 'req-assoc-1',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('coding_agent_jobs', [
            'todo_id' => $target->id,
            'status' => 'queued',
        ]);
    }

    public function test_worker_claim_skips_queued_job_that_became_blocked_and_resumes_when_unblocked(): void
    {
        $blocker = Todo::factory()->for($this->owner)->create(['is_completed' => false]);
        $target = Todo::factory()->for($this->owner)->create(['is_completed' => false]);

        $job = CodingAgentJob::create([
            'user_id' => $this->owner->id,
            'todo_id' => $target->id,
            'repository' => 'zettly',
            'instruction' => 'Implement target task',
            'client_request_id' => 'req-become-blocked-1',
            'status' => 'queued',
            'model' => 'qwen3-5-397b-a17b:free',
        ]);

        TodoDependency::create([
            'user_id' => $this->owner->id,
            'todo_id' => $target->id,
            'depends_on_todo_id' => $blocker->id,
            'source' => 'manual',
        ]);

        $token = $this->owner->createToken('worker', ['coding-agent:worker'])->plainTextToken;

        // While blocked, claim returns 204 and leaves the job queued (history preserved).
        $this->withToken($token)
            ->postJson('/api/v1/coding-agent/claim')
            ->assertNoContent();

        $this->assertSame('queued', $job->fresh()->status);

        // Once blocker is completed, claim succeeds.
        $blocker->update(['is_completed' => true]);

        $this->withToken($token)
            ->postJson('/api/v1/coding-agent/claim')
            ->assertOk()
            ->assertJsonPath('data.id', $job->id);

        $this->assertSame('running', $job->fresh()->status);
    }

    public function test_agent_jobs_index_orders_todos_using_canonical_priority_engine(): void
    {
        UserPrioritySetting::create([
            'user_id' => $this->owner->id,
            'require_focus' => false,
            'require_estimate' => false,
        ]);

        $low = Todo::factory()->for($this->owner)->create([
            'title' => 'Alpha low task',
            'type' => Todo::TYPE_TODO,
            'is_completed' => false,
            'archived' => false,
            'priority' => Todo::PRIORITY_NOT_URGENT,
            'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
            'due_date' => null,
            'queue_state' => Todo::QUEUE_BACKLOG,
        ]);
        $q1 = Todo::factory()->for($this->owner)->create([
            'title' => 'Zulu Q1 task',
            'type' => Todo::TYPE_TODO,
            'is_completed' => false,
            'archived' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'due_date' => null,
            'queue_state' => Todo::QUEUE_BACKLOG,
        ]);
        $p0 = Todo::factory()->for($this->owner)->create([
            'title' => 'Middle P0 task',
            'type' => Todo::TYPE_TODO,
            'is_completed' => false,
            'archived' => false,
            'due_date' => null,
            'is_p0' => true,
            'p0_reason' => 'Outage',
            'p0_since' => now(),
            'p0_expires_at' => now()->addHours(12),
            'queue_state' => Todo::QUEUE_BACKLOG,
        ]);

        $response = $this->actingAs($this->owner)->get('/agent/jobs');

        $response->assertOk();
        $todos = $response->viewData('page')['props']['todos'];
        $ids = array_column($todos, 'id');

        $this->assertSame([$p0->id, $q1->id, $low->id], $ids);
        $this->assertTrue($todos[0]['executable']);
        $this->assertNotEmpty($todos[0]['rank_explanation']);
    }
}
