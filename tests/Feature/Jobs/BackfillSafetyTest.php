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

    // The nightly run must be testable on any wall-clock date: it injects
    // its own "now" instead of assuming which periods close today.

    public function test_nightly_run_delivers_one_daily_report_on_a_plain_day(): void
    {
        $user = $this->userWithChannel();
        \App\Models\AgentSession::factory()->create([
            'user_id' => $user->id,
            'project' => 'zettly',
            'title' => 'today',
            'status' => 'in_progress',
            'started_at' => \Carbon\CarbonImmutable::parse('2026-11-06 09:00:00', 'Asia/Jakarta')->setTimezone('UTC'),
            'last_activity_at' => \Carbon\CarbonImmutable::parse('2026-11-06 17:00:00', 'Asia/Jakarta')->setTimezone('UTC'),
        ]);

        // Friday 2026-11-06 23:59 WIB: only the daily period closes tonight.
        $this->runNightly($user, '2026-11-06 23:59:00');

        $this->assertSame(1, ReportDelivery::count(), 'a plain day delivers its daily report');
        $this->assertSame('daily:2026-11-06:2026-11-06', ReportDelivery::first()->report->report_key);
    }

    public function test_nightly_run_delivers_daily_and_weekly_reports_on_sunday(): void
    {
        $user = $this->userWithChannel();

        // Sunday 2026-11-08 23:59 WIB: the weekly Monday..Sunday period also closes.
        $this->runNightly($user, '2026-11-08 23:59:00');

        $this->assertSame(2, ReportDelivery::count(), 'a Sunday delivers its daily and weekly reports');

        $keys = $this->deliveredKeys();
        $this->assertSame(['daily:2026-11-08:2026-11-08', 'weekly:2026-11-02:2026-11-08'], $keys);
    }

    public function test_nightly_run_delivers_daily_and_monthly_reports_at_month_end(): void
    {
        $user = $this->userWithChannel();

        // Monday 2026-11-30 23:59 WIB: the November monthly period closes.
        $this->runNightly($user, '2026-11-30 23:59:00');

        $keys = $this->deliveredKeys();
        $this->assertSame(['daily:2026-11-30:2026-11-30', 'monthly:2026-11-01:2026-11-30'], $keys);
    }

    public function test_nightly_run_delivers_daily_monthly_and_yearly_reports_at_year_end(): void
    {
        $user = $this->userWithChannel();

        // Thursday 2026-12-31 23:59 WIB: December monthly and the yearly period close.
        $this->runNightly($user, '2026-12-31 23:59:00');

        $keys = $this->deliveredKeys();
        $this->assertSame([
            'daily:2026-12-31:2026-12-31',
            'monthly:2026-12-01:2026-12-31',
            'yearly:2026-01-01:2026-12-31',
        ], $keys);
    }

    private function deliveredKeys(): array
    {
        return ReportDelivery::with('report')->get()
            ->map(fn (ReportDelivery $row) => $row->report->report_key)
            ->sort()
            ->values()
            ->all();
    }

    private function userWithChannel(): User
    {
        $user = User::factory()->create();
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        return $user;
    }

    private function runNightly(User $user, string $nowWib): void
    {
        (new DispatchReportGeneration($user->id))->handle(
            app(ReportGenerator::class),
            app(ReportDeliveryService::class),
            \Carbon\CarbonImmutable::parse($nowWib, 'Asia/Jakarta')
        );
    }
}
