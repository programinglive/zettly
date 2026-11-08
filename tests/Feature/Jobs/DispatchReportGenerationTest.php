<?php

namespace Tests\Feature\Jobs;

use App\Jobs\DispatchReportGeneration;
use App\Models\AgentSession;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DispatchReportGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_scheduled_run_never_delivers_history_on_a_timer(): void
    {
        // Regression: the nightly job once queued a delivery for every past
        // period, which after an import meant 30 Discord messages in one
        // night. Missed periods may now be written to the database as a
        // write-only catch-up, but only the period closing tonight may reach
        // the delivery queue.
        $user = User::factory()->create();
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        // Three weeks of history ending the day before the run below.
        for ($i = 20; $i >= 1; $i--) {
            JournalEntry::create([
                'user_id' => $user->id,
                'entry_date' => \Carbon\CarbonImmutable::parse('2026-11-08', 'Asia/Jakarta')->subDays($i)->toDateString(),
                'kind' => JournalEntry::KIND_ACTIVITY,
                'content' => 'day '.$i,
                'source' => 'legacy-markdown',
            ]);
        }

        (new DispatchReportGeneration($user->id))->handle(
            app(\App\Services\ReportGenerator::class),
            app(\App\Services\ReportDeliveryService::class),
            \Carbon\CarbonImmutable::parse('2026-11-09 23:59:00', 'Asia/Jakarta')
        );

        $this->assertGreaterThan(
            8,
            Report::where('user_id', $user->id)->count(),
            'missed periods are written to the database for the catch-up'
        );

        // ...and exactly one delivery row, for tonight's daily report.
        $this->assertSame(1, ReportDelivery::count(), 'only the period closing tonight may be delivered');
        $this->assertSame('daily:2026-11-09:2026-11-09', ReportDelivery::first()->report->report_key);
    }

    public function test_the_scheduled_run_still_covers_recent_periods(): void
    {
        $this->travelTo(now('Asia/Jakarta')->setTime(12, 0, 0));

        $user = User::factory()->create();
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        // A session from today must be reported.
        AgentSession::factory()->create([
            'user_id' => $user->id,
            'title' => 'today work',
            'status' => 'in_progress',
            'started_at' => now('Asia/Jakarta')->setTimezone('UTC'),
            'last_activity_at' => now('Asia/Jakarta')->setTimezone('UTC'),
        ]);

        (new DispatchReportGeneration($user->id))->handle(
            app(\App\Services\ReportGenerator::class),
            app(\App\Services\ReportDeliveryService::class)
        );

        $today = now('Asia/Jakarta')->toDateString();
        $this->assertNotNull(
            Report::where('user_id', $user->id)->where('report_key', "daily:{$today}:{$today}")->first(),
            'Todays report must be generated.'
        );
    }

    public function test_backfill_is_still_available_on_demand(): void
    {
        // Historical backfill must remain possible, just not on a timer.
        $user = User::factory()->create();
        for ($i = 20; $i >= 1; $i--) {
            JournalEntry::create([
                'user_id' => $user->id,
                'entry_date' => now('Asia/Jakarta')->subDays($i)->toDateString(),
                'kind' => JournalEntry::KIND_ACTIVITY,
                'content' => 'day '.$i,
                'source' => 'legacy-markdown',
            ]);
        }

        $reports = app(\App\Services\ReportGenerator::class)->generateDue($user);

        $this->assertGreaterThan(8, $reports->count(), 'generateDue() is the explicit backfill path and must still emit history.');
    }
}
