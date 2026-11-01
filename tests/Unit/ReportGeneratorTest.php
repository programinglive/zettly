<?php

namespace Tests\Unit;

use App\Models\AgentSession;
use App\Models\Report;
use App\Models\User;
use App\Services\ReportGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportGeneratorTest extends TestCase
{
    use RefreshDatabase;

    private function wib(string $value): CarbonImmutable
    {
        return CarbonImmutable::parse($value, 'Asia/Jakarta');
    }

    public function test_cutoff_rolls_back_before_2355_wib(): void
    {
        $this->assertSame('2026-11-01', ReportGenerator::cutoff($this->wib('2026-11-01 12:00:00'))->toDateString());
        $this->assertSame('2026-10-31', ReportGenerator::cutoff($this->wib('2026-11-01 23:00:00'))->toDateString());
        $this->assertSame('2026-11-01', ReportGenerator::cutoff($this->wib('2026-11-01 23:55:00'))->toDateString());
    }

    public function test_a_session_just_before_midnight_wib_lands_in_the_earlier_day(): void
    {
        $user = User::factory()->create();
        $start = $this->wib('2026-11-01 00:00:00');
        AgentSession::factory()->create([
            'user_id' => $user->id,
            'title' => 'late night fix',
            'started_at' => $start->copy()->addHours(23)->addMinutes(50), // 23:50 WIB
            'last_activity_at' => $start->copy()->addDays(1)->addMinutes(10), // 00:10 WIB next day
        ]);

        $report = app(ReportGenerator::class)->generate(
            $user, 'daily', $start, $start
        );

        $this->assertStringContainsString('late night fix', $report->content);
        $this->assertSame('daily:2026-11-01:2026-11-01', $report->report_key);
    }

    public function test_a_day_with_no_sessions_still_renders_a_valid_report(): void
    {
        $user = User::factory()->create();

        $report = app(ReportGenerator::class)->generate(
            $user, 'daily',
            $this->wib('2026-11-01 00:00:00'),
            $this->wib('2026-11-01 00:00:00')
        );

        $this->assertStringContainsString('# Daily Activity Summary: 2026-11-01 - 2026-11-01', $report->content);
        $this->assertStringContainsString('- Tasks completed: 0', $report->content);
        $this->assertStringContainsString('- None recorded.', $report->content);
    }

    public function test_render_groups_work_by_project_and_counts_completions(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-11-01 00:00:00');
        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'ship it',
            'status' => 'completed', 'completed_at' => $day->copy()->addHours(9),
            'started_at' => $day->copy()->addHours(8),
            'last_activity_at' => $day->copy()->addHours(9),
            'duration_seconds' => 3600, 'machine' => 'MMCH',
            'files_changed' => ['app/Foo.php'], 'errors' => [],
        ]);

        $report = app(ReportGenerator::class)->generate(
            $user, 'daily', $day, $day
        );

        $this->assertStringContainsString('- Machines: MMCH', $report->content);
        $this->assertStringContainsString('### zettly', $report->content);
        $this->assertStringContainsString('**ship it** — completed', $report->content);
        $this->assertStringContainsString('Modified files: app/Foo.php', $report->content);
        $this->assertStringContainsString('60 minutes', $report->content);
    }

    public function test_generate_is_idempotent_per_report_key(): void
    {
        $user = User::factory()->create();
        $start = $this->wib('2026-11-01 00:00:00');

        app(ReportGenerator::class)->generate($user, 'daily', $start, $start);
        app(ReportGenerator::class)->generate($user, 'daily', $start, $start);

        $this->assertSame(1, Report::count());
    }

    public function test_due_periods_emit_weekly_on_sunday_and_monthly_on_month_end(): void
    {
        // 2026-11-01 is a Sunday. With $now before the day's cutoff window
        // (before 23:00 WIB) the end date is still 2026-11-01, so daily + weekly
        // for that day are due; monthly is not (that is not a month boundary).
        $periods = ReportGenerator::duePeriods(
            $this->wib('2026-11-01 00:00:00'),
            $this->wib('2026-11-01 12:00:00')
        );

        $kinds = array_column($periods, 0);
        $this->assertContains('daily', $kinds);
        $this->assertContains('weekly', $kinds);
        $this->assertNotContains('monthly', $kinds);
        $this->assertNotContains('yearly', $kinds);
    }
}
