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
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsCatchUpTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Nights where the host was down do not resurface as a burst of Discord
     * messages: missed periods are written to the database only, while the
     * period closing tonight keeps its normal delivery.
     */
    public function test_nightly_run_writes_missed_days_without_delivery_rows(): void
    {
        $user = $this->userWithChannel();
        // Simulate missed nights: the last generated report is from Nov 5.
        foreach (['2026-11-03', '2026-11-04', '2026-11-05'] as $day) {
            Report::factory()->create([
                'user_id' => $user->id,
                'period_kind' => 'daily',
                'period_start' => $day,
                'period_end' => $day,
                'report_key' => "daily:{$day}:{$day}",
            ]);
        }

        // Monday 2026-11-09: Nov 6..8 closed without a run; Nov 8 was a
        // Sunday, so the weekly 11-02..11-08 period closed too.
        $this->runNightly($user, '2026-11-09 23:59:00');

        $keys = Report::where('user_id', $user->id)->pluck('report_key')->sort()->values()->all();
        $this->assertSame([
            'daily:2026-11-03:2026-11-03',
            'daily:2026-11-04:2026-11-04',
            'daily:2026-11-05:2026-11-05',
            'daily:2026-11-06:2026-11-06',
            'daily:2026-11-07:2026-11-07',
            'daily:2026-11-08:2026-11-08',
            'daily:2026-11-09:2026-11-09',
            'weekly:2026-11-02:2026-11-08',
        ], $keys, 'missed days and the closed week are written, plus tonight\'s daily');

        // Only tonight\'s daily report may reach the delivery queue.
        $this->assertSame(1, ReportDelivery::count(), 'catch-up must not queue delivery for missed periods');
        $this->assertSame('daily:2026-11-09:2026-11-09', ReportDelivery::first()->report->report_key);
    }

    public function test_nightly_run_catches_up_from_first_activity_when_no_reports_exist(): void
    {
        $user = $this->userWithChannel();
        JournalEntry::create([
            'user_id' => $user->id,
            'entry_date' => '2026-11-01',
            'kind' => JournalEntry::KIND_ACTIVITY,
            'content' => 'first recorded day',
            'source' => 'legacy-markdown',
        ]);

        $this->runNightly($user, '2026-11-09 23:59:00');

        $written = Report::where('user_id', $user->id)->pluck('report_key')->sort()->values()->all();
        $this->assertSame([
            'daily:2026-11-01:2026-11-01',
            'daily:2026-11-02:2026-11-02',
            'daily:2026-11-03:2026-11-03',
            'daily:2026-11-04:2026-11-04',
            'daily:2026-11-05:2026-11-05',
            'daily:2026-11-06:2026-11-06',
            'daily:2026-11-07:2026-11-07',
            'daily:2026-11-08:2026-11-08',
            'daily:2026-11-09:2026-11-09',
            // 2026-11-01 is a Sunday: that week's report closes inside the gap.
            'weekly:2026-10-26:2026-11-01',
            'weekly:2026-11-02:2026-11-08',
        ], $written, 'history is written from the first recorded activity');

        $this->assertSame(1, ReportDelivery::count(), 'history must not flood the delivery queue');
        $this->assertSame('daily:2026-11-09:2026-11-09', ReportDelivery::first()->report->report_key);
    }

    public function test_nightly_run_with_no_gap_writes_only_the_current_period(): void
    {
        $user = $this->userWithChannel();
        foreach (['2026-11-07', '2026-11-08'] as $day) {
            Report::factory()->create([
                'user_id' => $user->id,
                'period_kind' => 'daily',
                'period_start' => $day,
                'period_end' => $day,
                'report_key' => "daily:{$day}:{$day}",
            ]);
        }

        $this->runNightly($user, '2026-11-09 23:59:00');

        $keys = Report::where('user_id', $user->id)->pluck('report_key')->sort()->values()->all();
        $this->assertSame([
            'daily:2026-11-07:2026-11-07',
            'daily:2026-11-08:2026-11-08',
            'daily:2026-11-09:2026-11-09',
        ], $keys, 'no catch-up is needed when every day is already reported');

        $this->assertSame(1, ReportDelivery::count());
        $this->assertSame('daily:2026-11-09:2026-11-09', ReportDelivery::first()->report->report_key);
    }

    public function test_catch_up_writes_history_even_when_delivery_is_disabled(): void
    {
        $user = User::factory()->create();
        foreach (['2026-11-07', '2026-11-08'] as $day) {
            Report::factory()->create([
                'user_id' => $user->id,
                'period_kind' => 'daily',
                'period_start' => $day,
                'period_end' => $day,
                'report_key' => "daily:{$day}:{$day}",
            ]);
        }

        // --no-deliver semantics: nothing is enqueued, but the gap is still closed.
        (new DispatchReportGeneration($user->id, backfill: false, deliver: false))->handle(
            app(ReportGenerator::class),
            app(ReportDeliveryService::class),
            CarbonImmutable::parse('2026-11-09 23:59:00', 'Asia/Jakarta')
        );

        $this->assertSame(1, Report::where('user_id', $user->id)->where('report_key', 'daily:2026-11-09:2026-11-09')->count());
        $this->assertSame(0, ReportDelivery::count());
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
            CarbonImmutable::parse($nowWib, 'Asia/Jakarta')
        );
    }
}
