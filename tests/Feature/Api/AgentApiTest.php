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

    public function test_a_create_without_started_at_still_succeeds(): void
    {
        // The v0.12.11 client only sends started_at on the create call; making
        // the field required here would 422 every Stop update from that client.
        $user = $this->actingAsCliUser();

        $this->postJson('/api/v1/agent/sessions', [
            'session_id' => 'sess-no-start',
            'project' => 'zettly',
            'title' => 'Fix the printer offline bug',
            'status' => 'in_progress',
            'last_activity_at' => now()->toIso8601String(),
        ])->assertCreated();

        $session = AgentSession::where('user_id', $user->id)->where('session_id', 'sess-no-start')->firstOrFail();

        $this->assertNotNull($session->started_at, 'a missing started_at must fall back to now() on create');
    }

    public function test_a_stop_update_omitting_started_at_keeps_the_original_start(): void
    {
        $user = $this->actingAsCliUser();

        $this->postJson('/api/v1/agent/sessions', [
            'session_id' => 'sess-stop-optional',
            'project' => 'zettly',
            'title' => 'Fix the printer offline bug',
            'status' => 'in_progress',
            // Real client UserPromptSubmit: start and last activity coincide,
            // so the create call derives a ~0 duration (nothing is locked yet).
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:00:00+07:00',
        ])->assertCreated();

        // Exactly what the client's Stop hook sends: no started_at at all.
        $this->postJson('/api/v1/agent/sessions', [
            'session_id' => 'sess-stop-optional',
            'project' => 'zettly',
            'title' => 'Development',
            'status' => 'completed',
            'last_activity_at' => '2026-11-01T11:00:00+07:00',
            'completed_at' => '2026-11-01T11:00:00+07:00',
            'machine' => 'MMCH',
        ])->assertOk();

        $session = AgentSession::where('user_id', $user->id)->where('session_id', 'sess-stop-optional')->firstOrFail();

        // Stored wall-clock behaviour: the +07:00 input is stored as the
        // 10:00 wall clock (Laravel formats in the instance's own offset), so
        // it renders as 10:00+00:00 in a UTC app. Both start and end carry
        // the same offset, so the derived duration below is exact.
        $this->assertSame('2026-11-01T10:00:00+00:00', $session->started_at->toIso8601String());
        $this->assertSame('completed', $session->status);
        // Create derived ~0 (start == last activity), so the stop's
        // completed_at (11:00) minus the preserved start (10:00) yields 3600.
        $this->assertSame(3600, $session->duration_seconds);
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

    public function test_a_stop_update_without_optional_fields_preserves_the_accumulated_values(): void
    {
        $this->actingAsCliUser();

        $this->postJson('/api/v1/agent/sessions', [
            'session_id' => 'sess-5',
            'project' => 'clinic',
            'title' => 'Fix printer',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:30:00+07:00',
            'duration_seconds' => 1800,
            'files_changed' => ['app/Foo.php'],
            'errors' => ['first failure'],
            'outcome' => 'printed ok',
            'machine' => 'MMCH',
        ])->assertCreated();

        // The Stop handler sends no files/errors/outcome; they must survive.
        $this->postJson('/api/v1/agent/sessions', [
            'session_id' => 'sess-5',
            'project' => 'clinic',
            'title' => 'Fix printer',
            'status' => 'completed',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T11:00:00+07:00',
            'machine' => 'MMCH',
        ])->assertOk();

        $session = AgentSession::where('session_id', 'sess-5')->firstOrFail();
        $this->assertSame('completed', $session->status);
        $this->assertSame(1800, $session->duration_seconds);
        $this->assertSame(['app/Foo.php'], $session->files_changed);
        $this->assertSame(['first failure'], $session->errors);
        $this->assertSame('printed ok', $session->outcome);
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
