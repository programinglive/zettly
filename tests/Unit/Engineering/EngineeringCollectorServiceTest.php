<?php

namespace Tests\Unit\Engineering;

use App\Domain\Engineering\EngineeringCollectorService;
use App\Domain\Engineering\EngineeringProjectRegistry;
use App\Models\EngineeringPipelineEvent;
use App\Models\EngineeringProject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EngineeringCollectorServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_missing_github_token_marks_project_not_connected_without_crashing(): void
    {
        config(['services.github.token' => null]);

        $user = User::factory()->create();
        $project = (new EngineeringProjectRegistry())->ensureDefaultProjects($user)->first();

        $synced = (new EngineeringCollectorService())->syncProject($project);

        $this->assertSame('not_connected', $synced->github_status);
        $this->assertNull($synced->latest_release_sha);
    }

    public function test_github_rate_limit_marks_rate_limited_and_preserves_existing_data(): void
    {
        config(['services.github.token' => 'ghp_test_token']);

        $user = User::factory()->create();
        $project = EngineeringProject::create([
            'user_id' => $user->id,
            'slug' => 'zettly-app',
            'name' => 'Zettly Application',
            'provider' => 'github',
            'repo_full_name' => 'programinglive/zettly',
            'default_branch' => 'main',
            'deployed_tag' => 'v1.1.0',
            'deployed_commit' => 'ba7a08c4ad7617dd3dadba8d233d742198d7e960',
        ]);

        Http::fake([
            'https://api.github.com/*' => Http::response(['message' => 'API rate limit exceeded'], 429),
        ]);

        $synced = (new EngineeringCollectorService())->syncProject($project);

        $this->assertSame('rate_limited', $synced->github_status);
        $this->assertSame('v1.1.0', $synced->deployed_tag);
    }

    public function test_github_release_does_not_falsely_mark_production_deployed_and_reports_drift(): void
    {
        config(['services.github.token' => 'ghp_test_token']);

        $user = User::factory()->create();
        $project = EngineeringProject::create([
            'user_id' => $user->id,
            'slug' => 'zettly-app',
            'name' => 'Zettly Application',
            'provider' => 'github',
            'repo_full_name' => 'programinglive/zettly',
            'default_branch' => 'main',
            'deployed_tag' => 'v1.1.0',
            'deployed_commit' => 'ba7a08c4ad7617dd3dadba8d233d742198d7e960',
            'blocking_incident' => 'deployment blocked by host approval',
        ]);

        Http::fake([
            'https://api.github.com/repos/programinglive/zettly/releases/latest' => Http::response([
                'tag_name' => 'v1.2.0',
                'target_commitish' => '64428ea000000000000000000000000000000000',
                'published_at' => '2026-11-18T06:00:00Z',
                'html_url' => 'https://github.com/programinglive/zettly/releases/tag/v1.2.0',
            ], 200),
            'https://api.github.com/repos/programinglive/zettly/actions/runs*' => Http::response([
                'workflow_runs' => [
                    [
                        'id' => 44247794698,
                        'name' => 'Release',
                        'status' => 'completed',
                        'conclusion' => 'success',
                        'head_sha' => '64428ea000000000000000000000000000000000',
                        'head_branch' => 'v1.2.0',
                        'html_url' => 'https://github.com/programinglive/zettly/actions/runs/44247794698',
                        'created_at' => '2026-11-18T05:57:00Z',
                        'updated_at' => '2026-11-18T06:00:00Z',
                    ],
                ],
            ], 200),
            'https://api.github.com/repos/programinglive/zettly/pulls*' => Http::response([], 200),
        ]);

        $synced = (new EngineeringCollectorService())->syncProject($project);
        $summary = (new EngineeringProjectRegistry())->summarize($synced);

        $this->assertSame('ok', $synced->github_status);
        $this->assertSame('v1.2.0', $synced->latest_release_tag);
        $this->assertSame('v1.1.0', $synced->deployed_tag);
        $this->assertTrue($summary['drift']['has_drift']);
        $this->assertStringContainsString('v1.2.0', $summary['drift']['summary']);
        $this->assertStringContainsString('v1.1.0', $summary['drift']['summary']);
    }

    public function test_duplicate_webhook_events_are_deduplicated_idempotently(): void
    {
        $user = User::factory()->create();
        $project = EngineeringProject::create([
            'user_id' => $user->id,
            'slug' => 'zettly-app',
            'name' => 'Zettly Application',
            'provider' => 'github',
            'repo_full_name' => 'programinglive/zettly',
        ]);

        $payload = [
            'action' => 'completed',
            'repository' => ['full_name' => 'programinglive/zettly'],
            'workflow_run' => [
                'id' => 999001,
                'name' => 'Tests',
                'status' => 'completed',
                'conclusion' => 'failure',
                'head_sha' => 'abc1234',
                'head_branch' => 'main',
                'html_url' => 'https://github.com/programinglive/zettly/actions/runs/999001',
                'updated_at' => '2026-11-18T06:10:00Z',
            ],
        ];

        $collector = new EngineeringCollectorService();
        $collector->ingestGitHubWebhook('workflow_run', 'delivery-1', $payload);
        $collector->ingestGitHubWebhook('workflow_run', 'delivery-1', $payload);

        $this->assertSame(1, EngineeringPipelineEvent::where('engineering_project_id', $project->id)->count());
        $event = EngineeringPipelineEvent::first();
        $this->assertSame(EngineeringProject::STATUS_FAILED, $event->status);
    }

    public function test_plain_text_deploy_marker_and_annotated_tag_resolution_eliminate_false_drift(): void
    {
        config(['services.github.token' => 'ghp_test_token']);

        $markerFile = tempnam(sys_get_temp_dir(), 'zettly-marker-');
        file_put_contents($markerFile, "v1.3.1\n14f0b74b42ded8d6271a741faa01481f78bb832b\n");
        config(['services.deploy.marker_path' => $markerFile]);

        try {
            $user = User::factory()->create();
            $project = (new EngineeringProjectRegistry())->ensureDefaultProjects($user)->firstWhere('slug', 'zettly-app');
            $this->assertNull($project->deployed_tag);

            Http::fake([
                'https://api.github.com/repos/programinglive/zettly/releases/latest' => Http::response([
                    'tag_name' => 'v1.3.1',
                    'target_commitish' => 'main',
                    'published_at' => '2026-11-18T07:00:00Z',
                ], 200),
                'https://api.github.com/repos/programinglive/zettly/git/ref/tags/v1.3.1' => Http::response([
                    'object' => ['type' => 'tag', 'sha' => '0e510807e99870894c89f7a44dca549ac8d98bef'],
                ], 200),
                'https://api.github.com/repos/programinglive/zettly/git/tags/0e510807e99870894c89f7a44dca549ac8d98bef' => Http::response([
                    'object' => ['type' => 'commit', 'sha' => '14f0b74b42ded8d6271a741faa01481f78bb832b'],
                ], 200),
                'https://api.github.com/repos/programinglive/zettly/actions/runs*' => Http::response(['workflow_runs' => []], 200),
                'https://api.github.com/repos/programinglive/zettly/pulls*' => Http::response([], 200),
            ]);

            $synced = (new EngineeringCollectorService())->syncProject($project);
            $summary = (new EngineeringProjectRegistry())->summarize($synced);

            $this->assertSame('v1.3.1', $synced->deployed_tag);
            $this->assertSame('14f0b74b42ded8d6271a741faa01481f78bb832b', $synced->deployed_commit);
            $this->assertSame('14f0b74b42ded8d6271a741faa01481f78bb832b', $synced->latest_release_sha);
            $this->assertFalse($summary['drift']['has_drift']);
        } finally {
            @unlink($markerFile);
        }
    }
}
