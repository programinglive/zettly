<?php

namespace Tests\Unit\Priority;

use App\Domain\Priority\DayPlanner;
use App\Domain\Priority\PriorityException;
use App\Models\DailyPlan;
use App\Models\PriorityDecision;
use App\Models\Todo;
use App\Models\User;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DayPlannerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private CarbonImmutable $today;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->today = CarbonImmutable::parse('2026-11-17', 'Asia/Jakarta');
    }

    private function settings(array $overrides = []): UserPrioritySetting
    {
        return UserPrioritySetting::create(array_merge([
            'user_id' => $this->user->id,
            'wip_limit' => 2,
            'daily_capacity_minutes' => 120,
            'queue_size' => 8,
            'require_focus' => true,
            'require_estimate' => false,
            'max_p0' => 2,
            'main_work_strict' => true,
            'enabled' => true,
        ], $overrides));
    }

    private function todo(string $title, array $attributes = []): Todo
    {
        $todo = Todo::create([
            'user_id' => $this->user->id,
            'title' => $title,
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'focus_id' => $attributes['focus_id'] ?? null,
            'estimate_minutes' => $attributes['estimate_minutes'] ?? 30,
        ]);

        if (! empty($attributes['is_p0'])) {
            $todo->forceFill([
                'is_p0' => true,
                'p0_reason' => 'Production down',
                'p0_since' => now(),
                'p0_expires_at' => now()->addHours(10),
            ])->save();
        }

        return $todo->fresh();
    }

    private function planner(array $overrides = []): DayPlanner
    {
        return new DayPlanner($this->user->id, $this->settings($overrides), $this->today);
    }

    public function test_the_plan_is_created_once_per_day(): void
    {
        $planner = $this->planner();

        $first = $planner->ensurePlan();
        $second = $planner->ensurePlan();

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, DailyPlan::count());
        $this->assertSame(2, $first->wip_limit_snapshot);
        $this->assertSame(120, $first->capacity_minutes_snapshot);
    }

    public function test_committing_a_task_returns_an_item_and_writes_an_audit_row(): void
    {
        $task = $this->todo('Ship it');

        $item = $this->planner()->commit($task, 'Owner committed it', false, 'cli');

        $this->assertSame($task->id, $item->todo_id);
        $this->assertSame(DailyPlan::ITEM_PLANNED, $item->state);
        $this->assertSame(Todo::QUEUE_COMMITTED, $task->fresh()->queue_state);

        $audit = PriorityDecision::where('todo_id', $task->id)->first();
        $this->assertNotNull($audit);
        $this->assertSame(PriorityDecision::ACTION_COMMIT, $audit->action);
        $this->assertSame('cli', $audit->source);
        $this->assertSame('Owner committed it', $audit->reason);
    }

    public function test_committing_the_same_task_twice_is_idempotent(): void
    {
        $task = $this->todo('Ship it');
        $planner = $this->planner();

        $first = $planner->commit($task, 'first commit', false, 'cli');
        $second = $planner->commit($task, 'second commit', false, 'cli');

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, PriorityDecision::where('todo_id', $task->id)->count());
    }

    public function test_the_wip_limit_refuses_the_next_commit(): void
    {
        $planner = $this->planner();
        $planner->commit($this->todo('One'), 'commit one', false, 'cli');
        $planner->commit($this->todo('Two'), 'commit two', false, 'cli');

        $this->expectException(PriorityException::class);
        $this->expectExceptionMessage('already has 2 committed');

        $planner->commit($this->todo('Three'), 'commit three', false, 'cli');
    }

    public function test_an_override_records_the_reason_and_the_override_action(): void
    {
        $planner = $this->planner();
        $planner->commit($this->todo('One'), 'commit one', false, 'cli');
        $planner->commit($this->todo('Two'), 'commit two', false, 'cli');

        $third = $this->todo('Three');
        $planner->commit($third, 'Customer escalation, owner approved', true, 'mcp');

        $audit = PriorityDecision::where('todo_id', $third->id)->first();

        $this->assertSame(PriorityDecision::ACTION_OVERRIDE, $audit->action);
        $this->assertSame('mcp', $audit->source);
        $this->assertStringContainsString('Customer escalation', $audit->reason);
    }

    public function test_a_live_p0_is_committed_without_a_wip_overflow_audit(): void
    {
        $planner = $this->planner();
        $planner->commit($this->todo('One'), 'commit one', false, 'cli');
        $planner->commit($this->todo('Two'), 'commit two', false, 'cli');

        $p0 = $this->todo('Checkout failing', ['is_p0' => true]);
        $planner->commit($p0, 'Production incident', false, 'cli');

        $this->assertSame(
            PriorityDecision::ACTION_COMMIT,
            PriorityDecision::where('todo_id', $p0->id)->first()->action,
        );
    }

    public function test_capacity_is_checked_against_estimates(): void
    {
        $planner = $this->planner();

        $this->expectException(PriorityException::class);

        $planner->commit($this->todo('Huge', ['estimate_minutes' => 500]), 'too big', false, 'cli');
    }

    public function test_uncommitting_drops_the_item_with_a_reason(): void
    {
        $planner = $this->planner();
        $task = $this->todo('Ship it');
        $planner->commit($task, 'commit it now', false, 'cli');

        $this->assertTrue($planner->uncommit($task, 'Owner postponed it', 'cli'));

        $this->assertSame(
            DailyPlan::ITEM_DROPPED,
            $planner->ensurePlan()->items()->where('todo_id', $task->id)->first()->state,
        );
        $this->assertSame(Todo::QUEUE_BACKLOG, $task->fresh()->queue_state);
        $this->assertSame(
            PriorityDecision::ACTION_UNCOMMIT,
            PriorityDecision::where('todo_id', $task->id)->latest('id')->first()->action,
        );
    }

    public function test_a_blocked_task_cannot_be_committed(): void
    {
        $blocker = $this->todo('Blocker');
        $waiting = $this->todo('Waiting');
        (new \App\Domain\Priority\DependencyGraph($this->user->id))->add($waiting, $blocker, 'cli');

        $this->expectException(PriorityException::class);

        $this->planner()->commit($waiting, 'commit anyway', false, 'cli');
    }

    public function test_a_short_reason_is_rejected(): void
    {
        $this->expectException(PriorityException::class);

        $this->planner()->commit($this->todo('Ship it'), 'ok', false, 'cli');
    }
}
