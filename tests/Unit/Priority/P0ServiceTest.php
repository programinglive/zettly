<?php

namespace Tests\Unit\Priority;

use App\Domain\Priority\P0Service;
use App\Domain\Priority\PriorityException;
use App\Models\PriorityDecision;
use App\Models\Todo;
use App\Models\User;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P0 is the only signal that outranks Main Work, so it is deliberately hard to
 * declare: a reason, an expiry, a hard cap, and an audit row.
 */
class P0ServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private UserPrioritySetting $settings;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->settings = UserPrioritySetting::create([
            'user_id' => $this->user->id,
            'wip_limit' => 3,
            'daily_capacity_minutes' => 240,
            'queue_size' => 8,
            'require_focus' => true,
            'require_estimate' => false,
            'max_p0' => 2,
            'main_work_strict' => true,
            'enabled' => true,
        ]);
    }

    private function service(): P0Service
    {
        return new P0Service($this->user->id, $this->settings);
    }

    private function todo(string $title, array $attributes = []): Todo
    {
        return Todo::create(array_merge([
            'user_id' => $this->user->id,
            'title' => $title,
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
        ], $attributes));
    }

    public function test_declaring_p0_sets_the_fields_and_audits_it(): void
    {
        $todo = $this->todo('Checkout failing');

        $updated = $this->service()->declare($todo, 'Checkout returns 500 for every order', null, 'cli', $this->user->id);

        $this->assertTrue((bool) $updated->is_p0);
        $this->assertNotNull($updated->p0_expires_at);
        $this->assertTrue($updated->p0_expires_at->lessThanOrEqualTo(now()->addHours(24)->addMinute()));
        $this->assertSame($this->user->id, (int) $updated->p0_by);

        $audit = PriorityDecision::where('todo_id', $todo->id)->first();
        $this->assertSame(PriorityDecision::ACTION_P0_SET, $audit->action);
        $this->assertStringContainsString('Checkout returns 500', $audit->reason);
    }

    public function test_a_short_reason_is_rejected(): void
    {
        $this->expectException(PriorityException::class);

        $this->service()->declare($this->todo('Broken'), 'down', null, 'cli', $this->user->id);
    }

    public function test_an_expiry_longer_than_seventy_two_hours_is_rejected(): void
    {
        $this->expectException(PriorityException::class);

        $this->service()->declare(
            $this->todo('Broken'),
            'Production is down',
            CarbonImmutable::now()->addHours(80),
            'cli',
            $this->user->id,
        );
    }

    public function test_an_expiry_in_the_past_is_rejected(): void
    {
        $this->expectException(PriorityException::class);

        $this->service()->declare(
            $this->todo('Broken'),
            'Production is down',
            CarbonImmutable::now()->subHour(),
            'cli',
            $this->user->id,
        );
    }

    public function test_a_third_live_p0_is_rejected(): void
    {
        $service = $this->service();
        $service->declare($this->todo('One'), 'First incident open', null, 'cli', $this->user->id);
        $service->declare($this->todo('Two'), 'Second incident open', null, 'cli', $this->user->id);

        $this->expectException(PriorityException::class);
        $this->expectExceptionMessage('At most 2');

        $service->declare($this->todo('Three'), 'Third incident open', null, 'cli', $this->user->id);
    }

    public function test_redeclaring_the_same_task_extends_instead_of_counting_twice(): void
    {
        $service = $this->service();
        $first = $this->todo('One');
        $service->declare($first, 'First incident open', null, 'cli', $this->user->id);
        $service->declare($this->todo('Two'), 'Second incident open', null, 'cli', $this->user->id);

        $extended = $service->declare($first->fresh(), 'Still down after two hours', CarbonImmutable::now()->addHours(48), 'cli', $this->user->id);

        $this->assertTrue($extended->isP0Live());
        $this->assertSame(2, $service->liveCount());
    }

    public function test_clearing_p0_resets_the_fields_and_audits_it(): void
    {
        $todo = $this->todo('Broken');
        $this->service()->declare($todo, 'Production is down', null, 'cli', $this->user->id);

        $cleared = $this->service()->clear($todo->fresh(), 'Recovered and verified', 'cli', $this->user->id);

        $this->assertFalse((bool) $cleared->is_p0);
        $this->assertNull($cleared->p0_reason);
        $this->assertSame(
            PriorityDecision::ACTION_P0_CLEAR,
            PriorityDecision::where('todo_id', $todo->id)->latest('id')->first()->action,
        );
    }

    public function test_an_expired_declaration_is_not_live(): void
    {
        $todo = $this->todo('Broken', [
            'is_p0' => true,
            'p0_reason' => 'Production is down',
            'p0_since' => now()->subDays(3),
            'p0_expires_at' => now()->subHour(),
        ]);

        $this->assertFalse($todo->isP0Live());
        $this->assertSame(0, $this->service()->liveCount());
    }

    public function test_a_foreign_task_cannot_be_declared_p0(): void
    {
        $other = User::factory()->create();
        $foreign = Todo::create(['user_id' => $other->id, 'title' => 'Theirs', 'type' => Todo::TYPE_TODO]);

        $this->expectException(PriorityException::class);

        $this->service()->declare($foreign, 'Not mine to flag', null, 'cli', $this->user->id);
    }
}
