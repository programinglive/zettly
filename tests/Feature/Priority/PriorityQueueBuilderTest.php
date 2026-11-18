<?php

namespace Tests\Feature\Priority;

use App\Domain\Priority\DayPlanner;
use App\Domain\Priority\MainWorkService;
use App\Domain\Priority\PriorityQueueBuilder;
use App\Models\Focus;
use App\Models\MainWork;
use App\Models\Todo;
use App\Models\User;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PriorityQueueBuilderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private CarbonImmutable $today;

    private UserPrioritySetting $settings;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->today = CarbonImmutable::parse('2026-11-17 08:00', 'Asia/Jakarta');
        $this->travelTo(CarbonImmutable::parse('2026-11-17 08:00', 'Asia/Jakarta'));

        $this->settings = UserPrioritySetting::create([
            'user_id' => $this->user->id,
            'wip_limit' => 2,
            'daily_capacity_minutes' => 240,
            'queue_size' => 5,
            'require_focus' => true,
            'require_estimate' => false,
            'max_p0' => 2,
            'main_work_strict' => true,
            'enabled' => true,
        ]);
    }

    private function todo(string $title, array $attributes = []): Todo
    {
        return Todo::create(array_merge([
            'user_id' => $this->user->id,
            'title' => $title,
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'focus_id' => $this->focusId(),
            'estimate_minutes' => 30,
        ], $attributes));
    }

    private function focusId(): int
    {
        return Focus::query()->where('user_id', $this->user->id)->value('id')
            ?? Focus::create(['user_id' => $this->user->id, 'title' => 'Main focus'])->id;
    }

    private function builder(): PriorityQueueBuilder
    {
        return new PriorityQueueBuilder($this->user->id, $this->settings, $this->today);
    }

    public function test_the_queue_splits_committed_today_from_next(): void
    {
        $first = $this->todo('First');
        $second = $this->todo('Second');
        $third = $this->todo('Third');

        $planner = new DayPlanner($this->user->id, $this->settings, $this->today);
        $planner->commit($first, 'Owner picked this first', false, 'cli');

        $queue = $this->builder()->build();

        $this->assertSame([$first->id], array_column($queue['today'], 'id'));
        $this->assertContains($second->id, array_column($queue['next'], 'id'));
        $this->assertContains($third->id, array_column($queue['next'], 'id'));
        $this->assertSame(1, $queue['capacity']['committed']);
        $this->assertSame(2, $queue['capacity']['wip_limit']);
    }

    public function test_the_proposal_fills_the_remaining_slots_and_never_exceeds_the_limit(): void
    {
        $this->todo('A');
        $this->todo('B');
        $this->todo('C');

        $queue = $this->builder()->build();

        $this->assertCount(2, $queue['proposal']);
        $this->assertCount(3, $queue['next']);
    }

    public function test_triage_counts_every_task_that_cannot_enter_the_queue(): void
    {
        $this->todo('Inbox task', ['queue_state' => Todo::QUEUE_INBOX]);
        Todo::create([
            'user_id' => $this->user->id,
            'title' => 'No focus',
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'focus_id' => null,
        ]);
        $blocker = $this->todo('Blocker');
        $blocked = $this->todo('Blocked');
        (new \App\Domain\Priority\DependencyGraph($this->user->id))->add($blocked, $blocker, 'cli');
        $this->todo('Ready');

        $queue = $this->builder()->build();

        $this->assertSame(1, $queue['triage']['inbox']);
        $this->assertSame(1, $queue['triage']['needs_focus']);
        $this->assertSame(1, $queue['triage']['blocked']);
        $this->assertSame(3, $queue['triage']['total']);
        $this->assertCount(2, $queue['next']);
    }

    public function test_a_protected_main_work_raises_a_deadline_warning_for_the_task_it_displaces(): void
    {
        $focus = Focus::create(['user_id' => $this->user->id, 'title' => 'Clinic platform']);
        (new MainWorkService($this->user->id))->set(
            MainWork::TARGET_FOCUS,
            $focus->id,
            'This is the main project',
            'cli',
            $this->user->id,
        );

        $this->todo('Main work task', ['focus_id' => $focus->id]);
        $otherFocus = Focus::create(['user_id' => $this->user->id, 'title' => 'Other work']);
        $this->todo('Release due tomorrow', ['due_date' => '2026-11-18', 'focus_id' => $otherFocus->id]);

        $queue = $this->builder()->build();

        $codes = array_column($queue['warnings'], 'code');
        $this->assertContains('deadline_at_risk', $codes);

        $warning = collect($queue['warnings'])->firstWhere('code', 'deadline_at_risk');
        $this->assertSame('main_work', $warning['displaced_by']);
    }

    public function test_a_due_task_left_out_of_a_full_day_raises_a_warning(): void
    {
        $first = $this->todo('First');
        $this->todo('Second');
        $this->todo('Urgent release', ['due_date' => '2026-11-17']);

        $planner = new DayPlanner($this->user->id, $this->settings, $this->today);
        $planner->commit($first, 'Owner picked this first', false, 'cli');
        $planner->commit($this->todo('Filler'), 'Second slot taken', false, 'cli');

        $queue = $this->builder()->build();

        $this->assertContains('deadline_uncommitted', array_column($queue['warnings'], 'code'));
    }

    public function test_the_payload_carries_reasons_but_never_the_description(): void
    {
        $this->todo('Task with a long body', ['description' => str_repeat('x', 5000)]);

        $item = $this->builder()->build()['next'][0];

        $this->assertArrayNotHasKey('description', $item);
        $this->assertArrayHasKey('reasons', $item);
        $this->assertArrayHasKey('key', $item);
        $this->assertLessThan(200, strlen($item['title']) + 1);
    }

    public function test_a_main_work_past_its_due_date_warns(): void
    {
        $focus = Focus::create(['user_id' => $this->user->id, 'title' => 'Clinic platform']);
        (new MainWorkService($this->user->id))->set(
            MainWork::TARGET_FOCUS,
            $focus->id,
            'This is the main project',
            'cli',
            $this->user->id,
        );
        $this->todo('Main work task', ['focus_id' => $focus->id, 'due_date' => '2026-11-10']);

        $queue = $this->builder()->build();

        $this->assertContains('main_work_overdue', array_column($queue['warnings'], 'code'));
    }
}
