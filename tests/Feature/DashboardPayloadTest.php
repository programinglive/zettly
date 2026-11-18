<?php

namespace Tests\Feature;

use App\Models\Focus;
use App\Models\JournalEntry;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardPayloadTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_dashboard_does_not_ship_the_todo_list(): void
    {
        // Dashboard.jsx destructures `todos` and never reads it, so the whole
        // non-archived task list was loaded, hydrated (tags, both link directions,
        // attachments) and serialized for nothing.
        $user = User::factory()->create();
        Todo::factory()->for($user)->asTask()->count(80)->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->missing('todos')
                ->etc()
            );
    }

    public function test_the_dashboard_payload_does_not_grow_with_the_number_of_todos(): void
    {
        // Measured on the props, not the whole HTML: the shell is ~47 KB and hides
        // the difference. The `todos` prop alone was 1,021 bytes for 2 todos and
        // 12,499 for 22 - about 570 bytes per todo, all of it unused.
        $user = User::factory()->create();

        Todo::factory()->for($user)->asTask()->count(2)->create();
        $small = $this->propsSize($user);

        Todo::factory()->for($user)->asTask()->count(20)->create();
        $large = $this->propsSize($user);

        $this->assertLessThan(
            500,
            $large - $small,
            '20 extra todos added '.($large - $small).' bytes of props; the list is still being shipped.'
        );
    }

    public function test_today_prop_contains_all_four_sourced_blocks(): void
    {
        $user = User::factory()->create();
        Focus::factory()->for($user)->count(2)->create();
        Todo::factory()->for($user)->asTask()->count(3)->create();
        Todo::factory()->for($user)->asNote()->create();
        JournalEntry::factory()->for($user)->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('today.current_work.items', 2)
                ->has('today.open_tasks.items', 3)
                ->has('today.recent_activity.items', 1)
                ->has('today.linked_notes.items', 1)
                ->etc()
            );
    }

    public function test_today_does_not_infer_a_main_work_from_multiple_foci(): void
    {
        $user = User::factory()->create();
        Focus::factory()->for($user)->count(2)->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('today.current_work.main_work', null)
                ->has('today.current_work.items', 2)
                ->etc()
            );
    }

    public function test_existing_dashboard_props_remain_unchanged(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('tasks.open')
                ->has('tasks.completed')
                ->has('filters.tags')
                ->has('availableTags')
                ->has('notes')
                ->has('preferences.workspace_view')
                ->etc()
            );
    }

    public function test_today_uses_priority_engine_for_main_work_and_open_tasks_order(): void
    {
        $user = User::factory()->create();
        $focus = Focus::factory()->for($user)->create(['title' => 'Primary Focus']);

        $regular = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Newer Regular Task',
            'focus_id' => $focus->id,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'created_at' => now(),
        ]);

        $p0 = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Older P0 Task',
            'focus_id' => $focus->id,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'is_p0' => true,
            'p0_reason' => 'Production outage',
            'p0_since' => now()->subHour(),
            'p0_expires_at' => now()->addHours(12),
            'created_at' => now()->subDay(),
        ]);

        (new \App\Domain\Priority\MainWorkService($user->id))->set('focus', $focus->id, 'Main priority focus', 'test', $user->id);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('today.current_work.main_work.target_id', $focus->id)
                ->where('today.open_tasks.items.0.id', $p0->id)
                ->where('today.open_tasks.items.1.id', $regular->id)
                ->etc()
            );
    }

    private function propsSize(User $user): int
    {
        $response = $this->actingAs($user)->get('/dashboard')->assertOk();
        $page = $response->viewData('page') ?? [];

        return strlen(json_encode($page['props'] ?? []));
    }
}