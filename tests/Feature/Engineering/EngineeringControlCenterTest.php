<?php

namespace Tests\Feature\Engineering;

use App\Models\AgentSession;
use App\Models\CodingAgentJob;
use App\Models\EngineeringPipelineEvent;
use App\Models\EngineeringProject;
use App\Models\Todo;
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

        $todo = Todo::create([
            'user_id' => $admin->id,
            'title' => 'Test ECC Todo',
            'type' => Todo::TYPE_TODO,
        ]);

        CodingAgentJob::create([
            'user_id' => $admin->id,
            'todo_id' => $todo->id,
            'repository' => 'programinglive/zettly',
            'instruction' => 'Verify Engineering Control Center columns',
            'client_request_id' => 'req-ecc-1',
            'status' => 'running',
            'branch' => 'main',
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

    public function test_default_projects_include_open_source_zettly_code_knowledge_graph(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);

        Sanctum::actingAs($admin, ['zettly:cli']);
        $response = $this->getJson('/api/v1/engineering/projects')->assertOk();

        $slugs = collect($response->json('data'))->pluck('slug')->all();
        $this->assertContains('zettly-app', $slugs);
        $this->assertContains('zettly-code', $slugs);
        $this->assertContains('zettly-mcp-server', $slugs);

        $zettlyCode = collect($response->json('data'))->firstWhere('slug', 'zettly-code');
        $this->assertSame('programinglive/zettly-code', $zettlyCode['repo_full_name']);
        $this->assertSame('open-source', $zettlyCode['environment']);
    }

    public function test_code_graph_sync_persists_metrics_and_merges_annotations_across_devices(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        Sanctum::actingAs($admin, ['zettly:cli']);

        // First sync from HELLOWORLD
        $first = $this->postJson('/api/v1/engineering/code-graph/sync', [
            'slug' => 'clinic',
            'repo_full_name' => 'beautyworld_repository/clinic',
            'version' => 'v5.1.90',
            'revision' => '0ed7816d3ab000111222',
            'branch' => 'master',
            'machine' => 'HELLOWORLD',
            'freshness_status' => 'FRESH',
            'stats' => [
                'files_indexed' => 1120,
                'entities_count' => 4850,
                'relationships_count' => 12400,
                'test_links_count' => 610,
                'knowledge_annotations_count' => 1,
            ],
            'annotations' => [
                [
                    'id' => 'ZC-CLINIC-001',
                    'file_path' => 'app/Http/Livewire/SalesInvoicePage.php',
                    'purpose' => 'Enforce strict nullable date normalization on invoice filters',
                    'fix' => 'Normalized empty string dates to null',
                ],
            ],
        ])->assertOk();

        $first->assertJsonPath('data.slug', 'clinic');
        $first->assertJsonPath('data.code_graph.stats.files_indexed', 1120);
        $first->assertJsonPath('data.code_graph.stats.symbols_count', 4850);
        $first->assertJsonPath('data.code_graph.machine', 'HELLOWORLD');
        $first->assertJsonCount(1, 'data.code_graph.annotations');

        // Second sync from Mac adds another annotation without losing ZC-CLINIC-001
        $second = $this->postJson('/api/v1/engineering/code-graph/sync', [
            'slug' => 'clinic',
            'revision' => '0ed7816d3ab000111222',
            'branch' => 'master',
            'machine' => 'Mac',
            'stats' => [
                'files_indexed' => 1121,
                'entities_count' => 4855,
                'relationships_count' => 12410,
                'test_links_count' => 612,
                'knowledge_annotations_count' => 2,
            ],
            'annotations' => [
                [
                    'id' => 'ZC-CLINIC-002',
                    'file_path' => 'app/Services/ReceiptPrintService.php',
                    'purpose' => 'Universal print agent fallback retry',
                    'fix' => 'Added inline receipt retry action',
                ],
            ],
        ])->assertOk();

        $second->assertJsonPath('data.code_graph.machine', 'Mac');
        $second->assertJsonPath('data.code_graph.stats.files_indexed', 1121);
        $second->assertJsonCount(2, 'data.code_graph.annotations');
    }
}
