<?php

namespace Tests\Feature\Jobs;

use App\Jobs\DispatchReportGeneration;
use App\Models\AgentSession;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DispatchReportGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_scheduled_run_does_not_backfill_every_past_period(): void
    {
        // Regression: the nightly job called generateDue(), which emits every
        // period since the first record. With 3 weeks of imported history that
        // queued 30 deliveries and would have flooded the Discord channel with
        // 30 messages in one night.
        $user = User::factory()->create();
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        // Three weeks of history.
        for ($i = 20; $i >= 1; $i--) {
            JournalEntry::create([
                'user_id' => $user->id,
                'entry_date' => now('Asia/Jakarta')->subDays($i)->toDateString(),
                'kind' => JournalEntry::KIND_ACTIVITY,
                'content' => 'day '.$i,
                'source' => 'legacy-markdown',
            ]);
        }

        (new DispatchReportGeneration($user->id))->handle(
            app(\App\Services\ReportGenerator::class),
            app(\App\Services\ReportDeliveryService::class)
        );

        $this->assertLessThanOrEqual(
            8,
            Report::where('user_id', $user->id)->count(),
            'A single scheduled run must not queue dozens of reports.'
        );
    }

    public function test_the_scheduled_run_still_covers_recent_periods(): void
    {
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
