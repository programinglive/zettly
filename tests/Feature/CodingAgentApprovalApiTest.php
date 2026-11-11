<?php

namespace Tests\Feature;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * API persetujuan rilis yang dipanggil BOTOL dari Discord.
 *
 * Yang dijaga: hanya job milik pemilik token yang terlihat, approve menolak
 * commit/environment yang berbeda dari yang ditinjau, dan reject membatalkan
 * job dengan jejak event.
 */
class CodingAgentApprovalApiTest extends TestCase
{
    use RefreshDatabase;

    private function jobFor(User $owner, array $overrides = []): CodingAgentJob
    {
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id, 'is_completed' => false]);

        return CodingAgentJob::create(array_merge([
            'user_id' => $owner->id,
            'todo_id' => $todo->id,
            'repository' => 'zettly',
            'instruction' => 'Fix login',
            'client_request_id' => 'api-'.uniqid(),
            'status' => 'review',
            'branch' => 'fix/login',
            'commit_sha' => str_repeat('a', 40),
            'test_summary' => 'Tests passed',
            'tests_passed' => true,
            'target_environment' => 'staging',
            'pr_url' => 'https://github.com/programinglive/zettly/pull/42',
        ], $overrides));
    }

    private function owner(): User
    {
        $owner = User::factory()->create(['email' => 'mahatma.mahardhika@programinglive.com']);
        config()->set('coding_agent.enabled', true);
        config()->set('coding_agent.owner_user_id', $owner->id);
        config()->set('coding_agent.owner_email', $owner->email);
        config()->set('coding_agent.github_token', null);

        return $owner;
    }

    public function test_index_lists_only_the_callers_approvable_jobs(): void
    {
        $owner = $this->owner();
        $mine = $this->jobFor($owner);
        $this->jobFor($owner, ['status' => 'running', 'client_request_id' => 'other']);
        $stranger = User::factory()->create();
        $this->jobFor($stranger, ['client_request_id' => 'stranger']);

        Sanctum::actingAs($owner, ['zettly:cli']);

        $response = $this->getJson('/api/v1/agent/jobs');

        $response->assertOk();
        $ids = array_column($response->json('data'), 'id');
        $this->assertSame([$mine->id], $ids);
    }

    public function test_approve_accepts_the_reviewed_commit(): void
    {
        $owner = $this->owner();
        $job = $this->jobFor($owner);
        Sanctum::actingAs($owner, ['zettly:cli']);

        $this->postJson("/api/v1/agent/jobs/{$job->id}/approve", [
            'commit_sha' => str_repeat('a', 40),
            'target_environment' => 'staging',
        ])->assertOk()->assertJson(['result' => 'pending', 'status' => 'release_pending']);

        $this->assertDatabaseCount('coding_agent_approvals', 1);
    }

    public function test_approve_rejects_a_different_commit(): void
    {
        $owner = $this->owner();
        $job = $this->jobFor($owner);
        Sanctum::actingAs($owner, ['zettly:cli']);

        $this->postJson("/api/v1/agent/jobs/{$job->id}/approve", [
            'commit_sha' => str_repeat('b', 40),
            'target_environment' => 'staging',
        ])->assertStatus(409);

        $this->assertDatabaseCount('coding_agent_approvals', 0);
    }

    public function test_reject_cancels_the_job_and_records_an_event(): void
    {
        $owner = $this->owner();
        $job = $this->jobFor($owner);
        Sanctum::actingAs($owner, ['zettly:cli']);

        $this->postJson("/api/v1/agent/jobs/{$job->id}/reject", ['reason' => 'not this release'])
            ->assertOk()
            ->assertJson(['result' => 'rejected', 'status' => 'cancelled']);

        $this->assertSame('cancelled', $job->fresh()->status);
        $this->assertDatabaseHas('coding_agent_job_events', [
            'coding_agent_job_id' => $job->id,
            'kind' => 'release_rejected',
        ]);
    }

    public function test_a_job_that_is_not_awaiting_release_cannot_be_rejected(): void
    {
        $owner = $this->owner();
        $job = $this->jobFor($owner, ['status' => 'running']);
        Sanctum::actingAs($owner, ['zettly:cli']);

        $this->postJson("/api/v1/agent/jobs/{$job->id}/reject")->assertStatus(409);
    }
}
