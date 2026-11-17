<?php

namespace Tests\Unit;

use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use App\Services\ReportGenerator;
use App\Services\WeeklyDigestService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class WeeklyDigestServiceTest extends TestCase
{
    use RefreshDatabase;

    private function wib(string $value): CarbonImmutable
    {
        return CarbonImmutable::parse($value, 'Asia/Jakarta');
    }

    private function digest(User $user, string $date = '2026-11-17'): array
    {
        [$start, $end] = ReportGenerator::periodFor(Report::KIND_WEEKLY, $this->wib($date));

        return app(WeeklyDigestService::class)->forUser($user, $start, $end);
    }

    public function test_each_section_has_a_provenance_and_drawn_from_a_real_source(): void
    {
        $user = User::factory()->create();
        $blockedTag = Tag::factory()->for($user)->create(['name' => 'blocked']);

        $done = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Shipped task', 'is_completed' => true,
            'completed_at' => $this->wib('2026-11-16 10:00:00')->setTimezone('UTC'),
        ]);
        $blocked = Todo::factory()->for($user)->asTask()->create(['title' => 'Blocked task']);
        $blocked->tags()->attach($blockedTag);
        JournalEntry::factory()->for($user)->create([
            'kind' => JournalEntry::KIND_DECISION, 'entry_date' => '2026-11-16',
            'content' => 'Chose the additive-column approach.',
        ]);
        Todo::factory()->for($user)->asNote()->create(['title' => 'Reusable note']);
        Todo::factory()->for($user)->asTask()->create([
            'title' => 'Dated next action', 'due_date' => '2026-11-19',
        ]);

        $digest = $this->digest($user);

        $this->assertSame(
            ['completed_work', 'blocked_work', 'important_decisions', 'knowledge_captured', 'next_actions'],
            array_keys($digest['sections'])
        );
        foreach ($digest['sections'] as $section) {
            $this->assertNotEmpty($section['provenance']);
            $this->assertContains($section['status'], ['ok', 'no_data']);
        }
        $this->assertSame($done->id, $digest['sections']['completed_work']['items'][0]['id']);
        $this->assertSame($blocked->id, $digest['sections']['blocked_work']['items'][0]['id']);
        $this->assertSame('decision', $digest['sections']['important_decisions']['items'][0]['kind']);
        $this->assertSame('todos.type=note', $digest['sections']['knowledge_captured']['provenance']);
    }

    public function test_undated_completion_is_excluded_and_counted_only_as_data_quality(): void
    {
        $user = User::factory()->create();
        Todo::factory()->for($user)->asTask()->create([
            'title' => 'Undated done', 'is_completed' => true, 'completed_at' => null,
        ]);

        $digest = $this->digest($user);

        $this->assertSame([], $digest['sections']['completed_work']['items']);
        $this->assertSame(1, $digest['data_quality']['undated_completions']);
        $this->assertSame('no_data', $digest['sections']['completed_work']['status']);
    }

    public function test_agent_metrics_are_not_measured_without_agent_sessions(): void
    {
        $user = User::factory()->create();

        $digest = $this->digest($user);

        $this->assertSame('Not measured', $digest['metrics']['agent_active_minutes']['value']);
        $this->assertSame('Not measured', $digest['metrics']['machines']['value']);
        $this->assertSame('Not measured', $digest['metrics']['projects']['value']);
        $this->assertIsInt($digest['metrics']['tasks_completed']['value']);
    }

    public function test_next_actions_use_only_dated_todos_and_handoff_journals(): void
    {
        $user = User::factory()->create();
        Todo::factory()->for($user)->asTask()->create([
            'title' => 'Undated urgent item', 'priority' => 'urgent', 'due_date' => null,
        ]);
        Todo::factory()->for($user)->asTask()->create([
            'title' => 'Dated item', 'due_date' => '2026-11-19',
        ]);
        JournalEntry::factory()->for($user)->create([
            'kind' => JournalEntry::KIND_HANDOFF, 'entry_date' => '2026-11-16',
            'content' => 'Handover: resume the migration.',
        ]);

        $digest = $this->digest($user);
        $titles = collect($digest['sections']['next_actions']['items'])->pluck('title')->all();

        $this->assertContains('Dated item', $titles);
        $this->assertNotContains('Undated urgent item', $titles);
        $this->assertContains('Handover: resume the migration.', $titles);
        $this->assertStringNotContainsString('ACTIVE.md', json_encode($digest));
    }

    public function test_legacy_report_generator_keeps_its_static_next_actions_line(): void
    {
        [$start, $end] = ReportGenerator::periodFor(Report::KIND_WEEKLY, $this->wib('2026-11-17'));
        $legacy = app(ReportGenerator::class)->render(
            Report::KIND_WEEKLY, $start, $end, new Collection, new Collection, new Collection, 0
        );

        $this->assertStringContainsString('## Next actions', $legacy);
        $this->assertStringContainsString('- Continue from activity/ACTIVE.md.', $legacy);
    }
}
