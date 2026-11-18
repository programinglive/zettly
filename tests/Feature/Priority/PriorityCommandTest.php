<?php

namespace Tests\Feature\Priority;

use App\Models\Focus;
use App\Models\Todo;
use App\Models\User;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PriorityCommandTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Focus $focus;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->travelTo(CarbonImmutable::parse('2026-11-17 08:00', 'Asia/Jakarta'));

        $this->focus = Focus::create([
            'user_id' => $this->user->id,
            'title' => 'Core Focus',
            'status' => 'active',
        ]);

        UserPrioritySetting::create([
            'user_id' => $this->user->id,
            'wip_limit' => 3,
            'daily_capacity_minutes' => 240,
            'queue_size' => 5,
            'require_focus' => true,
            'require_estimate' => false,
            'max_p0' => 2,
            'main_work_strict' => true,
            'enabled' => true,
        ]);
    }

    private function createTodo(array $attributes = []): Todo
    {
        return Todo::create(array_merge([
            'user_id' => $this->user->id,
            'focus_id' => $this->focus->id,
            'title' => 'Sample Task',
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'is_completed' => false,
            'archived' => false,
        ], $attributes));
    }

    public function test_priority_queue_renders_and_returns_json(): void
    {
        $this->createTodo(['title' => 'First Task']);
        $this->createTodo(['title' => 'Second Task']);

        $this->artisan('zettly:priority', [
            '--user' => $this->user->id,
            '--date' => '2026-11-17',
        ])
            ->expectsOutputToContain('Zettly Priority Queue')
            ->expectsOutputToContain('First Task')
            ->assertExitCode(0);

        $this->artisan('zettly:priority', [
            '--user' => $this->user->id,
            '--date' => '2026-11-17',
            '--json' => true,
        ])
            ->assertExitCode(0);
    }

    public function test_priority_explain_action(): void
    {
        $todo = $this->createTodo(['title' => 'Task to Explain']);

        $this->artisan('zettly:priority', [
            'action' => 'explain',
            '--user' => $this->user->id,
            '--todo' => $todo->id,
            '--date' => '2026-11-17',
        ])
            ->expectsOutputToContain("Priority Explanation for Todo #{$todo->id}")
            ->assertExitCode(0);
    }

    public function test_commit_and_uncommit_via_cli(): void
    {
        $todo = $this->createTodo(['title' => 'Task to Commit']);

        $this->artisan('zettly:priority', [
            'action' => 'commit',
            '--user' => $this->user->id,
            '--todo' => $todo->id,
            '--reason' => 'Committed for active sprint work',
            '--date' => '2026-11-17',
        ])
            ->expectsOutputToContain("Committed Todo #{$todo->id}")
            ->assertExitCode(0);

        $this->artisan('zettly:priority', [
            'action' => 'uncommit',
            '--user' => $this->user->id,
            '--todo' => $todo->id,
            '--reason' => 'Blocked by upstream review',
            '--date' => '2026-11-17',
        ])
            ->expectsOutputToContain("Uncommitted Todo #{$todo->id}")
            ->assertExitCode(0);
    }

    public function test_main_work_management_via_cli(): void
    {
        $this->artisan('zettly:priority', [
            'action' => 'main-work',
            '--user' => $this->user->id,
            '--target-type' => 'focus',
            '--target-id' => $this->focus->id,
            '--reason' => 'Focusing all efforts on core focus',
        ])
            ->expectsOutputToContain("Main work set to focus #{$this->focus->id}")
            ->assertExitCode(0);

        $this->artisan('zettly:priority', [
            'action' => 'main-work',
            '--user' => $this->user->id,
            '--clear' => true,
            '--reason' => 'Completed target milestone',
        ])
            ->expectsOutputToContain('Main work cleared successfully')
            ->assertExitCode(0);
    }

    public function test_p0_declaration_and_clear_via_cli(): void
    {
        $todo = $this->createTodo(['title' => 'Critical Bug']);

        $this->artisan('zettly:priority', [
            'action' => 'p0',
            '--user' => $this->user->id,
            '--todo' => $todo->id,
            '--reason' => 'Production payment gateway outage',
            '--date' => '2026-11-17',
        ])
            ->expectsOutputToContain("Declared P0 on Todo #{$todo->id}")
            ->assertExitCode(0);

        $this->artisan('zettly:priority', [
            'action' => 'p0',
            '--user' => $this->user->id,
            '--todo' => $todo->id,
            '--clear' => true,
            '--reason' => 'Hotfix deployed and verified',
        ])
            ->expectsOutputToContain("Cleared P0 declaration on Todo #{$todo->id}")
            ->assertExitCode(0);
    }

    public function test_dependencies_management_via_cli(): void
    {
        $todoA = $this->createTodo(['title' => 'Task A']);
        $todoB = $this->createTodo(['title' => 'Task B']);

        $this->artisan('zettly:priority', [
            'action' => 'deps',
            '--user' => $this->user->id,
            '--todo' => $todoA->id,
            '--depends-on' => $todoB->id,
        ])
            ->expectsOutputToContain("Added dependency: Todo #{$todoA->id} now depends on #{$todoB->id}")
            ->assertExitCode(0);

        $this->artisan('zettly:priority', [
            'action' => 'deps',
            '--user' => $this->user->id,
            '--todo' => $todoA->id,
        ])
            ->expectsOutputToContain("Blocked by: {$todoB->id}")
            ->assertExitCode(0);

        $this->artisan('zettly:priority', [
            'action' => 'deps',
            '--user' => $this->user->id,
            '--todo' => $todoA->id,
            '--depends-on' => $todoB->id,
            '--remove' => true,
        ])
            ->expectsOutputToContain("Removed dependency")
            ->assertExitCode(0);
    }
}
