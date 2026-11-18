<?php

namespace Tests\Feature\Priority;

use App\Domain\Priority\DayPlanner;
use App\Domain\Priority\MainWorkService;
use App\Domain\Priority\PriorityQueueBuilder;
use App\Http\Controllers\Api\Concerns\MapsPriorityErrors;
use App\Http\Controllers\Api\PriorityController;
use App\Http\Controllers\Api\TodoPriorityController;
use App\Models\Focus;
use App\Models\MainWork;
use App\Models\PriorityDecision;
use App\Models\Todo;
use App\Models\User;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The API is the contract every other client speaks: CLI, MCP and the UI all
 * read the same payload and see the same refusal codes. No ordering logic lives
 * here; the controller only adapts HTTP to App\Domain\Priority.
 */
class PriorityApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->travelTo(CarbonImmutable::parse('2026-11-17 08:00', 'Asia/Jakarta'));

        UserPrioritySetting::create([
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

        Sanctum::actingAs($this->user, ['zettly:cli']);
    }

    private function focus(string $title = 'Clinic platform'): Focus
    {
        return Focus::create(['user_id' => $this->user->id, 'title' => $title]);
    }

    private function todo(string $title, array $attributes = []): Todo
    {
        return Todo::create(array_merge([
            'user_id' => $this->user->id,
            'title' => $title,
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'focus_id' => $this->focus()->id,
            'estimate_minutes' => 30,
        ], $attributes));
    }

    public function test_an_anonymous_caller_is_rejected(): void
    {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/v1/priority/queue')->assertUnauthorized();
    }

    public function test_the_queue_endpoint_returns_the_bounded_payload(): void
    {
        $this->todo('First');
        $this->todo('Second');

        $response = $this->getJson('/api/v1/priority/queue');

        if ($response->status() !== 200) {
            dump('Response status:', $response->status());
            dump('Response content:', $response->getContent());
        }

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.settings.wip_limit', 2);
        $response->assertJsonCount(2, 'data.next');
        $response->assertJsonStructure([
            'data' => [
                'date', 'settings', 'capacity', 'main_work', 'today', 'next', 'proposal', 'triage', 'warnings', 'counts',
            ],
        ]);

        $item = $response->json('data.next.0');
        $this->assertArrayNotHasKey('description', $item);
        $this->assertArrayHasKey('reasons', $item);
        $this->assertArrayHasKey('key', $item);
    }

    public function test_the_queue_never_leaks_another_users_work(): void
    {
        $other = User::factory()->create();
        Todo::create([
            'user_id' => $other->id,
            'title' => 'Not mine',
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
        ]);

        $response = $this->getJson('/api/v1/priority/queue');

        $response->assertOk();
        $response->assertJsonPath('data.counts.open', 0);
    }

    public function test_settings_default_to_the_engine_policy_without_writing_a_row(): void
    {
        $this->user->userPrioritySetting()->delete();

        $response = $this->getJson('/api/v1/priority/settings');

        $response->assertOk();
        $response->assertJsonPath('data.wip_limit', UserPrioritySetting::DEFAULT_WIP_LIMIT);
        $response->assertJsonPath('data.main_work_strict', true);
        $response->assertJsonPath('data.enabled', false);
        $this->assertSame(0, UserPrioritySetting::where('user_id', $this->user->id)->count());
    }

    public function test_updating_settings_persists_and_audits_the_change(): void
    {
        $response = $this->patchJson('/api/v1/priority/settings', [
            'wip_limit' => 4,
            'require_estimate' => true,
            'reason' => 'Owner wants a wider day',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.wip_limit', 4);
        $response->assertJsonPath('data.require_estimate', true);

        $this->assertSame(4, UserPrioritySetting::where('user_id', $this->user->id)->value('wip_limit'));

        $audit = PriorityDecision::where('action', PriorityDecision::ACTION_SETTINGS_CHANGE)->first();
        $this->assertNotNull($audit);
        $this->assertSame(2, $audit->before['wip_limit']);
        $this->assertSame(4, $audit->after['wip_limit']);
    }

    public function test_settings_reject_an_out_of_range_wip_limit(): void
    {
        $this->patchJson('/api/v1/priority/settings', ['wip_limit' => 99])
            ->assertStatus(422)
            ->assertJsonValidationErrors('wip_limit');
    }

    public function test_ensuring_the_plan_is_idempotent(): void
    {
        $first = $this->postJson('/api/v1/priority/plan', ['date' => '2026-11-17']);
        $second = $this->postJson('/api/v1/priority/plan', ['date' => '2026-11-17']);

        $first->assertOk();
        $second->assertOk();
        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame(1, \App\Models\DailyPlan::count());
    }

    public function test_committing_an_item_marks_the_todo_committed(): void
    {
        $todo = $this->todo('First');

        $response = $this->postJson('/api/v1/priority/plan/items', [
            'todo_id' => $todo->id,
            'reason' => 'Owner picked this first',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.todo_id', $todo->id);
        $response->assertJsonPath('data.state', 'planned');
        $this->assertSame(Todo::QUEUE_COMMITTED, $todo->fresh()->queue_state);
    }

    public function test_a_wip_overflow_returns_a_machine_readable_code(): void
    {
        $this->postJson('/api/v1/priority/plan/items', [
            'todo_id' => $this->todo('One')->id,
            'reason' => 'First slot taken',
        ])->assertOk();

        $this->postJson('/api/v1/priority/plan/items', [
            'todo_id' => $this->todo('Two')->id,
            'reason' => 'Second slot taken',
        ])->assertOk();

        $this->postJson('/api/v1/priority/plan/items', [
            'todo_id' => $this->todo('Three')->id,
            'reason' => 'Third slot attempted',
        ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'wip_limit_reached')
            ->assertJsonPath('success', false);
    }

    public function test_committing_requires_a_reason(): void
    {
        $this->postJson('/api/v1/priority/plan/items', [
            'todo_id' => $this->todo('One')->id,
            'reason' => 'no',
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.reason.0', 'The reason field must be at least 8 characters.');
    }

    public function test_uncommitting_returns_the_todo_to_the_backlog(): void
    {
        $todo = $this->todo('First');

        $this->postJson('/api/v1/priority/plan/items', [
            'todo_id' => $todo->id,
            'reason' => 'Owner picked this first',
        ])->assertOk();

        $this->deleteJson("/api/v1/priority/plan/items/{$todo->id}", [
            'reason' => 'Owner postponed the work',
        ])->assertOk();

        $this->assertSame(Todo::QUEUE_BACKLOG, $todo->fresh()->queue_state);
    }

    public function test_main_work_can_be_set_and_cleared(): void
    {
        $focus = $this->focus();

        $set = $this->postJson('/api/v1/priority/main-work', [
            'target_type' => MainWork::TARGET_FOCUS,
            'target_id' => $focus->id,
            'reason' => 'This pays the bills this quarter',
        ]);

        $set->assertOk();
        $set->assertJsonPath('data.target_id', $focus->id);
        $set->assertJsonPath('data.label', 'Clinic platform');

        $this->getJson('/api/v1/priority/main-work')
            ->assertOk()
            ->assertJsonPath('data.target_id', $focus->id);

        $this->deleteJson('/api/v1/priority/main-work', ['reason' => 'Delivered, moving on'])
            ->assertOk();

        $this->getJson('/api/v1/priority/main-work')->assertJsonPath('data', null);
    }

    public function test_main_work_requires_a_reason(): void
    {
        $this->postJson('/api/v1/priority/main-work', [
            'target_type' => MainWork::TARGET_FOCUS,
            'target_id' => $this->focus()->id,
            'reason' => 'short',
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.reason.0', 'The reason field must be at least 8 characters.');
    }

    public function test_a_foreign_focus_cannot_become_main_work(): void
    {
        $other = User::factory()->create();
        $foreign = Focus::create(['user_id' => $other->id, 'title' => 'Theirs']);

        $this->postJson('/api/v1/priority/main-work', [
            'target_type' => MainWork::TARGET_FOCUS,
            'target_id' => $foreign->id,
            'reason' => 'Not mine to protect',
        ])
            ->assertStatus(403)
            ->assertJsonPath('code', 'forbidden')
            ->assertJsonPath('message', 'Main work must point at your own focus or task.');
    }

    public function test_dependencies_can_be_listed_added_and_removed(): void
    {
        $blocker = $this->todo('Blocker');
        $waiting = $this->todo('Waiting');

        $this->postJson("/api/v1/todos/{$waiting->id}/dependencies", [
            'depends_on_todo_id' => $blocker->id,
        ])->assertOk();

        $list = $this->getJson("/api/v1/todos/{$waiting->id}/dependencies");
        $list->assertOk();
        $list->assertJsonPath('data.blocked_by.0.id', $blocker->id);

        $this->getJson("/api/v1/todos/{$blocker->id}/dependencies")
            ->assertOk()
            ->assertJsonPath('data.blocks.0.id', $waiting->id);

        $this->deleteJson("/api/v1/todos/{$waiting->id}/dependencies/{$blocker->id}")
            ->assertOk();

        $this->assertSame(
            0,
            \App\Models\TodoDependency::where('todo_id', $waiting->id)->count(),
        );
    }

    public function test_a_cycle_is_rejected_with_its_code(): void
    {
        $a = $this->todo('A');
        $b = $this->todo('B');

        $this->postJson("/api/v1/todos/{$a->id}/dependencies", ['depends_on_todo_id' => $b->id])->assertOk();

        $this->postJson("/api/v1/todos/{$b->id}/dependencies", ['depends_on_todo_id' => $a->id])
            ->assertStatus(422)
            ->assertJsonPath('code', 'dependency_cycle');
    }

    public function test_a_foreign_todo_returns_404(): void
    {
        $other = User::factory()->create();
        $foreign = Todo::create([
            'user_id' => $other->id,
            'title' => 'Theirs',
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
        ]);

        $this->getJson("/api/v1/priority/explain/{$foreign->id}")
            ->assertNotFound()
            ->assertJsonPath('code', 'not_found');
    }

    public function test_queue_state_moves_between_inbox_and_backlog(): void
    {
        $todo = $this->todo('Fresh', ['queue_state' => Todo::QUEUE_INBOX]);

        $this->patchJson("/api/v1/todos/{$todo->id}/queue-state", ['queue_state' => Todo::QUEUE_BACKLOG])
            ->assertOk()
            ->assertJsonPath('data.queue_state', Todo::QUEUE_BACKLOG);

        $this->patchJson("/api/v1/todos/{$todo->id}/queue-state", ['queue_state' => 'nonsense'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('queue_state');
    }

    public function test_p0_can_be_declared_and_cleared(): void
    {
        $todo = $this->todo('Checkout failing');

        $declared = $this->postJson("/api/v1/todos/{$todo->id}/p0", [
            'reason' => 'Checkout returns 500 for every order',
        ]);

        $declared->assertOk();
        $declared->assertJsonPath('data.is_p0', true);
        $this->assertNotNull($declared->json('data.p0_expires_at'));

        $this->deleteJson("/api/v1/todos/{$todo->id}/p0", [
            'reason' => 'Recovered and verified',
        ])->assertOk();

        $this->assertFalse((bool) $todo->fresh()->is_p0);
    }

    public function test_a_third_p0_is_rejected(): void
    {
        $this->postJson("/api/v1/todos/{$this->todo('One')->id}/p0", [
            'reason' => 'Production incident open',
        ])->assertOk();

        $this->postJson("/api/v1/todos/{$this->todo('Two')->id}/p0", [
            'reason' => 'Second production incident',
        ])->assertOk();

        $this->postJson("/api/v1/todos/{$this->todo('Three')->id}/p0", [
            'reason' => 'Third production incident',
        ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'p0_limit_reached');
    }

    public function test_explain_returns_the_reason_that_decided_the_order(): void
    {
        $focus = $this->focus('Main focus');
        $this->postJson('/api/v1/priority/main-work', [
            'target_type' => MainWork::TARGET_FOCUS,
            'target_id' => $focus->id,
            'reason' => 'This is the main project',
        ])->assertOk();

        $main = $this->todo('Main task', ['focus_id' => $focus->id]);
        $otherFocus = $this->focus('Other work');
        $deadline = $this->todo('Release due tomorrow', [
            'focus_id' => $otherFocus->id,
            'due_date' => '2026-11-18',
        ]);

        $this->getJson("/api/v1/priority/explain/{$deadline->id}")
            ->assertOk()
            ->assertJsonPath('data.position', 2)
            ->assertJsonPath('data.decided_by', 'main_work')
            ->assertJsonPath('data.ready', true);

        $this->getJson("/api/v1/priority/explain/{$main->id}")
            ->assertOk()
            ->assertJsonPath('data.todo.is_main_work', true)
            ->assertJsonPath('data.position', 1);
    }

    public function test_history_lists_the_audit_trail(): void
    {
        $todo = $this->todo('First');

        $this->postJson('/api/v1/priority/plan/items', [
            'todo_id' => $todo->id,
            'reason' => 'Owner picked this first',
        ])->assertOk();

        $response = $this->getJson("/api/v1/priority/history?todo_id={$todo->id}");

        $response->assertOk();
        $response->assertJsonPath('data.0.action', PriorityDecision::ACTION_COMMIT);
        $response->assertJsonPath('data.0.todo_id', $todo->id);
    }

    public function test_todo_patch_cannot_mass_assign_p0_fields(): void
    {
        $todo = $this->todo('Normal task');

        $this->patchJson("/api/v1/todos/{$todo->id}", [
            'title' => 'Updated normal task',
            'is_p0' => true,
            'p0_reason' => 'bypass',
        ])->assertOk();

        $fresh = $todo->fresh();
        $this->assertSame('Updated normal task', $fresh->title);
        $this->assertFalse((bool) $fresh->is_p0);
        $this->assertNull($fresh->p0_reason);
    }
}
