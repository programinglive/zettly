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

    public function test_summary_keeps_only_the_headline_lines_and_truncates(): void
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

        $this->assertStringContainsString('# Daily Activity Summary', $summary);
        $this->assertStringContainsString('### zettly', $summary);
        $this->assertStringNotContainsString('Modified files', $summary);
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

        Http::assertSent(fn ($request) => str_contains($request['content'], '- Machines: MMCH'));
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

        Http::assertNotSent(fn ($request) => str_contains($request['content'], 'abc123secret'));
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
}
