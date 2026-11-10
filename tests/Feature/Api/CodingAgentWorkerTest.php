<?php

namespace Tests\Feature\Api;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodingAgentWorkerTest extends TestCase
{
    use RefreshDatabase;

    private function setupJob(): array
    {
        $owner = User::factory()->create(['email' => 'mahatma.mahardhika@programinglive.com']);
        config()->set('coding_agent.enabled', true);
        config()->set('coding_agent.owner_user_id', $owner->id);
        config()->set('coding_agent.owner_email', $owner->email);
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);
        $job = CodingAgentJob::create(['user_id' => $owner->id, 'todo_id' => $todo->id, 'repository' => 'zettly', 'instruction' => 'Fix login', 'client_request_id' => 'mobile-1']);

        return [$owner, $job];
    }

    public function test_worker_claims_one_job_and_second_claim_is_empty(): void
    {
        [$owner, $job] = $this->setupJob();
        $token = $owner->createToken('agent-worker', ['coding-agent:worker'])->plainTextToken;

        $first = $this->withToken($token)->postJson('/api/v1/coding-agent/claim')->assertOk();
        $first->assertJsonPath('data.id', $job->id);
        $this->assertNotEmpty($first->json('data.lease_token'));
        $this->withToken($token)->postJson('/api/v1/coding-agent/claim')->assertNoContent();
        $this->assertSame('running', $job->fresh()->status);
    }

    public function test_generic_cli_token_cannot_claim_job(): void
    {
        [$owner] = $this->setupJob();
        $token = $owner->createToken('cli', ['zettly:cli'])->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/coding-agent/claim')->assertForbidden();
    }

    public function test_generic_wildcard_token_cannot_claim_job(): void
    {
        [$owner] = $this->setupJob();
        $token = $owner->createToken('personal-default')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/coding-agent/claim')->assertForbidden();
    }

    public function test_event_replay_is_idempotent_and_secret_is_redacted(): void
    {
        [$owner, $job] = $this->setupJob();
        $token = $owner->createToken('agent-worker', ['coding-agent:worker'])->plainTextToken;
        $lease = $this->withToken($token)->postJson('/api/v1/coding-agent/claim')->json('data.lease_token');
        $payload = ['lease_token' => $lease, 'event_key' => 'event-1', 'kind' => 'progress', 'detail' => 'Bearer secretvalue123', 'occurred_at' => now()->toIso8601String()];

        $this->withToken($token)->postJson("/api/v1/coding-agent/jobs/{$job->id}/events", $payload)->assertOk();
        $this->withToken($token)->postJson("/api/v1/coding-agent/jobs/{$job->id}/events", $payload)->assertOk();
        $this->assertSame(1, $job->events()->where('event_key', 'event-1')->count());
        $this->assertSame('[redacted]', $job->events()->where('event_key', 'event-1')->firstOrFail()->detail);
    }

    public function test_wrong_lease_cannot_update_heartbeat(): void
    {
        [$owner, $job] = $this->setupJob();
        $token = $owner->createToken('agent-worker', ['coding-agent:worker'])->plainTextToken;
        $this->withToken($token)->postJson('/api/v1/coding-agent/claim')->assertOk();
        $heartbeatBefore = $job->fresh()->last_heartbeat_at;

        $this->withToken($token)->postJson("/api/v1/coding-agent/jobs/{$job->id}/heartbeat", ['lease_token' => 'wrong'])->assertStatus(409);
        $this->assertEquals($heartbeatBefore, $job->fresh()->last_heartbeat_at);
    }

    public function test_expired_lease_can_be_reclaimed_and_old_token_is_rejected(): void
    {
        [$owner, $job] = $this->setupJob();
        $token = $owner->createToken('agent-worker', ['coding-agent:worker'])->plainTextToken;
        $oldLease = $this->withToken($token)->postJson('/api/v1/coding-agent/claim')->json('data.lease_token');
        $job->update(['leased_until' => now()->subSecond()]);

        $newLease = $this->withToken($token)->postJson('/api/v1/coding-agent/claim')->assertOk()->json('data.lease_token');
        $this->assertNotSame($oldLease, $newLease);
        $this->withToken($token)->postJson("/api/v1/coding-agent/jobs/{$job->id}/events", [
            'lease_token' => $oldLease,
            'event_key' => 'stale-event',
            'kind' => 'progress',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(409);
        $this->assertSame(0, $job->events()->count());
    }

    public function test_worker_result_records_review_without_exposing_lease_hash(): void
    {
        [$owner, $job] = $this->setupJob();
        $token = $owner->createToken('agent-worker', ['coding-agent:worker'])->plainTextToken;
        $lease = $this->withToken($token)->postJson('/api/v1/coding-agent/claim')->json('data.lease_token');

        $this->withToken($token)->postJson("/api/v1/coding-agent/jobs/{$job->id}/result", [
            'lease_token' => $lease,
            'branch' => 'fix/login',
            'commit_sha' => str_repeat('a', 40),
            'test_summary' => 'Targeted tests passed; Bearer secretvalue123',
            'tests_passed' => true,
            'target_environment' => 'staging',
        ])->assertOk();

        $this->assertSame('review', $job->fresh()->status);
        $this->assertSame('Targeted tests passed; [redacted]', $job->fresh()->test_summary);
        $this->assertNull($job->fresh()->lease_token_hash);
        $this->assertArrayNotHasKey('lease_token_hash', $job->toArray());
    }

    public function test_worker_reads_follow_up_instructions_only_while_lease_is_valid(): void
    {
        [$owner, $job] = $this->setupJob();
        $token = $owner->createToken('agent-worker', ['coding-agent:worker'])->plainTextToken;
        $lease = $this->withToken($token)->postJson('/api/v1/coding-agent/claim')->json('data.lease_token');
        $event = $job->events()->create([
            'event_key' => 'owner-1', 'kind' => 'instruction',
            'detail' => 'Also check sessions', 'occurred_at' => now(),
        ]);
        $job->events()->create([
            'event_key' => 'status-1', 'kind' => 'progress',
            'detail' => 'Working', 'occurred_at' => now(),
        ]);

        $this->withToken($token)->postJson("/api/v1/coding-agent/jobs/{$job->id}/instructions", ['lease_token' => $lease])
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $event->id);
        $this->withToken($token)->postJson("/api/v1/coding-agent/jobs/{$job->id}/instructions", ['lease_token' => $lease, 'after_id' => $event->id])
            ->assertOk()->assertJsonCount(0, 'data');
        $job->update(['status' => 'paused']);
        $this->withToken($token)->postJson("/api/v1/coding-agent/jobs/{$job->id}/instructions", ['lease_token' => $lease])
            ->assertStatus(409);
    }
}
