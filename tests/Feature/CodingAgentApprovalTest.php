<?php

namespace Tests\Feature;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodingAgentApprovalTest extends TestCase
{
    use RefreshDatabase;

    private function reviewedJob(): array
    {
        $owner = User::factory()->create(['email' => 'mahatma.mahardhika@programinglive.com']);
        config()->set('coding_agent.enabled', true);
        config()->set('coding_agent.owner_user_id', $owner->id);
        config()->set('coding_agent.owner_email', $owner->email);
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);
        $job = CodingAgentJob::create([
            'user_id' => $owner->id, 'todo_id' => $todo->id, 'repository' => 'zettly',
            'instruction' => 'Fix login', 'client_request_id' => 'approve-1', 'status' => 'review',
            'branch' => 'fix/login', 'commit_sha' => str_repeat('a', 40),
            'test_summary' => 'Tests passed', 'tests_passed' => true,
            'target_environment' => 'staging',
        ]);

        return [$owner, $job];
    }

    public function test_owner_approves_exact_reviewed_sha_once(): void
    {
        [$owner, $job] = $this->reviewedJob();
        $payload = ['commit_sha' => str_repeat('a', 40), 'target_environment' => 'staging'];

        $this->actingAs($owner)->post("/agent/jobs/{$job->id}/approve-release", $payload)->assertRedirect();
        $this->actingAs($owner)->post("/agent/jobs/{$job->id}/approve-release", $payload)->assertRedirect();

        $this->assertDatabaseCount('coding_agent_approvals', 1);
        $this->assertDatabaseHas('coding_agent_approvals', [
            'coding_agent_job_id' => $job->id, 'repository' => 'zettly',
            'target_environment' => 'staging', 'commit_sha' => str_repeat('a', 40),
            'approved_by' => $owner->id,
        ]);
        $this->assertSame('release_pending', $job->fresh()->status);
    }

    public function test_changed_sha_invalidates_approval(): void
    {
        [$owner, $job] = $this->reviewedJob();
        $payload = ['commit_sha' => str_repeat('a', 40), 'target_environment' => 'staging'];
        $this->actingAs($owner)->post("/agent/jobs/{$job->id}/approve-release", $payload)->assertRedirect();
        $job->update(['commit_sha' => str_repeat('b', 40)]);

        $this->assertFalse($job->fresh()->hasCurrentApproval());
        $this->actingAs($owner)->postJson("/agent/jobs/{$job->id}/approve-release", $payload)->assertStatus(409);
    }

    public function test_worker_token_cannot_approve(): void
    {
        [$owner, $job] = $this->reviewedJob();
        $token = $owner->createToken('worker', ['coding-agent:worker'])->plainTextToken;
        $this->withToken($token)->postJson("/agent/jobs/{$job->id}/approve-release", [
            'commit_sha' => $job->commit_sha, 'target_environment' => 'staging',
        ])->assertUnauthorized();
        $this->assertDatabaseCount('coding_agent_approvals', 0);
    }

    public function test_non_owner_cannot_approve(): void
    {
        [, $job] = $this->reviewedJob();
        $this->actingAs(User::factory()->create())->postJson("/agent/jobs/{$job->id}/approve-release", [
            'commit_sha' => $job->commit_sha, 'target_environment' => 'staging',
        ])->assertForbidden();
        $this->assertDatabaseCount('coding_agent_approvals', 0);
    }

    public function test_failed_tests_block_approval(): void
    {
        [$owner, $job] = $this->reviewedJob();
        $job->update(['tests_passed' => false]);
        $this->actingAs($owner)->postJson("/agent/jobs/{$job->id}/approve-release", [
            'commit_sha' => $job->commit_sha, 'target_environment' => 'staging',
        ])->assertStatus(409);
        $this->assertDatabaseCount('coding_agent_approvals', 0);
    }
}
