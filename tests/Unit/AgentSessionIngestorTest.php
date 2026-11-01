<?php

namespace Tests\Unit;

use App\Models\AgentEvent;
use App\Models\AgentSession;
use App\Models\User;
use App\Services\AgentSessionIngestor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentSessionIngestorTest extends TestCase
{
    use RefreshDatabase;

    public function test_redact_removes_discord_webhook_urls(): void
    {
        $dirty = 'hook https://discord.com/api/webhooks/123/abcdef failed';

        $this->assertSame('hook [redacted] failed', AgentSessionIngestor::redact($dirty));
    }

    public function test_redact_removes_bearer_tokens_and_key_value_secrets(): void
    {
        $this->assertStringNotContainsString('abc123', AgentSessionIngestor::redact('Authorization: Bearer abc123'));
        $this->assertStringNotContainsString('s3cr3t', AgentSessionIngestor::redact('api_key=s3cr3t'));
        $this->assertStringNotContainsString('hunter2', AgentSessionIngestor::redact('password: hunter2'));
    }

    public function test_redact_collapses_whitespace_and_truncates(): void
    {
        $this->assertSame('a b', AgentSessionIngestor::redact("a\n\tb"));
        $this->assertSame(10, mb_strlen(AgentSessionIngestor::redact(str_repeat('x', 50), 10)));
    }

    public function test_categorize_matches_the_ported_regex_list(): void
    {
        $this->assertSame('Bug Fixing', AgentSessionIngestor::categorize('fix the regression in checkout'));
        $this->assertSame('Testing', AgentSessionIngestor::categorize('add validation tests'));
        $this->assertSame('Documentation', AgentSessionIngestor::categorize('update the README guide'));
        $this->assertSame('Development', AgentSessionIngestor::categorize('implement a widget'));
    }

    public function test_upsert_session_is_idempotent_on_session_id(): void
    {
        $user = User::factory()->create();
        $payload = [
            'session_id' => 'sess-1',
            'project' => 'zettly',
            'title' => 'Fix the printer offline bug',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:30:00+07:00',
            'duration_seconds' => 1800,
            'machine' => 'MMCH',
        ];

        app(AgentSessionIngestor::class)->upsertSession($user, $payload);
        $second = app(AgentSessionIngestor::class)->upsertSession($user, array_merge($payload, [
            'status' => 'completed',
            'duration_seconds' => 2400,
        ]));

        $this->assertSame(1, AgentSession::count());
        $this->assertSame('completed', $second->status);
        $this->assertSame(2400, $second->duration_seconds);
        $this->assertSame('Fix the printer offline bug', $second->title);
        $this->assertSame('Bug Fixing', $second->category);
    }

    public function test_upsert_session_redacts_every_string_field(): void
    {
        $user = User::factory()->create();

        $session = app(AgentSessionIngestor::class)->upsertSession($user, [
            'session_id' => 'sess-2',
            'project' => 'zettly',
            'title' => 'debug Bearer leak-abc123',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:00:00+07:00',
            'outcome' => 'token=topsecretvalue',
            'machine' => 'MMCH',
        ]);

        $this->assertStringNotContainsString('leak-abc123', $session->title);
        $this->assertStringNotContainsString('topsecretvalue', $session->outcome);
    }

    public function test_append_event_dedups_by_event_key(): void
    {
        $user = User::factory()->create();
        $session = app(AgentSessionIngestor::class)->upsertSession($user, [
            'session_id' => 'sess-3',
            'project' => 'zettly',
            'title' => 'work',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:00:00+07:00',
        ]);

        $payload = [
            'event_key' => str_repeat('a', 64),
            'kind' => 'prompt',
            'occurred_at' => '2026-11-01T10:00:00+07:00',
            'detail' => 'submitted',
        ];

        $first = app(AgentSessionIngestor::class)->appendEvent($user, $session, $payload);
        $second = app(AgentSessionIngestor::class)->appendEvent($user, $session, $payload);

        $this->assertNotNull($first);
        $this->assertNull($second);
        $this->assertSame(1, AgentEvent::count());
    }
}
