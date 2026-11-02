<?php

namespace Tests\Feature\Jobs;

use App\Jobs\DispatchReportGeneration;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\User;
use App\Models\UserReportChannel;
use App\Services\ReportDeliveryService;
use App\Services\ReportGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackfillSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function userWithHistory(): User
    {
        $user = User::factory()->create();
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        foreach (range(20, 1) as $i) {
            JournalEntry::create([
                'user_id' => $user->id,
                'entry_date' => now('Asia/Jakarta')->subDays($i)->toDateString(),
                'kind' => JournalEntry::KIND_ACTIVITY,
                'content' => 'day '.$i,
                'source' => 'legacy-markdown',
            ]);
        }

        return $user;
    }

    public function test_a_backfill_writes_reports_without_queueing_any_delivery(): void
    {
        // Backfilling three weeks of history must not push dozens of messages
        // into Discord. This is the guard that makes it safe to run.
        $user = $this->userWithHistory();

        (new DispatchReportGeneration($user->id, backfill: true, deliver: false))->handle(
            app(ReportGenerator::class),
            app(ReportDeliveryService::class)
        );

        $this->assertGreaterThan(10, Report::where('user_id', $user->id)->count(), 'history should be written');
        $this->assertSame(0, ReportDelivery::count(), 'a backfill must not queue any delivery');
    }

    public function test_a_backfill_with_delivery_enabled_does_queue_deliveries(): void
    {
        // The escape hatch must still work when explicitly requested.
        $user = $this->userWithHistory();

        (new DispatchReportGeneration($user->id, backfill: true, deliver: true))->handle(
            app(ReportGenerator::class),
            app(ReportDeliveryService::class)
        );

        $this->assertGreaterThan(0, ReportDelivery::count());
    }

    public function test_the_nightly_run_still_delivers(): void
    {
        $user = User::factory()->create();
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        \App\Models\AgentSession::factory()->create([
            'user_id' => $user->id,
            'project' => 'zettly',
            'title' => 'today',
            'status' => 'in_progress',
            'started_at' => now('Asia/Jakarta')->setTimezone('UTC'),
            'last_activity_at' => now('Asia/Jakarta')->setTimezone('UTC'),
        ]);

        (new DispatchReportGeneration($user->id))->handle(
            app(ReportGenerator::class),
            app(ReportDeliveryService::class)
        );

        $this->assertSame(1, ReportDelivery::count(), 'the scheduled path must keep delivering');
    }
}
