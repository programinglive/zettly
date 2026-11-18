<?php

namespace Tests\Feature\Api;

use App\Models\AgentEvent;
use App\Models\AgentSession;
use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use App\Services\AgentSessionIngestor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SentryRegressionFixesTest extends TestCase
{
    use RefreshDatabase;

    public function test_todos_by_tag_resolves_tag_by_string_name_or_numeric_id(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $tag = Tag::create([
            'user_id' => $user->id,
            'name' => 'proyek:clinic',
            'color' => '#3B82F6',
        ]);
        $otherTag = Tag::create([
            'user_id' => $otherUser->id,
            'name' => 'proyek:erp',
            'color' => '#EF4444',
        ]);

        $todo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Fix Clinic staging invoice',
        ]);
        $todo->tags()->attach($tag->id);

        // 1. Resolve by string tag name (TODOAPP-3D regression: /api/v1/todos/by-tag/proyek:clinic)
        $this->actingAs($user)
            ->getJson('/api/v1/todos/by-tag/proyek:clinic')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.id', $todo->id);

        // 2. Resolve by numeric tag ID
        $this->actingAs($user)
            ->getJson("/api/v1/todos/by-tag/{$tag->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.id', $todo->id);

        // 3. Unknown string tag name returns 404 without SQL bigint error
        $this->actingAs($user)
            ->getJson('/api/v1/todos/by-tag/nonexistent:tag')
            ->assertNotFound();

        // 4. Another user's numeric tag ID returns 403
        $this->actingAs($user)
            ->getJson("/api/v1/todos/by-tag/{$otherTag->id}")
            ->assertForbidden();
    }

    public function test_agent_session_ingestor_append_event_is_idempotent_on_duplicate_event_key(): void
    {
        $user = User::factory()->create();
        $ingestor = app(AgentSessionIngestor::class);

        $session = $ingestor->upsertSession($user, [
            'session_id' => 'ses_test_todoapp_6m',
            'project' => 'zettly',
            'title' => 'Development',
            'status' => AgentSession::STATUS_IN_PROGRESS,
        ]);

        $first = $ingestor->appendEvent($user, $session, [
            'event_key' => 'evt_unique_123',
            'kind' => 'tool_call',
            'detail' => 'Ran phpunit',
        ]);

        $this->assertNotNull($first);

        $duplicate = $ingestor->appendEvent($user, $session, [
            'event_key' => 'evt_unique_123',
            'kind' => 'tool_call',
            'detail' => 'Ran phpunit again',
        ]);

        $this->assertNull($duplicate);
        $this->assertSame(1, AgentEvent::where('event_key', 'evt_unique_123')->count());
    }

    public function test_auto_release_workflow_avoids_unsupported_gh_run_list_commit_flag(): void
    {
        $workflow = file_get_contents(base_path('.github/workflows/auto-release.yml'));

        $this->assertIsString($workflow);
        $this->assertStringNotContainsString('--commit "$GITHUB_SHA"', $workflow);
        $this->assertStringContainsString('headSha', $workflow);
    }
}
