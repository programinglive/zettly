<?php

namespace Tests\Feature\Api;

use App\Models\AgentEvent;
use App\Models\AgentSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AgentApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsCliUser(): User
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        return $user;
    }

    public function test_it_creates_a_session(): void
    {
        $user = $this->actingAsCliUser();

        $this->postJson('/api/v1/agent/sessions', [
            'session_id' => 'sess-1',
            'project' => 'zettly',
            'title' => 'Fix the printer offline bug',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:30:00+07:00',
            'duration_seconds' => 1800,
            'machine' => 'MMCH',
        ])->assertCreated()->assertJsonPath('success', true);

        $this->assertDatabaseHas('agent_sessions', [
            'user_id' => $user->id,
            'session_id' => 'sess-1',
            'category' => 'Bug Fixing',
        ]);
    }

    public function test_replaying_the_same_session_does_not_duplicate_it(): void
    {
        $this->actingAsCliUser();
        $payload = [
            'session_id' => 'sess-1',
            'project' => 'zettly',
            'title' => 'Fix the printer offline bug',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:30:00+07:00',
        ];

        $this->postJson('/api/v1/agent/sessions', $payload)->assertCreated();
        $this->postJson('/api/v1/agent/sessions', $payload)->assertOk();

        $this->assertSame(1, AgentSession::count());
    }

    public function test_it_rejects_an_unknown_status(): void
    {
        $this->actingAsCliUser();

        $this->postJson('/api/v1/agent/sessions', [
            'session_id' => 'sess-1',
            'project' => 'zettly',
            'title' => 'work',
            'status' => 'paused',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:00:00+07:00',
        ])->assertStatus(422);
    }

    public function test_appending_the_same_event_twice_creates_one_row(): void
    {
        $this->actingAsCliUser();
        $this->postJson('/api/v1/agent/sessions', [
            'session_id' => 'sess-1',
            'project' => 'zettly',
            'title' => 'work',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:00:00+07:00',
        ])->assertCreated();

        $event = [
            'event_key' => str_repeat('b', 64),
            'kind' => 'prompt',
            'occurred_at' => '2026-11-01T10:00:00+07:00',
            'detail' => 'submitted',
        ];

        $this->postJson('/api/v1/agent/sessions/sess-1/events', $event)
            ->assertOk()->assertJsonPath('created', true);
        $this->postJson('/api/v1/agent/sessions/sess-1/events', $event)
            ->assertOk()->assertJsonPath('created', false);

        $this->assertSame(1, AgentEvent::count());
    }

    public function test_events_for_another_users_session_return_404(): void
    {
        $this->actingAsCliUser();
        $other = User::factory()->create();
        AgentSession::factory()->create(['user_id' => $other->id, 'session_id' => 'sess-other']);

        $this->postJson('/api/v1/agent/sessions/sess-other/events', [
            'event_key' => str_repeat('c', 64),
            'kind' => 'prompt',
            'occurred_at' => '2026-11-01T10:00:00+07:00',
        ])->assertNotFound();
    }

    public function test_it_requires_the_cli_ability(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['other:ability']);

        $this->getJson('/api/v1/agent/sessions')->assertForbidden();
    }

    public function test_it_lists_sessions_newest_first_with_a_since_filter(): void
    {
        $user = $this->actingAsCliUser();
        AgentSession::factory()->create([
            'user_id' => $user->id, 'session_id' => 'old',
            'last_activity_at' => '2026-10-01 00:00:00',
        ]);
        AgentSession::factory()->create([
            'user_id' => $user->id, 'session_id' => 'new',
            'last_activity_at' => '2026-11-01 00:00:00',
        ]);

        $response = $this->getJson('/api/v1/agent/sessions?since=2026-10-15T00:00:00%2B07:00');

        $response->assertOk();
        $this->assertSame(['new'], array_column($response->json('data'), 'session_id'));
    }
}
