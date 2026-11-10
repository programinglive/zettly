<?php

namespace Tests\Feature;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodingAgentJobWebTest extends TestCase
{
    use RefreshDatabase;

    private function owner(): User
    {
        $owner = User::factory()->create(['email' => 'mahatma.mahardhika@programinglive.com']);
        config()->set('coding_agent.enabled', true);
        config()->set('coding_agent.owner_user_id', $owner->id);
        config()->set('coding_agent.owner_email', $owner->email);
        config()->set('coding_agent.repositories', ['zettly' => 'programinglive/zettly']);

        return $owner;
    }

    public function test_owner_creates_one_job_for_retried_request(): void
    {
        $owner = $this->owner();
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);
        $payload = ['todo_id' => $todo->id, 'repository' => 'zettly', 'instruction' => 'Fix login', 'client_request_id' => 'mobile-1'];

        $this->actingAs($owner)->post('/agent/jobs', $payload)->assertRedirect();
        $this->actingAs($owner)->post('/agent/jobs', $payload)->assertRedirect();

        $this->assertSame(1, CodingAgentJob::count());
        $this->assertDatabaseHas('coding_agent_jobs', ['user_id' => $owner->id, 'todo_id' => $todo->id, 'status' => 'queued']);
    }

    public function test_foreign_todo_is_not_found(): void
    {
        $owner = $this->owner();
        $foreignTodo = Todo::factory()->asTask()->create(['user_id' => User::factory()->create()->id]);

        $this->actingAs($owner)->post('/agent/jobs', [
            'todo_id' => $foreignTodo->id, 'repository' => 'zettly', 'instruction' => 'Fix login', 'client_request_id' => 'mobile-2',
        ])->assertNotFound();
        $this->assertSame(0, CodingAgentJob::count());
    }

    public function test_unknown_repository_is_rejected(): void
    {
        $owner = $this->owner();
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);

        $this->actingAs($owner)->postJson('/agent/jobs', [
            'todo_id' => $todo->id, 'repository' => 'unknown', 'instruction' => 'Fix login', 'client_request_id' => 'mobile-3',
        ])->assertUnprocessable()->assertJsonValidationErrors('repository');
        $this->assertSame(0, CodingAgentJob::count());
    }

    public function test_other_user_cannot_control_job(): void
    {
        $owner = $this->owner();
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);
        $job = CodingAgentJob::create(['user_id' => $owner->id, 'todo_id' => $todo->id, 'repository' => 'zettly', 'instruction' => 'Fix login', 'client_request_id' => 'mobile-4']);

        $this->actingAs(User::factory()->create())->postJson("/agent/jobs/{$job->id}/cancel")->assertForbidden();
        $this->assertSame('queued', $job->fresh()->status);
    }

    public function test_terminal_job_rejects_new_instruction(): void
    {
        $owner = $this->owner();
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);
        $job = CodingAgentJob::create(['user_id' => $owner->id, 'todo_id' => $todo->id, 'repository' => 'zettly', 'instruction' => 'Fix login', 'client_request_id' => 'mobile-5', 'status' => 'completed']);

        $this->actingAs($owner)->postJson("/agent/jobs/{$job->id}/instructions", ['instruction' => 'Try again'])->assertStatus(409);
    }

    public function test_active_job_records_follow_up_instruction(): void
    {
        $owner = $this->owner();
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);
        $job = CodingAgentJob::create(['user_id' => $owner->id, 'todo_id' => $todo->id, 'repository' => 'zettly', 'instruction' => 'Fix login', 'client_request_id' => 'mobile-6', 'status' => 'running']);

        $this->actingAs($owner)->post("/agent/jobs/{$job->id}/instructions", ['instruction' => 'Also check expired sessions'])->assertRedirect();
        $this->assertDatabaseHas('coding_agent_job_events', [
            'coding_agent_job_id' => $job->id,
            'kind' => 'instruction',
            'detail' => 'Also check expired sessions',
        ]);
    }

    public function test_reused_request_id_with_changed_instruction_is_rejected(): void
    {
        $owner = $this->owner();
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);
        $payload = ['todo_id' => $todo->id, 'repository' => 'zettly', 'instruction' => 'Fix login', 'client_request_id' => 'mobile-7'];
        $this->actingAs($owner)->post('/agent/jobs', $payload)->assertRedirect();

        $this->actingAs($owner)->postJson('/agent/jobs', [...$payload, 'instruction' => 'Delete accounts'])->assertStatus(409);
        $this->assertSame('Fix login', CodingAgentJob::firstOrFail()->instruction);
    }

    public function test_owner_can_resume_paused_job_for_a_fresh_lease(): void
    {
        $owner = $this->owner();
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);
        $job = CodingAgentJob::create([
            'user_id' => $owner->id, 'todo_id' => $todo->id, 'repository' => 'zettly',
            'instruction' => 'Fix login', 'client_request_id' => 'mobile-resume', 'status' => 'paused',
            'lease_token_hash' => hash('sha256', 'old'), 'leased_until' => now()->addMinute(),
        ]);

        $this->actingAs($owner)->post("/agent/jobs/{$job->id}/resume")->assertRedirect();
        $this->assertSame('queued', $job->fresh()->status);
        $this->assertNull($job->fresh()->lease_token_hash);
    }

    public function test_job_stores_model_field_and_defaults_to_configured_model(): void
    {
        $owner = $this->owner();
        config()->set('coding_agent.default_model', 'agnes-3-0-flash:free');
        config()->set('coding_agent.models', ['agnes-3-0-flash:free', 'gpt-4o-mini:free']);
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);

        // No model specified → uses default
        $this->actingAs($owner)->post('/agent/jobs', [
            'todo_id' => $todo->id, 'repository' => 'zettly', 'instruction' => 'Fix login',
            'client_request_id' => 'mobile-model-1',
        ])->assertRedirect();
        $this->assertDatabaseHas('coding_agent_jobs', ['client_request_id' => 'mobile-model-1', 'model' => 'agnes-3-0-flash:free']);

        // Explicit model from allowed list
        $this->actingAs($owner)->post('/agent/jobs', [
            'todo_id' => $todo->id, 'repository' => 'zettly', 'instruction' => 'Fix login',
            'client_request_id' => 'mobile-model-2', 'model' => 'gpt-4o-mini:free',
        ])->assertRedirect();
        $this->assertDatabaseHas('coding_agent_jobs', ['client_request_id' => 'mobile-model-2', 'model' => 'gpt-4o-mini:free']);
    }

    public function test_unknown_model_is_rejected(): void
    {
        $owner = $this->owner();
        config()->set('coding_agent.models', ['agnes-3-0-flash:free']);
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);

        $this->actingAs($owner)->postJson('/agent/jobs', [
            'todo_id' => $todo->id, 'repository' => 'zettly', 'instruction' => 'Fix login',
            'client_request_id' => 'mobile-model-3', 'model' => 'evil-model',
        ])->assertUnprocessable()->assertJsonValidationErrors('model');
    }

    public function test_claim_includes_model_in_job_payload(): void
    {
        $owner = $this->owner();
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);
        CodingAgentJob::create([
            'user_id' => $owner->id, 'todo_id' => $todo->id, 'repository' => 'zettly',
            'instruction' => 'Fix login', 'client_request_id' => 'mobile-claim-model',
            'model' => 'gpt-4o-mini:free',
        ]);

        $workerToken = $owner->createToken('zettly-coding-worker', ['coding-agent:worker'])->plainTextToken;

        $this->withToken($workerToken)->postJson('/api/v1/coding-agent/claim')
            ->assertOk()
            ->assertJsonPath('data.model', 'gpt-4o-mini:free');
    }
}
