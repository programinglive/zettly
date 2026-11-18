<?php

namespace Tests\Feature\Engineering;

use App\Models\AgentSession;
use App\Models\EngineeringPipelineEvent;
use App\Models\EngineeringProject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EngineeringControlCenterTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_authorized_user_cannot_access_engineering_control_center(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user)
            ->get('/engineering')
            ->assertForbidden();

        Sanctum::actingAs($user, ['zettly:cli']);
        $this->getJson('/api/v1/engineering/projects')
            ->assertForbidden();
    }

    public function test_super_admin_can_view_engineering_control_center_with_drift_and_agent_sessions(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $other = User::factory()->create(['role' => 'super_admin']);

        $project = EngineeringProject::create([
            'user_id' => $admin->id,
            'slug' => 'zettly-app',
            'name' => 'Zettly Application',
            'provider' => 'github',
            'repo_full_name' => 'programinglive/zettly',
            'default_branch' => 'main',
            'latest_release_tag' => 'v1.2.0',
            'latest_release_sha' => '64428ea',
            'deployed_tag' => 'v1.1.0',
            'deployed_commit' => 'ba7a08c',
            'github_status' => 'ok',
            'runtime_health_status' => 'ok',
            'blocking_incident' => 'deployment blocked by host approval',
            'last_synced_at' => now()->subHours(2),
        ]);

        EngineeringPipelineEvent::create([
            'engineering_project_id' => $project->id,
            'external_event_id' => 'release-v1.2.0',
            'stage' => EngineeringPipelineEvent::STAGE_RELEASE,
            'status' => EngineeringProject::STATUS_SUCCESS,
            'commit_sha' => '64428ea',
            'workflow_name' => 'Release v1.2.0',
            'occurred_at' => now()->subMinutes(10),
        ]);

        EngineeringProject::create([
            'user_id' => $other->id,
            'slug' => 'other-secret-repo',
            'name' => 'Other Repo',
            'provider' => 'github',
            'repo_full_name' => 'other/secret',
        ]);

        AgentSession::create([
            'user_id' => $admin->id,
            'session_id' => 'sess-123',
            'machine' => 'HELLOWORLD',
            'title' => 'Zettly Release Orchestration',
            'category' => 'deployment',
            'project' => 'zettly',
            'status' => AgentSession::STATUS_IN_PROGRESS,
            'started_at' => now()->subMinutes(15),
            'last_activity_at' => now(),
        ]);

        $this->actingAs($admin)
            ->get('/engineering')
            ->assertOk();

        Sanctum::actingAs($admin, ['zettly:cli']);
        $response = $this->getJson('/api/v1/engineering/projects')->assertOk();

        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.slug', 'zettly-app');
        $response->assertJsonPath('data.0.drift.has_drift', true);
        $response->assertJsonPath('data.0.is_stale', true);
        $response->assertJsonMissing(['slug' => 'other-secret-repo']);
    }

    public function test_github_webhook_rejects_invalid_signature_and_accepts_valid_signature(): void
    {
        config(['services.github.webhook_secret' => 'top-secret-webhook']);

        $user = User::factory()->create();
        $project = EngineeringProject::create([
            'user_id' => $user->id,
            'slug' => 'zettly-app',
            'name' => 'Zettly Application',
            'provider' => 'github',
            'repo_full_name' => 'programinglive/zettly',
        ]);

        $body = json_encode([
            'action' => 'completed',
            'repository' => ['full_name' => 'programinglive/zettly'],
            'workflow_run' => [
                'id' => 77701,
                'name' => 'Tests',
                'status' => 'completed',
                'conclusion' => 'success',
                'head_sha' => 'ddb670e',
                'head_branch' => 'main',
            ],
        ]);

        $this->postJson('/api/webhooks/github', json_decode($body, true), [
            'X-GitHub-Event' => 'workflow_run',
            'X-GitHub-Delivery' => 'del-bad',
            'X-Hub-Signature-256' => 'sha256=invalid',
        ])->assertUnauthorized();

        $sig = 'sha256=' . hash_hmac('sha256', $body, 'top-secret-webhook');

        $this->call('POST', '/api/webhooks/github', [], [], [], [
            'HTTP_X_GITHUB_EVENT' => 'workflow_run',
            'HTTP_X_GITHUB_DELIVERY' => 'del-good',
            'HTTP_X_HUB_SIGNATURE_256' => $sig,
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertOk();

        $this->assertSame(1, EngineeringPipelineEvent::where('engineering_project_id', $project->id)->count());
    }
}
