<?php

namespace Tests\Unit\Priority;

use App\Domain\Priority\PriorityContext;
use App\Domain\Priority\PriorityEngine;
use App\Models\MainWork;
use App\Models\Todo;
use App\Models\UserPrioritySetting;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Tests\TestCase;

/**
 * The ordering rule is the product decision. These tests are the contract:
 * P0 first, then Main Work, then deadlines, then importance.
 */
class PriorityEngineTest extends TestCase
{
    private CarbonImmutable $today;

    protected function setUp(): void
    {
        parent::setUp();
        $this->today = CarbonImmutable::parse('2026-11-17', 'Asia/Jakarta');
        Carbon::setTestNow($this->today);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function todo(int $id, array $attributes = []): Todo
    {
        $todo = new Todo;
        $todo->id = $id;
        $todo->user_id = 1;
        $todo->type = Todo::TYPE_TODO;
        $todo->title = $attributes['title'] ?? "Task {$id}";
        $todo->queue_state = $attributes['queue_state'] ?? Todo::QUEUE_BACKLOG;
        $todo->is_completed = false;
        $todo->archived = false;
        $todo->created_at = $attributes['created_at'] ?? $this->today->subDays(1)->setTime(9, 0);
        $todo->importance = $attributes['importance'] ?? Todo::IMPORTANCE_NOT_IMPORTANT;
        $todo->priority = $attributes['priority'] ?? Todo::PRIORITY_NOT_URGENT;
        $todo->focus_id = $attributes['focus_id'] ?? 10;

        if (array_key_exists('due_date', $attributes)) {
            $todo->due_date = $attributes['due_date'] === null
                ? null
                : CarbonImmutable::parse($attributes['due_date']);
        }

        if (! empty($attributes['is_p0'])) {
            $todo->is_p0 = true;
            $todo->p0_reason = $attributes['p0_reason'] ?? 'Checkout is failing';
            $todo->p0_since = $this->today->subHours(2);
            $todo->p0_expires_at = $this->today->addHours(20);
        }

        return $todo;
    }

    private function context(array $overrides = []): PriorityContext
    {
        $settings = new UserPrioritySetting([
            'user_id' => 1,
            'wip_limit' => 3,
            'daily_capacity_minutes' => 240,
            'queue_size' => 8,
            'require_focus' => true,
            'require_estimate' => false,
            'max_p0' => 2,
            'main_work_strict' => $overrides['main_work_strict'] ?? true,
            'enabled' => true,
        ]);

        return new PriorityContext(
            today: $this->today,
            settings: $settings,
            mainWork: $overrides['main_work'] ?? null,
            blockedIds: $overrides['blocked'] ?? [],
            unblockCounts: $overrides['unblocks'] ?? [],
        );
    }

    private function ids(array $ranked): array
    {
        return array_map(fn ($item) => $item->todo->id, $ranked);
    }

    public function test_production_critical_ranks_above_main_work(): void
    {
        $mainWork = new MainWork(['target_type' => MainWork::TARGET_FOCUS, 'target_id' => 10]);
        $p0 = $this->todo(3, ['focus_id' => 99, 'is_p0' => true]);
        $main = $this->todo(1, ['focus_id' => 10]);

        $ranked = PriorityEngine::rank([$main, $p0], $this->context(['main_work' => $mainWork]));

        $this->assertSame([3, 1], $this->ids($ranked));
        $this->assertStringContainsString('Production critical', implode(' ', $ranked[0]->reasons));
    }

    public function test_main_work_outranks_a_deadline_two_days_away(): void
    {
        $mainWork = new MainWork(['target_type' => MainWork::TARGET_FOCUS, 'target_id' => 10]);
        $deadline = $this->todo(2, ['focus_id' => 20, 'due_date' => '2026-11-19']);
        $main = $this->todo(1, ['focus_id' => 10]);

        $ranked = PriorityEngine::rank([$deadline, $main], $this->context(['main_work' => $mainWork]));

        $this->assertSame([1, 2], $this->ids($ranked));
    }

    public function test_an_overdue_task_does_not_outrank_main_work(): void
    {
        $mainWork = new MainWork(['target_type' => MainWork::TARGET_FOCUS, 'target_id' => 10]);
        $overdue = $this->todo(2, ['focus_id' => 20, 'due_date' => '2026-11-10']);
        $main = $this->todo(1, ['focus_id' => 10]);

        $ranked = PriorityEngine::rank([$overdue, $main], $this->context(['main_work' => $mainWork]));

        $this->assertSame([1, 2], $this->ids($ranked));
    }

    public function test_overdue_main_work_stays_above_a_task_due_today(): void
    {
        $mainWork = new MainWork(['target_type' => MainWork::TARGET_FOCUS, 'target_id' => 10]);
        $main = $this->todo(1, ['focus_id' => 10, 'due_date' => '2026-11-11']);
        $today = $this->todo(2, ['focus_id' => 20, 'due_date' => '2026-11-17']);

        $ranked = PriorityEngine::rank([$today, $main], $this->context(['main_work' => $mainWork]));

        $this->assertSame([1, 2], $this->ids($ranked));
    }

    public function test_due_buckets_order_from_overdue_to_undated(): void
    {
        $none = $this->todo(5);
        $later = $this->todo(4, ['due_date' => '2026-12-01']);
        $week = $this->todo(3, ['due_date' => '2026-11-22']);
        $soon = $this->todo(2, ['due_date' => '2026-11-19']);
        $overdue = $this->todo(1, ['due_date' => '2026-11-12']);

        $ranked = PriorityEngine::rank([$none, $later, $week, $soon, $overdue], $this->context());

        $this->assertSame([1, 2, 3, 4, 5], $this->ids($ranked));
    }

    public function test_importance_breaks_a_due_date_tie(): void
    {
        $q4 = $this->todo(2, ['due_date' => '2026-11-19']);
        $q1 = $this->todo(1, [
            'due_date' => '2026-11-19',
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'priority' => Todo::PRIORITY_URGENT,
        ]);

        $ranked = PriorityEngine::rank([$q4, $q1], $this->context());

        $this->assertSame([1, 2], $this->ids($ranked));
    }

    public function test_the_task_that_unblocks_more_work_goes_first(): void
    {
        $a = $this->todo(1);
        $b = $this->todo(2);

        $ranked = PriorityEngine::rank([$a, $b], $this->context(['unblocks' => [1 => 0, 2 => 3]]));

        $this->assertSame([2, 1], $this->ids($ranked));
        $this->assertStringContainsString('unblocks 3', implode(' ', $ranked[0]->reasons));
    }

    public function test_the_oldest_task_wins_a_full_tie(): void
    {
        $young = $this->todo(1, ['created_at' => $this->today->subDay()]);
        $old = $this->todo(2, ['created_at' => $this->today->subDays(20)]);

        $ranked = PriorityEngine::rank([$young, $old], $this->context());

        $this->assertSame([2, 1], $this->ids($ranked));
    }

    public function test_identical_signals_stay_stable_by_id(): void
    {
        $first = $this->todo(7);
        $second = $this->todo(3);

        $ranked = PriorityEngine::rank([$first, $second], $this->context());

        $this->assertSame([3, 7], $this->ids($ranked));
    }

    public function test_the_order_does_not_depend_on_input_order(): void
    {
        $mainWork = new MainWork(['target_type' => MainWork::TARGET_FOCUS, 'target_id' => 10]);
        $todos = [
            $this->todo(1, ['focus_id' => 10]),
            $this->todo(2, ['due_date' => '2026-11-18']),
            $this->todo(3, ['is_p0' => true, 'focus_id' => 30]),
            $this->todo(4, ['due_date' => '2026-11-11']),
            $this->todo(5),
        ];
        $context = $this->context(['main_work' => $mainWork, 'unblocks' => [5 => 2]]);

        $forward = $this->ids(PriorityEngine::rank($todos, $context));
        $reversed = $this->ids(PriorityEngine::rank(array_reverse($todos), $context));
        $shuffled = $this->ids(PriorityEngine::rank([$todos[2], $todos[0], $todos[4], $todos[1], $todos[3]], $context));

        $this->assertSame($forward, $reversed);
        $this->assertSame($forward, $shuffled);
    }

    public function test_relaxed_policy_puts_deadlines_before_main_work(): void
    {
        $mainWork = new MainWork(['target_type' => MainWork::TARGET_FOCUS, 'target_id' => 10]);
        $deadline = $this->todo(2, ['focus_id' => 20, 'due_date' => '2026-11-19']);
        $main = $this->todo(1, ['focus_id' => 10]);

        $ranked = PriorityEngine::rank([$main, $deadline], $this->context([
            'main_work' => $mainWork,
            'main_work_strict' => false,
        ]));

        $this->assertSame([2, 1], $this->ids($ranked));
    }

    public function test_a_focus_main_work_also_covers_its_tasks(): void
    {
        $mainWork = new MainWork(['target_type' => MainWork::TARGET_FOCUS, 'target_id' => 10]);
        $other = $this->todo(2, ['focus_id' => 20, 'due_date' => '2026-11-18']);
        $main = $this->todo(1, ['focus_id' => 10, 'due_date' => null]);

        $ranked = PriorityEngine::rank([$other, $main], $this->context(['main_work' => $mainWork]));

        $this->assertSame([1, 2], $this->ids($ranked));
        $this->assertStringContainsString('Main work', implode(' ', $ranked[0]->reasons));
    }

    public function test_explain_names_the_position_that_decided_a_comparison(): void
    {
        $mainWork = new MainWork(['target_type' => MainWork::TARGET_FOCUS, 'target_id' => 10]);
        $deadline = $this->todo(2, ['focus_id' => 20, 'due_date' => '2026-11-18']);
        $main = $this->todo(1, ['focus_id' => 10]);

        $ranked = PriorityEngine::rank([$main, $deadline], $this->context(['main_work' => $mainWork]));

        $explanation = PriorityEngine::explain($ranked[1], $ranked[0]);

        $this->assertSame('main_work', $explanation['decided_by']);
        $this->assertStringContainsString('Main work', $explanation['detail']);
    }
}
