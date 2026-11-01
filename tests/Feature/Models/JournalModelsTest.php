<?php

namespace Tests\Feature\Models;

use App\Models\AgentEvent;
use App\Models\AgentSession;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class JournalModelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_json_columns_cast_to_arrays(): void
    {
        $session = AgentSession::factory()->create([
            'files_changed' => ['app/Foo.php'],
            'errors' => ['Observed tool failure: bash'],
        ]);

        $this->assertSame(['app/Foo.php'], $session->fresh()->files_changed);
        $this->assertSame(['Observed tool failure: bash'], $session->fresh()->errors);
    }

    public function test_session_has_many_events(): void
    {
        $session = AgentSession::factory()->create();
        AgentEvent::factory()->count(2)->create([
            'user_id' => $session->user_id,
            'agent_session_id' => $session->id,
        ]);

        $this->assertCount(2, $session->fresh()->events);
    }

    public function test_webhook_url_is_encrypted_at_rest(): void
    {
        $user = User::factory()->create();
        UserReportChannel::create([
            'user_id' => $user->id,
            'channel' => UserReportChannel::CHANNEL_DISCORD,
            'webhook_url' => 'https://discord.com/api/webhooks/123/abc',
        ]);

        $raw = DB::table('user_report_channels')->value('webhook_url');

        $this->assertNotSame('https://discord.com/api/webhooks/123/abc', $raw);
        $this->assertSame(
            'https://discord.com/api/webhooks/123/abc',
            UserReportChannel::first()->webhook_url
        );
    }

    public function test_report_has_many_deliveries(): void
    {
        $report = Report::factory()->create();
        ReportDelivery::factory()->create([
            'user_id' => $report->user_id,
            'report_id' => $report->id,
            'channel' => 'discord',
        ]);

        $this->assertCount(1, $report->fresh()->deliveries);
    }

    public function test_journal_entry_belongs_to_todo(): void
    {
        $entry = JournalEntry::factory()->create();

        $this->assertNull($entry->todo);
        $this->assertNotNull($entry->user);
    }
}
