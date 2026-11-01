<?php

namespace Tests\Unit;

use App\Models\AgentSession;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\Todo;
use App\Models\User;
use App\Services\ReportGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportGeneratorHistoricalTest extends TestCase
{
    use RefreshDatabase;

    private function wib(string $value): CarbonImmutable
    {
        return CarbonImmutable::parse($value, 'Asia/Jakarta');
    }

    public function test_a_legacy_day_with_no_sessions_still_reports_journal_and_todos(): void
    {
        // The imported legacy history has journal entries and todos but zero
        // agent sessions. It used to render as an empty report.
        $user = User::factory()->create();
        $day = $this->wib('2026-10-20 00:00:00');

        JournalEntry::create([
            'user_id' => $user->id,
            'entry_date' => '2026-10-20',
            'kind' => JournalEntry::KIND_ACTIVITY,
            'content' => "Rebuilt the backup pipeline and verified restore end to end.",
            'source' => 'legacy-markdown',
        ]);

        Todo::create([
            'user_id' => $user->id,
            'type' => Todo::TYPE_TODO,
            'title' => 'Finish the storage migration',
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertStringContainsString('Journal entries recorded: 1', $report->content);
        $this->assertStringContainsString('## Journal entries', $report->content);
        $this->assertStringContainsString('Rebuilt the backup pipeline', $report->content);
        $this->assertStringContainsString('Finish the storage migration', $report->content);
        $this->assertStringContainsString('(urgent)', $report->content);
    }

    public function test_journal_entries_outside_the_period_are_excluded(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-10-20 00:00:00');

        JournalEntry::create([
            'user_id' => $user->id, 'entry_date' => '2026-10-19', 'kind' => JournalEntry::KIND_ACTIVITY,
            'content' => 'yesterday work', 'source' => 'legacy-markdown',
        ]);
        JournalEntry::create([
            'user_id' => $user->id, 'entry_date' => '2026-10-21', 'kind' => JournalEntry::KIND_ACTIVITY,
            'content' => 'tomorrow work', 'source' => 'legacy-markdown',
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertStringNotContainsString('yesterday work', $report->content);
        $this->assertStringNotContainsString('tomorrow work', $report->content);
    }

    public function test_completed_todos_in_the_period_count_as_tasks_completed(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-10-20 00:00:00');

        Todo::create([
            'user_id' => $user->id, 'type' => Todo::TYPE_TODO, 'title' => 'shipped it',
            'is_completed' => true, 'completed_at' => $this->wib('2026-10-20 10:00:00')->setTimezone('UTC'),
            'priority' => Todo::PRIORITY_NOT_URGENT, 'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertStringContainsString('- Tasks completed: 1', $report->content);
        $this->assertStringNotContainsString('shipped it', $report->content); // completed items are not "outstanding"
    }

    public function test_generate_due_does_not_give_up_when_only_journal_history_exists(): void
    {
        // Regression: generateDue() returned early on `!earliest session`, so a
        // user whose only history is journal entries got no reports at all.
        $user = User::factory()->create();
        JournalEntry::create([
            'user_id' => $user->id, 'entry_date' => '2026-10-19', 'kind' => JournalEntry::KIND_ACTIVITY,
            'content' => 'legacy day one', 'source' => 'legacy-markdown',
        ]);

        $this->assertSame(0, AgentSession::where('user_id', $user->id)->count());

        $reports = app(ReportGenerator::class)->generateDue($user, $this->wib('2026-10-21 12:00:00'));

        $this->assertGreaterThan(0, $reports->count());
        $daily = Report::where('user_id', $user->id)->where('period_kind', 'daily')->get();
        $this->assertTrue($daily->contains(fn (Report $r) => $r->report_key === 'daily:2026-10-19:2026-10-19'));
        $this->assertStringContainsString('legacy day one', $daily->firstWhere('report_key', 'daily:2026-10-19:2026-10-19')->content);
    }

    public function test_open_todos_are_capped_and_labelled_as_backlog(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-10-20 00:00:00');

        for ($i = 1; $i <= 14; $i++) {
            Todo::create([
                'user_id' => $user->id, 'type' => Todo::TYPE_TODO, 'title' => 'open item '.$i,
                'is_completed' => false, 'priority' => Todo::PRIORITY_NOT_URGENT,
                'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
            ]);
        }

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertStringContainsString('open item 10', $report->content);
        $this->assertStringNotContainsString('open item 11', $report->content);
        $this->assertStringContainsString('and 4 more open todos', $report->content);
    }

    public function test_report_marks_secrets_before_rendering_journal_bodies(): void
    {
        $user = User::factory()->create();
        $day = $this->wib('2026-10-20 00:00:00');

        JournalEntry::create([
            'user_id' => $user->id, 'entry_date' => '2026-10-20', 'kind' => JournalEntry::KIND_ACTIVITY,
            'content' => 'rotated token: supersecretvalue123', 'source' => 'legacy-markdown',
        ]);

        $report = app(ReportGenerator::class)->generate($user, 'daily', $day, $day);

        $this->assertStringNotContainsString('supersecretvalue123', $report->content);
    }
}
