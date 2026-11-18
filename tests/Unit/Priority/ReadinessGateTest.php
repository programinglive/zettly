<?php

namespace Tests\Unit\Priority;

use App\Domain\Priority\PriorityContext;
use App\Domain\Priority\ReadinessGate;
use App\Models\MainWork;
use App\Models\Todo;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;
use Tests\TestCase;

/**
 * The gate that keeps "just landed" work out of the queue until it is workable.
 */
class ReadinessGateTest extends TestCase
{
    private CarbonImmutable $today;

    protected function setUp(): void
    {
        parent::setUp();
        $this->today = CarbonImmutable::parse('2026-11-17', 'Asia/Jakarta');
    }

    private function todo(array $attributes = []): Todo
    {
        $todo = new Todo;
        $todo->id = $attributes['id'] ?? 1;
        $todo->user_id = 1;
        $todo->type = Todo::TYPE_TODO;
        $todo->title = 'Task';
        $todo->queue_state = $attributes['queue_state'] ?? Todo::QUEUE_BACKLOG;
        $todo->is_completed = false;
        $todo->archived = false;
        $todo->focus_id = array_key_exists('focus_id', $attributes) ? $attributes['focus_id'] : 10;
        $todo->estimate_minutes = $attributes['estimate_minutes'] ?? null;

        if (! empty($attributes['is_p0'])) {
            $todo->is_p0 = true;
            $todo->p0_reason = 'Production down';
            $todo->p0_expires_at = $this->today->copy()->addDays(10);
        }

        return $todo;
    }

    private function context(array $overrides = []): PriorityContext
    {
        return new PriorityContext(
            today: $this->today,
            settings: new UserPrioritySetting([
                'user_id' => 1,
                'wip_limit' => 3,
                'queue_size' => 8,
                'require_focus' => $overrides['require_focus'] ?? true,
                'require_estimate' => $overrides['require_estimate'] ?? false,
                'max_p0' => 2,
                'main_work_strict' => true,
                'enabled' => true,
            ]),
            mainWork: null,
            blockedIds: $overrides['blocked'] ?? [],
        );
    }

    public function test_a_task_in_the_inbox_is_not_ready(): void
    {
        $result = ReadinessGate::evaluate($this->todo(['queue_state' => Todo::QUEUE_INBOX]), $this->context());

        $this->assertFalse($result['ready']);
        $this->assertContains('inbox', $result['reasons']);
    }

    public function test_a_task_without_a_focus_is_not_ready_when_focus_is_required(): void
    {
        $result = ReadinessGate::evaluate($this->todo(['focus_id' => null]), $this->context());

        $this->assertFalse($result['ready']);
        $this->assertContains('needs_focus', $result['reasons']);
    }

    public function test_an_estimate_is_required_only_when_the_policy_says_so(): void
    {
        $todo = $this->todo(['estimate_minutes' => null]);

        $withoutEstimateRule = ReadinessGate::evaluate($todo, $this->context(['require_estimate' => false]));
        $this->assertTrue($withoutEstimateRule['ready']);

        $withEstimateRule = ReadinessGate::evaluate($todo, $this->context(['require_estimate' => true]));
        $this->assertFalse($withEstimateRule['ready']);
        $this->assertContains('needs_estimate', $withEstimateRule['reasons']);
    }

    public function test_a_blocked_task_is_not_ready(): void
    {
        $result = ReadinessGate::evaluate(
            $this->todo(),
            $this->context(['blocked' => [1 => [5, 6]]]),
        );

        $this->assertFalse($result['ready']);
        $this->assertContains('blocked_by:5,6', $result['reasons']);
    }

    public function test_a_live_p0_is_ready_even_without_a_focus(): void
    {
        // Manually create a P0 todo without focus_id to isolate the issue
        $todo = new Todo;
        $todo->id = 999;
        $todo->user_id = 1;
        $todo->type = Todo::TYPE_TODO;
        $todo->title = 'P0 Task';
        $todo->queue_state = Todo::QUEUE_INBOX;
        $todo->is_completed = false;
        $todo->archived = false;
        $todo->focus_id = null;
        $todo->estimate_minutes = null;
        $todo->is_p0 = true;
        $todo->p0_reason = 'Production down';
        $todo->p0_expires_at = $this->today->copy()->addDays(10);

        $result = ReadinessGate::evaluate(
            $todo,
            $this->context(['require_estimate' => true]),
        );

        $this->assertTrue($result['ready']);
        $this->assertSame(['p0'], $result['reasons']);
    }

    public function test_a_ready_task_reports_no_reasons(): void
    {
        $result = ReadinessGate::evaluate($this->todo(['estimate_minutes' => 30]), $this->context());

        $this->assertTrue($result['ready']);
        $this->assertSame([], $result['reasons']);
    }
}
