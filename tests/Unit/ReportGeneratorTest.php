<?php

namespace Tests\Unit;

use App\Models\AgentSession;
use App\Models\Report;
use App\Models\ReportSummary;
use App\Models\Tag;
use App\Models\Todo;
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

    /**
     * Timestamps are stored in UTC (the columns are `timestamp without time
     * zone` and the app timezone is UTC), so fixtures must be written the same
     * way production writes them.
     */
    private function utc(CarbonImmutable $at): CarbonImmutable
    {
        return $at->setTimezone('UTC');
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
            // 23:50 WIB and 00:10 WIB the next day, stored as UTC like production.
            'started_at' => $this->utc($start->copy()->addHours(23)->addMinutes(50)),
            'last_activity_at' => $this->utc($start->copy()->addDays(1)->addMinutes(10)),
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
            'status' => 'completed', 'completed_at' => $this->utc($day->copy()->addHours(9)),
            'started_at' => $this->utc($day->copy()->addHours(8)),
            'last_activity_at' => $this->utc($day->copy()->addHours(9)),
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

    public function test_render_adds_a_human_summary_block_between_headline_and_details(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-11-03 00:00:00');

        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'ship it',
            'status' => 'completed',
            'completed_at' => $this->utc($day->copy()->addHours(9)),
            'started_at' => $this->utc($day->copy()->addHours(8)),
            'last_activity_at' => $this->utc($day->copy()->addHours(9)),
            'duration_seconds' => 2580, 'machine' => 'MMCH',
            'files_changed' => [], 'errors' => [],
        ]);
        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'debug parser',
            'status' => 'in_progress',
            'started_at' => $this->utc($day->copy()->addHours(10)),
            'last_activity_at' => $this->utc($day->copy()->addHours(10)),
            'duration_seconds' => 1200, 'machine' => 'MMCH',
            'files_changed' => [], 'errors' => [],
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);
        $content = $report->content;

        // Placement: after the headline bullets, before the project details.
        $headline = strpos($content, '- Observed active-turn time');
        $summary = strpos($content, '## Summary');
        $details = strpos($content, '## Work by project');
        $this->assertNotFalse($summary, 'a human summary section is present');
        $this->assertLessThan($summary, $headline, 'the summary sits below the headline bullets');
        $this->assertLessThan($details, $summary, 'the summary sits above the project details');

        // The paragraph itself reads like a sentence, built from the same data.
        $this->assertStringContainsString('You logged 63 minutes of active agent work on MMCH in 1 project.', $content);
        $this->assertStringContainsString('You completed 1 task, including "ship it" in zettly.', $content);
        $this->assertStringContainsString('1 task remains in progress or blocked.', $content);

        // The pre-existing lines survive untouched.
        $this->assertStringContainsString('- Tasks in progress or blocked: 1', $content);
        $this->assertStringContainsString('## Next actions', $content);
    }

    public function test_a_quiet_day_summarizes_the_absence_of_activity(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-11-04 00:00:00');

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertStringContainsString('No recorded activity in this period.', $report->content);
        $this->assertStringNotContainsString('You logged', $report->content);
    }

    public function test_a_quiet_day_still_mentions_open_todos_in_the_summary(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-11-04 00:00:00');
        Todo::factory()->create(['user_id' => $user->id, 'title' => 'open one', 'is_completed' => false]);
        Todo::factory()->create(['user_id' => $user->id, 'title' => 'open two', 'is_completed' => false]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertStringContainsString(
            'No recorded activity in this period, but 2 todos are still open.',
            $report->content
        );
    }

    public function test_generate_writes_a_report_summary_row(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-11-03 00:00:00');

        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'ship it',
            'category' => 'Development',
            'status' => 'completed',
            'completed_at' => $this->utc($day->copy()->addHours(9)),
            'started_at' => $this->utc($day->copy()->addHours(8)),
            'last_activity_at' => $this->utc($day->copy()->addHours(9)),
            'duration_seconds' => 2580, 'machine' => 'MMCH',
            'files_changed' => [], 'errors' => [],
        ]);
        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'debug parser',
            'category' => 'Development',
            'status' => 'in_progress',
            'started_at' => $this->utc($day->copy()->addHours(10)),
            'last_activity_at' => $this->utc($day->copy()->addHours(10)),
            'duration_seconds' => 1200, 'machine' => 'MMCH',
            'files_changed' => [], 'errors' => [],
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);
        $summary = ReportSummary::where('report_id', $report->id)->first();

        $this->assertNotNull($summary, 'a report_summaries row is written with the report');
        $this->assertStringContainsString('You logged 63 minutes', $summary->digest);
        $this->assertSame(63, (int) $summary->active_minutes);
        $this->assertSame(1, (int) $summary->tasks_completed);
        $this->assertSame(1, (int) $summary->tasks_open);
        $this->assertSame(3780, $summary->projects_minutes['zettly']);
        $this->assertSame(3780, $summary->categories['Development']);
        $this->assertSame(['MMCH'], $summary->machines);
        // The raw report content is not touched by the summary row.
        $this->assertSame($report->content, Report::find($report->id)->content);
    }

    public function test_regenerating_a_report_does_not_duplicate_summary_rows(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-11-03 00:00:00');

        $first = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);
        $second = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertSame($first->id, $second->id, 'generate stays idempotent per report key');
        $this->assertSame(1, ReportSummary::where('report_id', $first->id)->count());
    }

    public function test_report_summary_tags_come_from_period_todos(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-11-05 00:00:00');
        $tag = Tag::factory()->create(['user_id' => $user->id, 'name' => 'release']);

        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'title' => 'cut the release',
            'is_completed' => true,
            'completed_at' => $this->utc($day->copy()->addHours(9)),
        ]);
        $todo->tags()->attach($tag->id);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);
        $summary = ReportSummary::where('report_id', $report->id)->first();

        $this->assertSame(['release' => 1], $summary->tags);
    }

    public function test_generate_includes_a_session_recorded_early_in_the_wib_day(): void
    {
        // Regression: the window was bound as a WIB wall clock against columns
        // that hold UTC. A session at 02:34 WIB (19:34 UTC the *previous* day)
        // then fell outside the [00:00, 23:59] window and the report was empty.
        $user = User::factory()->create();
        $day = $this->wib('2026-11-02 00:00:00');
        $startedAt = $day->copy()->addHours(2)->addMinutes(34); // 02:34 WIB = 19:34 UTC Nov 1

        AgentSession::factory()->create([
            'user_id' => $user->id,
            'project' => 'zettly',
            'title' => 'late night work',
            'status' => 'in_progress',
            'started_at' => $this->utc($startedAt),
            'last_activity_at' => $this->utc($startedAt),
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertStringContainsString('late night work', $report->content);
        $this->assertStringContainsString('- Projects: 1', $report->content);
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

    public function test_due_periods_emit_monthly_when_the_month_has_rolled_over(): void
    {
        // 2026-11-30 is the last day of November. Crossing into December means
        // the monthly period for November is due.
        $periods = ReportGenerator::duePeriods(
            $this->wib('2026-11-28 00:00:00'),
            $this->wib('2026-12-01 12:00:00')
        );

        $monthly = array_filter($periods, fn (array $p) => $p[0] === 'monthly');
        $this->assertCount(1, $monthly);
        [$kind, $start, $end] = array_values($monthly)[0];
        $this->assertSame('2026-11-01', $start->toDateString());
        $this->assertSame('2026-11-30', $end->toDateString());
    }

    public function test_due_periods_emit_yearly_on_new_year_rollover(): void
    {
        // Crossing from December 31 into January 1 makes the yearly report for
        // the prior year due.
        $periods = ReportGenerator::duePeriods(
            $this->wib('2025-12-29 00:00:00'),
            $this->wib('2026-01-01 12:00:00')
        );

        $yearly = array_filter($periods, fn (array $p) => $p[0] === 'yearly');
        $this->assertCount(1, $yearly);
        [, $start, $end] = array_values($yearly)[0];
        $this->assertSame('2025-01-01', $start->toDateString());
        $this->assertSame('2025-12-31', $end->toDateString());
    }
    public function test_completed_session_without_completed_at_still_counts(): void
    {
        // Historical rows written before the hook sent completed_at are still
        // finished work; reporting "Tasks completed: 0" for them is wrong.
        $user = User::factory()->create();
        $day = $this->wib('2026-11-02 00:00:00');

        AgentSession::factory()->create([
            'user_id' => $user->id,
            'project' => 'zettly',
            'title' => 'finished but untimestamped',
            'status' => 'completed',
            'completed_at' => null,
            'started_at' => $this->utc($day->copy()->addHours(9)),
            'last_activity_at' => $this->utc($day->copy()->addHours(10)),
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertStringContainsString('- Tasks completed: 1', $report->content);
    }

    public function test_an_undated_completion_is_surfaced_instead_of_vanishing(): void
    {
        // ACTIVE.md records a status but no dates, so the import leaves
        // completed_at null on purpose. The generator's query then matched neither
        // "completed in this period" nor "still open", so those tasks disappeared
        // from every report while the dashboard counted them.
        $user = User::factory()->create();
        $day = $this->wib('2026-11-02 00:00:00');

        Todo::factory()->for($user)->asTask()->create([
            'is_completed' => true,
            'completed_at' => null,
        ]);
        Todo::factory()->for($user)->asTask()->create([
            'is_completed' => true,
            'completed_at' => null,
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        // Not attributed to the period...
        $this->assertStringContainsString('- Tasks completed: 0', $report->content);
        // ...but not silently dropped either.
        $this->assertStringContainsString(
            'Undated completions: 2',
            $report->content,
            'Tasks marked done without a completion date must be reported, not hidden.'
        );
    }

    public function test_an_undated_completion_is_never_dated_by_its_creation_time(): void
    {
        // Every imported todo was created inside the same second by the importer,
        // so falling back to created_at would claim 26 tasks were finished on the
        // import day. The test pins the honest behaviour: no attribution.
        $user = User::factory()->create();
        $day = $this->wib('2026-11-02 00:00:00');

        Todo::factory()->for($user)->asTask()->create([
            'is_completed' => true,
            'completed_at' => null,
            'created_at' => $this->utc($day->copy()->addHours(10)),
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertStringContainsString('- Tasks completed: 0', $report->content);
        $this->assertStringContainsString('Undated completions: 1', $report->content);
    }

    public function test_a_period_without_undated_completions_says_nothing_about_them(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-11-02 00:00:00');

        Todo::factory()->for($user)->asTask()->create([
            'is_completed' => true,
            'completed_at' => $this->utc($day->copy()->addHours(9)),
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertStringContainsString('- Tasks completed: 1', $report->content);
        $this->assertStringNotContainsString('Undated completions', $report->content);
    }

    public function test_comparison_lines_for_a_busy_previous_period(): void
    {
        $current = [
            'active_minutes' => 63,
            'tasks_completed' => 3,
            'projects_minutes' => ['zettly' => 3780, 'n8n' => 600],
            'categories' => ['Development' => 3780, 'Ops' => 600],
            'tags' => ['release' => 2, 'reports' => 1],
            'machines' => ['MMCH'],
        ];
        $previous = [
            'active_minutes' => 90,
            'tasks_completed' => 1,
            'projects_minutes' => ['n8n' => 2700, 'zettly' => 600],
            'categories' => ['Development' => 2700, 'Ops' => 600],
            'tags' => ['dev' => 4, 'server' => 2],
            'machines' => ['MMCH'],
        ];

        $lines = ReportGenerator::comparisonLines($current, $previous);

        $this->assertSame([
            'Active time: 63 min vs 90 min (-30%).',
            'Tasks completed: 3 vs 1.',
            'Top project: zettly (63 min) vs n8n (45 min).',
            'Top tags: release, reports vs dev, server.',
        ], $lines);
    }

    public function test_comparison_lines_when_the_previous_period_was_quiet(): void
    {
        $current = [
            'active_minutes' => 63,
            'tasks_completed' => 1,
            'projects_minutes' => ['zettly' => 3780],
            'categories' => [],
            'tags' => [],
            'machines' => ['MMCH'],
        ];
        $quiet = [
            'active_minutes' => 0,
            'tasks_completed' => 0,
            'projects_minutes' => [],
            'categories' => [],
            'tags' => [],
            'machines' => [],
        ];

        $lines = ReportGenerator::comparisonLines($current, $quiet);

        $this->assertSame(
            ['No activity recorded in the previous period, so there is no baseline to compare yet.'],
            $lines
        );
    }

    public function test_comparison_lines_without_any_previous_period(): void
    {
        $lines = ReportGenerator::comparisonLines([
            'active_minutes' => 15,
            'tasks_completed' => 1,
            'projects_minutes' => ['n8n' => 900],
            'categories' => [],
            'tags' => [],
            'machines' => [],
        ], null);

        $this->assertSame(
            ['Unavailable until automated records exist for both periods.'],
            $lines
        );
    }

    public function test_comparison_lines_handle_a_zero_minute_baseline(): void
    {
        $current = [
            'active_minutes' => 15,
            'tasks_completed' => 1,
            'projects_minutes' => ['n8n' => 900],
            'categories' => [],
            'tags' => ['reports' => 1],
            'machines' => ['MMCH'],
        ];
        $previous = [
            'active_minutes' => 0,
            'tasks_completed' => 2,
            'projects_minutes' => [],
            'categories' => [],
            'tags' => ['release' => 1],
            'machines' => [],
        ];

        $lines = ReportGenerator::comparisonLines($current, $previous);

        $this->assertSame([
            'Active time: 15 min vs 0 min (no baseline yet).',
            'Tasks completed: 1 vs 2.',
            'Top project: n8n (15 min); none in the previous period.',
            'Top tags: reports vs release.',
        ], $lines);
    }

    public function test_comparison_lines_when_no_active_time_was_recorded_on_either_side(): void
    {
        $current = [
            'active_minutes' => 0,
            'tasks_completed' => 1,
            'projects_minutes' => [],
            'categories' => [],
            'tags' => ['reports' => 1],
            'machines' => [],
        ];
        $previous = [
            'active_minutes' => 0,
            'tasks_completed' => 2,
            'projects_minutes' => [],
            'categories' => [],
            'tags' => ['release' => 1],
            'machines' => [],
        ];

        $lines = ReportGenerator::comparisonLines($current, $previous);

        $this->assertSame([
            'Tasks completed: 1 vs 2.',
            'Top tags: reports vs release.',
            'No active-time baseline yet: agent sessions have not recorded time.',
        ], $lines);
    }

    public function test_generate_writes_real_historical_comparison_into_content(): void
    {
        $user = User::factory()->create();
        $yesterday = $this->wib('2026-11-02 00:00:00');
        $today = $this->wib('2026-11-03 00:00:00');

        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'yesterday work',
            'category' => 'Development', 'status' => 'completed',
            'completed_at' => $this->utc($yesterday->copy()->addHours(9)),
            'started_at' => $this->utc($yesterday->copy()->addHours(7)),
            'last_activity_at' => $this->utc($yesterday->copy()->addHours(9)),
            'duration_seconds' => 5400, 'machine' => 'MMCH',
            'files_changed' => [], 'errors' => [],
        ]);

        $first = app(ReportGenerator::class)->generate($user, 'daily', $yesterday, $yesterday);
        $this->assertStringContainsString(
            '- Unavailable until automated records exist for both periods.',
            $first->content
        );

        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'ship it',
            'category' => 'Development', 'status' => 'completed',
            'completed_at' => $this->utc($today->copy()->addHours(9)),
            'started_at' => $this->utc($today->copy()->addHours(8)),
            'last_activity_at' => $this->utc($today->copy()->addHours(9)),
            'duration_seconds' => 2580, 'machine' => 'MMCH',
            'files_changed' => [], 'errors' => [],
        ]);
        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'debug parser',
            'category' => 'Development', 'status' => 'in_progress',
            'started_at' => $this->utc($today->copy()->addHours(10)),
            'last_activity_at' => $this->utc($today->copy()->addHours(10)),
            'duration_seconds' => 1200, 'machine' => 'MMCH',
            'files_changed' => [], 'errors' => [],
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $today, $today);

        $this->assertStringContainsString('- Active time: 63 min vs 90 min (-30%).', $report->content);
        $this->assertStringContainsString('- Tasks completed: 1 vs 1.', $report->content);
        $this->assertStringContainsString(
            '- Top project: zettly (63 min) vs zettly (90 min).',
            $report->content
        );
        $this->assertStringNotContainsString('Unavailable until automated records', $report->content);
    }
}