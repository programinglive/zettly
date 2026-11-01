<?php

namespace Tests\Feature\Console;

use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class JournalScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_generation_is_scheduled_daily_at_2355_jakarta(): void
    {
        $events = collect(app(Schedule::class)->events());
        $event = $events->first(fn ($e) => str_contains((string) $e->command, 'journal:generate-reports'));

        $this->assertNotNull($event, 'journal:generate-reports is not scheduled');
        $this->assertSame('55 23 * * *', $event->expression);
        $this->assertSame('Asia/Jakarta', $event->timezone);
    }

    public function test_report_delivery_is_scheduled_every_fifteen_minutes(): void
    {
        $events = collect(app(Schedule::class)->events());
        $event = $events->first(fn ($e) => str_contains((string) $e->command, 'journal:deliver-reports'));

        $this->assertNotNull($event, 'journal:deliver-reports is not scheduled');
        $this->assertSame('*/15 * * * *', $event->expression);
    }

    public function test_generate_command_targets_users_with_channels(): void
    {
        Queue::fake();
        $withChannel = User::factory()->create();
        UserReportChannel::factory()->create(['user_id' => $withChannel->id, 'channel' => 'discord']);
        $withoutChannel = User::factory()->create();

        $this->artisan('journal:generate-reports')->assertSuccessful();

        Queue::assertPushed(
            \App\Jobs\DispatchReportGeneration::class,
            fn ($job) => $job->userId === $withChannel->id
        );
        Queue::assertNotPushed(
            \App\Jobs\DispatchReportGeneration::class,
            fn ($job) => $job->userId === $withoutChannel->id
        );
    }

    public function test_deliver_command_dispatches_pending_deliveries_only(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        $pending = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'discord',
        ]);
        $report2 = Report::factory()->create([
            'user_id' => $user->id,
            'report_key' => 'daily:2026-10-31:2026-10-31',
        ]);
        $done = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report2->id, 'channel' => 'discord',
            'status' => 'delivered', 'delivered_at' => now(),
        ]);

        $this->artisan('journal:deliver-reports')->assertSuccessful();

        Queue::assertPushed(\App\Jobs\DeliverReport::class, fn ($job) => $job->deliveryId === $pending->id);
        Queue::assertNotPushed(\App\Jobs\DeliverReport::class, fn ($job) => $job->deliveryId === $done->id);
    }
}
