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

    public function test_legacy_report_generator_output_is_byte_for_byte_unchanged(): void
    {
        [$start, $end] = ReportGenerator::periodFor(Report::KIND_WEEKLY, $this->wib('2026-11-17'));
        $legacy = app(ReportGenerator::class)->render(
            Report::KIND_WEEKLY, $start, $end, new Collection, new Collection, new Collection, 0
        );

        $expected = <<<'MD'
# Weekly Productivity Report: 2026-11-16 - 2026-11-22

- Machines: Unavailable
- Projects: 0
- Tasks completed: 0
- Tasks in progress or blocked: 0
- Observed active-turn time: 0 minutes (not total working time)

## Summary

No recorded activity in this period.

## Work by project

## Outstanding work

- None recorded.

## Next actions

- Continue from activity/ACTIVE.md.

## Historical comparison

- Unavailable until automated records exist for both periods.
MD;

        $this->assertSame($expected."\n", $legacy);
    }

    public function test_next_actions_include_overdue_tasks_from_previous_weeks(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $overdue = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Overdue from last week', 'due_date' => '2026-11-10',
        ]);
        $current = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Due this week', 'due_date' => '2026-11-18',
        ]);
        Todo::factory()->for($user)->asTask()->create([
            'title' => 'Completed overdue', 'due_date' => '2026-11-09',
            'is_completed' => true, 'completed_at' => now(),
        ]);
        Todo::factory()->for($user)->asTask()->create([
            'title' => 'No due date urgent', 'priority' => 'urgent', 'due_date' => null,
        ]);
        Todo::factory()->for($other)->asTask()->create([
            'title' => 'Another users overdue task', 'due_date' => '2026-11-08',
        ]);

        $items = $this->digest($user)['sections']['next_actions']['items'];
        $titles = collect($items)->pluck('title')->all();

        $this->assertContains('Overdue from last week', $titles);
        $this->assertContains('Due this week', $titles);
        $this->assertNotContains('Completed overdue', $titles);
        $this->assertNotContains('No due date urgent', $titles);
        $this->assertNotContains('Another users overdue task', $titles);
        $this->assertSame(['Overdue from last week', 'Due this week'], array_slice($titles, 0, 2));
        $this->assertSame($overdue->id, $items[0]['id']);
        $this->assertSame($current->id, $items[1]['id']);
    }

    public function test_blocked_tag_detection_is_case_insensitive_without_false_positives(): void
    {
        $user = User::factory()->create();
        $expectedIds = [];

        foreach (['Blocked', 'WAITING', 'waiting', 'BLOCKED'] as $index => $name) {
            $tag = Tag::factory()->for($user)->create(['name' => $name]);
            $todo = Todo::factory()->for($user)->asTask()->create(['title' => "Tagged {$name}"]);
            $todo->tags()->attach($tag);
            $expectedIds[] = $todo->id;
        }

        foreach (['block', 'not-blocked', 'proyek:waiting-review'] as $name) {
            $tag = Tag::factory()->for($user)->create(['name' => $name]);
            $todo = Todo::factory()->for($user)->asTask()->create(['title' => "Irrelevant {$name}"]);
            $todo->tags()->attach($tag);
        }

        $items = $this->digest($user)['sections']['blocked_work']['items'];
        $ids = collect($items)->pluck('id')->all();

        sort($expectedIds);
        sort($ids);
        $this->assertSame($expectedIds, $ids);
    }

    public function test_sections_are_bounded_with_explicit_truncation_metadata(): void
    {
        $user = User::factory()->create();
        Todo::factory()->for($user)->asTask()->count(80)->sequence(
            fn ($sequence) => ['title' => "Dated task {$sequence->index}", 'due_date' => '2026-11-19']
        )->create();

        $digest = $this->digest($user);
        $section = $digest['sections']['next_actions'];

        $this->assertSame(80, $section['total']);
        $this->assertLessThanOrEqual(50, $section['shown']);
        $this->assertCount($section['shown'], $section['items']);
        $this->assertTrue($section['truncated']);
        foreach ($digest['sections'] as $candidate) {
            $this->assertArrayHasKey('total', $candidate);
            $this->assertArrayHasKey('shown', $candidate);
            $this->assertArrayHasKey('truncated', $candidate);
            $this->assertLessThanOrEqual(50, $candidate['shown']);
        }
        $this->assertLessThan(20000, strlen(json_encode($digest)));
    }
}
