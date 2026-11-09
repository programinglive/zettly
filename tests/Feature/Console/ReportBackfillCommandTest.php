<?php

namespace Tests\Feature\Console;

use App\Models\AgentSession;
use App\Models\Report;
use App\Models\ReportSummary;
use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportBackfillCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_backfill_fills_missing_summary_rows_from_raw_data(): void
    {
        $user = User::factory()->create();
        $day = CarbonImmutable::parse('2026-11-05 00:00:00', 'Asia/Jakarta');
        $utc = fn ($at) => $at->setTimezone('UTC');

        $legacy = Report::factory()->create([
            'user_id' => $user->id,
            'period_kind' => 'daily',
            'period_start' => '2026-11-05',
            'period_end' => '2026-11-05',
            'report_key' => 'daily:2026-11-05:2026-11-05',
            'content' => "# Daily Activity Summary: 2026-11-05 - 2026-11-05\n\n- Machines: MMCH",
        ]);

        $contentBefore = $legacy->content;

        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'n8n', 'title' => 'wire the flow',
            'category' => 'Automation', 'status' => 'completed',
            'completed_at' => $utc($day->copy()->addHours(9)),
            'started_at' => $utc($day->copy()->addHours(8)),
            'last_activity_at' => $utc($day->copy()->addHours(9)),
            'duration_seconds' => 1800, 'machine' => 'MMCH',
            'files_changed' => [], 'errors' => [],
        ]);

        $tag = Tag::factory()->create(['user_id' => $user->id, 'name' => 'release']);
        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'title' => 'cut the release',
            'is_completed' => true,
            'completed_at' => $utc($day->copy()->addHours(9)),
        ]);
        $todo->tags()->attach($tag->id);

        $this->artisan('reports:backfill-summaries')->assertSuccessful();

        $summary = ReportSummary::where('report_id', $legacy->id)->first();

        $this->assertNotNull($summary, 'a summary row is created for the legacy report');
        $this->assertStringContainsString('You logged 30 minutes', $summary->digest);
        $this->assertSame(30, (int) $summary->active_minutes);
        $this->assertSame(1800, $summary->projects_minutes['n8n']);
        $this->assertSame(['release' => 1], $summary->tags);
        // The raw report content is never rewritten by the backfill.
        $this->assertSame($contentBefore, $legacy->fresh()->content);

        // Idempotent: a second run adds no rows.
        $this->artisan('reports:backfill-summaries')->assertSuccessful();
        $this->assertSame(1, ReportSummary::where('report_id', $legacy->id)->count());
    }

    public function test_backfill_skips_reports_that_already_have_rows(): void
    {
        $user = User::factory()->create();

        $report = Report::factory()->create([
            'user_id' => $user->id,
            'report_key' => 'daily:2026-11-06:2026-11-06',
        ]);
        ReportSummary::create([
            'report_id' => $report->id,
            'user_id' => $user->id,
            'period_kind' => 'daily',
            'period_start' => '2026-11-06',
            'period_end' => '2026-11-06',
            'digest' => 'Existing digest.',
        ]);

        $this->artisan('reports:backfill-summaries')->assertSuccessful();

        $this->assertSame(1, ReportSummary::where('report_id', $report->id)->count());
        $this->assertSame('Existing digest.', ReportSummary::where('report_id', $report->id)->first()->digest);
    }
}
