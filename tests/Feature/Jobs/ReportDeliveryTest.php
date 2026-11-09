<?php

namespace Tests\Feature\Jobs;

use App\Jobs\DeliverReport;
use App\Jobs\DispatchReportGeneration;
use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\User;
use App\Models\UserReportChannel;
use App\Services\ReportDeliveryService;
use App\Services\ReportGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReportDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_nested_journal_headings_never_become_notification_titles(): void
    {
        $summary = ReportDeliveryService::summary("# Daily Activity Summary\n- Projects: 1\n## Journal entries\n# Private historical heading\n- Old journal body\n");
        $this->assertStringNotContainsString('Private historical heading', $summary);
        $this->assertStringNotContainsString('Old journal body', $summary);
        $this->assertSame(1, substr_count($summary, 'Daily Activity Summary'));
    }

    public function test_chat_summary_leads_with_the_human_summary_block_when_present(): void
    {
        $paragraph = 'You logged 43 minutes of active agent work on MMCH in 1 project.';
        $content = implode("\n", [
            '# Daily Activity Summary: 2026-11-09 - 2026-11-09',
            '',
            '- Machines: MMCH',
            '- Projects: 1',
            '',
            '## Summary',
            '',
            $paragraph,
            '',
            '## Work by project',
            '',
            '### zettly',
            '',
            '- **ship it** — completed (feature)',
            '',
            '## Outstanding work',
            '',
            '- None recorded.',
        ]);

        $summary = ReportDeliveryService::summary($content);

        $this->assertStringContainsString($paragraph, $summary);
        $this->assertLessThan(
            strpos($summary, '- Machines: MMCH'),
            strpos($summary, $paragraph),
            'the human summary leads, before the metric bullets'
        );
    }

    public function test_discord_embed_description_carries_the_human_summary_when_present(): void
    {
        $paragraph = 'You logged 43 minutes of active agent work on MMCH in 1 project.';
        $content = implode("\n", [
            '# Daily Activity Summary: 2026-11-09 - 2026-11-09',
            '',
            '- Machines: MMCH',
            '',
            '## Summary',
            '',
            $paragraph,
            '',
            '## Work by project',
        ]);

        $payload = ReportDeliveryService::discordPayload($content, 'https://zettly.example/reports/1');
        $embed = $payload['embeds'][0];

        $this->assertStringContainsString($paragraph, $embed['description']);
        $this->assertStringContainsString('View Full Report', $embed['description']);

        // Legacy content (no '## Summary' section) keeps the old description.
        $legacy = ReportDeliveryService::discordPayload(
            "# Daily Activity Summary: 2026-11-01 - 2026-11-01\n\n- Machines: MMCH\n\n## Work by project\n",
            'https://zettly.example/reports/2'
        );
        $this->assertStringNotContainsString($paragraph, $legacy['embeds'][0]['description']);
    }

    public function test_summary_preserves_lines_and_counts_without_dumping_history(): void
    {
        $content = implode("\n", [
            '# Daily Activity Summary: 2026-11-01 - 2026-11-01',
            '',
            '- Machines: MMCH',
            '- Projects: 1',
            '- Tasks completed: 2',
            '- Tasks in progress or blocked: 0',
            '- Observed active-turn time: 30 minutes (not total working time)',
            '- Journal entries recorded: 1',
            '',
            '## Work by project',
            '',
            '### zettly',
            '',
            '- **ship it** — completed (Bug Fixing)',
            '  - Modified files: app/Foo.php',
            '',
            '## Outstanding work',
            '',
            '- zettly: another task (in_progress)',
            '',
            '## Journal entries',
            '',
            '- **2026-11-01** (activity): Rebuilt the backup pipeline.',
            '',
            '## Next actions',
            '',
            '- Continue from activity/ACTIVE.md.',
            '',
            '## Historical comparison',
            '',
            '- Unavailable until automated records exist for both periods.',
            '',
        ]);

        $summary = ReportDeliveryService::summary($content);

        $this->assertStringStartsWith('Daily Activity Summary', $summary);
        $this->assertStringContainsString("\n", $summary);
        $this->assertDoesNotMatchRegularExpression('/^#+ /m', $summary);
        $this->assertStringNotContainsString('ship it', $summary);
        $this->assertStringContainsString('another task', $summary);
        $this->assertStringNotContainsString('Rebuilt the backup pipeline.', $summary);
        $this->assertStringContainsString('Journal entries recorded: 1', $summary);
        // Dropped: boilerplate that adds nothing to a chat message.
        $this->assertStringNotContainsString('## Next actions', $summary);
        $this->assertStringNotContainsString('## Historical comparison', $summary);
        $this->assertStringNotContainsString('Continue from activity/ACTIVE.md', $summary);
    }

    public function test_summary_fits_discords_2000_character_limit(): void
    {
        $blog = str_repeat('lorem ipsum dolor sit amet ', 400); // ~10 KB
        $content = "# Daily Activity Summary: 2026-10-20 - 2026-10-20\n\n- Projects: 0\n\n## Journal entries\n\n- **2026-10-20** (activity): {$blog}\n";

        $summary = ReportDeliveryService::summary($content);

        // 1800 leaves headroom under Discord's hard 2000 limit.
        $this->assertLessThanOrEqual(1800, mb_strlen($summary));
    }

    public function test_summary_drops_a_section_whole_instead_of_leaving_its_heading(): void
    {
        $content = "# Head\n\n## Next actions\n\n- something\n- else\n";

        $summary = ReportDeliveryService::summary($content);

        $this->assertStringNotContainsString('## Next actions', $summary);
        $this->assertStringNotContainsString('something', $summary);
    }

    public function test_summary_keeps_the_headline_lines_and_truncates(): void
    {
        $content = implode("\n", [
            '# Daily Activity Summary: 2026-11-01 - 2026-11-01',
            '',
            '- Machines: MMCH',
            '- Projects: 1',
            '- Tasks completed: 2',
            '- Tasks in progress or blocked: 0',
            '- Observed active-turn time: 30 minutes (not total working time)',
            '',
            '### zettly',
            '- **ship it** — completed (Bug Fixing)',
            '  - Modified files: app/Foo.php',
        ]);

        $summary = ReportDeliveryService::summary($content);

        $this->assertStringContainsString('Daily Activity Summary', $summary);
        $this->assertStringNotContainsString('### zettly', $summary);
        $this->assertStringNotContainsString('Modified files', $summary);
        $this->assertLessThanOrEqual(1800, mb_strlen($summary));
    }

    public function test_enqueue_creates_one_delivery_per_enabled_channel(): void
    {
        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'telegram', 'enabled' => false]);

        $created = app(ReportDeliveryService::class)->enqueue($user, $report);

        $this->assertSame(1, $created);
        $this->assertSame(1, ReportDelivery::count());
    }

    public function test_summary_caps_actions_and_prioritizes_blocked_work(): void
    {
        $content = "# Summary\n- Tasks completed: 2\n## Outstanding work\n";
        foreach (range(1, 15) as $number) {
            $content .= "- Task {$number} (in_progress)\n";
        }
        $content .= "- Fix **critical** blocker @everyone (blocked)\n## Journal entries\n- Private journal body\n";
        $summary = ReportDeliveryService::summary($content);
        $this->assertStringContainsString('critical', $summary);
        $this->assertStringNotContainsString('Task 4 ', $summary);
        $this->assertStringNotContainsString('Private journal body', $summary);
        $this->assertStringContainsString('13 more', $summary);
    }

    public function test_telegram_delivery_uses_plain_text_and_a_details_link(): void
    {
        Http::fake(['*' => Http::response(['ok' => true])]);
        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'telegram']);
        $delivery = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'telegram',
        ]);
        app(ReportDeliveryService::class)->send($delivery);
        Http::assertSent(fn ($request) => ! isset($request['parse_mode'])
            && $request['link_preview_options'] === ['is_disabled' => true]
            && str_contains($request['text'], route('reports.show', $report))
            && str_contains($request['text'], "\n"));
    }

    public function test_enqueue_is_idempotent(): void
    {
        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        app(ReportDeliveryService::class)->enqueue($user, $report);
        app(ReportDeliveryService::class)->enqueue($user, $report);

        $this->assertSame(1, ReportDelivery::count());
    }

    public function test_send_posts_to_the_webhook_and_marks_delivered(): void
    {
        Http::fake(['discord.com/*' => Http::response(['id' => '1'], 204)]);

        $user = User::factory()->create();
        $report = Report::factory()->create([
            'user_id' => $user->id,
            'content' => "# Daily Activity Summary\n\n- Machines: MMCH",
        ]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        $delivery = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'discord',
        ]);

        app(ReportDeliveryService::class)->send($delivery);

        Http::assertSent(function ($request) use ($report) {
            $embed = $request['embeds'][0] ?? [];
            $fieldValues = implode(' ', array_column($embed['fields'] ?? [], 'value'));

            return str_contains($fieldValues, 'MMCH')
                && $request['allowed_mentions'] === ['parse' => []]
                && $embed['url'] === route('reports.show', $report);
        });
        $this->assertSame('delivered', $delivery->fresh()->status);
        $this->assertNotNull($delivery->fresh()->delivered_at);
    }

    public function test_send_redacts_secrets_before_posting(): void
    {
        Http::fake(['discord.com/*' => Http::response([], 204)]);

        $user = User::factory()->create();
        $report = Report::factory()->create([
            'user_id' => $user->id,
            'content' => "# Summary\n\n- Machines: leak Bearer abc123secret",
        ]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        $delivery = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'discord',
        ]);

        app(ReportDeliveryService::class)->send($delivery);

        Http::assertNotSent(fn ($request) => str_contains(json_encode($request->data()), 'abc123secret'));
    }

    public function test_send_records_a_failure_and_retries(): void
    {
        Http::fake(['discord.com/*' => Http::response('nope', 500)]);

        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        $delivery = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'discord',
        ]);

        try {
            app(ReportDeliveryService::class)->send($delivery);
        } catch (\Throwable $e) {
            // the job retries; the service records the attempt either way
        }

        $delivery->refresh();
        $this->assertSame('pending', $delivery->status);
        $this->assertSame(1, $delivery->attempts);
        $this->assertNotNull($delivery->last_error);
    }

    public function test_deliver_job_marks_delivery_failed_after_the_retry_cap_is_exhausted(): void
    {
        Http::fake(['discord.com/*' => Http::response('nope', 500)]);

        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        $delivery = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'discord',
            'attempts' => 2,
        ]);

        $job = new DeliverReport($delivery->id);

        try {
            $job->handle(app(ReportDeliveryService::class), 3);
        } catch (\Throwable) {
            // expected: the final attempt still raises so the queue records it
        }

        $delivery->refresh();
        $this->assertSame(ReportDelivery::STATUS_FAILED, $delivery->status);
        $this->assertSame(3, $delivery->attempts);
    }

    public function test_dispatch_job_generates_reports_for_a_user(): void
    {
        $user = User::factory()->create();
        \App\Models\AgentSession::factory()->create([
            'user_id' => $user->id,
            'started_at' => now()->subDay(),
            'last_activity_at' => now()->subDay(),
        ]);

        (new DispatchReportGeneration($user->id))->handle(app(ReportGenerator::class), app(ReportDeliveryService::class));

        $this->assertGreaterThanOrEqual(1, Report::where('user_id', $user->id)->count());
    }

    public function test_deliver_job_sends_a_pending_delivery(): void
    {
        Http::fake(['discord.com/*' => Http::response([], 204)]);

        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        $delivery = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'discord',
        ]);

        (new DeliverReport($delivery->id))->handle(app(ReportDeliveryService::class));

        $this->assertSame('delivered', $delivery->fresh()->status);
    }

    /**
     * Verify Discord payload uses standard Rich Embed format with overview metrics.
     */
    public function test_discord_payload_uses_clean_rich_embed_with_metrics_and_report_url(): void
    {
        $content = implode("\n", [
            '# Daily Activity Summary: 2026-11-04 - 2026-11-04',
            '- Machines: MMCH',
            '- Tasks completed: 2',
            '- Tasks in progress or blocked: 1',
            '## Outstanding work',
            '- Fix printing bug (urgent)',
        ]);
        $payload = ReportDeliveryService::chatPayload(UserReportChannel::CHANNEL_DISCORD, $content, 'https://zettly.test/reports/1');

        $this->assertArrayHasKey('embeds', $payload);
        $this->assertNotEmpty($payload['embeds']);
        $embed = $payload['embeds'][0];
        $this->assertSame('https://zettly.test/reports/1', $embed['url']);
        $this->assertStringContainsString('Daily Activity Summary', $embed['title']);
        $this->assertArrayHasKey('fields', $embed);
        $fieldNames = array_column($embed['fields'], 'name');
        $this->assertContains('📈 Overview', $fieldNames);
        $this->assertContains('⚠️ Needs Attention', $fieldNames);
    }
}
