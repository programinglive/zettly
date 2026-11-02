<?php

namespace Tests\Unit;

use App\Models\AgentSession;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\Todo;
use App\Models\User;
use App\Models\UserReportChannel;
use App\Services\ReportGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportPeriodsTest extends TestCase
{
    use RefreshDatabase;

    private function wib(string $v): CarbonImmutable
    {
        return CarbonImmutable::parse($v, 'Asia/Jakarta');
    }

    private function utc(CarbonImmutable $at): CarbonImmutable
    {
        return $at->setTimezone('UTC');
    }

    public function test_a_weekly_report_spans_seven_days_and_collects_all_of_them(): void
    {
        // Weekly/monthly were never exercised with real data; only daily was.
        $user = User::factory()->create();
        $end = $this->wib('2026-11-01 00:00:00');
        $start = $end->copy()->subDays(6);

        // One session on the first day, one on the last: both must appear.
        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'first day work',
            'status' => 'in_progress',
            'started_at' => $this->utc($start->copy()->addHours(10)),
            'last_activity_at' => $this->utc($start->copy()->addHours(11)),
        ]);
        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'last day work',
            'status' => 'in_progress',
            'started_at' => $this->utc($end->copy()->addHours(10)),
            'last_activity_at' => $this->utc($end->copy()->addHours(11)),
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'weekly', $start, $end);

        $this->assertSame('weekly:2026-10-26:2026-11-01', $report->report_key);
        $this->assertStringContainsString('Weekly Productivity Report', $report->content);
        $this->assertStringContainsString('first day work', $report->content);
        $this->assertStringContainsString('last day work', $report->content);
    }

    public function test_a_monthly_report_collects_the_whole_month(): void
    {
        $user = User::factory()->create();
        $start = $this->wib('2026-10-01 00:00:00');
        $end = $this->wib('2026-10-31 00:00:00');

        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'early october',
            'status' => 'in_progress',
            'started_at' => $this->utc($start->copy()->addDays(2)),
            'last_activity_at' => $this->utc($start->copy()->addDays(2)->addHour()),
        ]);
        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'late october',
            'status' => 'in_progress',
            'started_at' => $this->utc($end->copy()->subDays(1)),
            'last_activity_at' => $this->utc($end->copy()->subDays(1)->addHour()),
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'monthly', $start, $end);

        $this->assertStringContainsString('Monthly Performance Report', $report->content);
        $this->assertStringContainsString('early october', $report->content);
        $this->assertStringContainsString('late october', $report->content);
    }

    public function test_generate_current_emits_weekly_only_on_the_boundary_day(): void
    {
        $user = User::factory()->create();
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'work',
            'status' => 'in_progress',
            'started_at' => $this->utc($this->wib('2026-11-01 10:00:00')),
            'last_activity_at' => $this->utc($this->wib('2026-11-01 11:00:00')),
        ]);

        $gen = app(ReportGenerator::class);

        // 2026-11-01 is a Sunday: daily + weekly due.
        $sunday = $gen->generateCurrent($user, $this->wib('2026-11-01 23:55:00'));
        $kinds = $sunday->pluck('period_kind')->unique()->sort()->values()->all();
        $this->assertContains('daily', $kinds);
        $this->assertContains('weekly', $kinds);

        // 2026-11-02 is a Monday: daily only.
        $monday = $gen->generateCurrent($user, $this->wib('2026-11-02 23:55:00'));
        $kinds2 = $monday->pluck('period_kind')->unique()->values()->all();
        $this->assertSame(['daily'], $kinds2);
    }

    public function test_monthly_is_due_on_the_last_day_of_the_month(): void
    {
        $user = User::factory()->create();
        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'work',
            'status' => 'in_progress',
            'started_at' => $this->utc($this->wib('2026-10-30 10:00:00')),
            'last_activity_at' => $this->utc($this->wib('2026-10-30 11:00:00')),
        ]);

        $reports = app(ReportGenerator::class)->generateCurrent($user, $this->wib('2026-10-31 23:55:00'));
        $kinds = $reports->pluck('period_kind')->unique()->sort()->values()->all();

        $this->assertContains('monthly', $kinds);
    }
}
