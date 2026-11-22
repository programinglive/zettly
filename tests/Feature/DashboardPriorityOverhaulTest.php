<?php

namespace Tests\Feature;

use App\Models\Focus;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardPriorityOverhaulTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_metrics_and_active_focus_counts_are_consistent_and_user_scoped(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        // Create 6 active focuses for $user and 2 for $otherUser
        $foci = Focus::factory()->for($user)->count(6)->create();
        Focus::factory()->for($otherUser)->count(2)->create();

        // Focus 0 has 1 open + 1 completed => 50% progress, active_with_tasks
        Todo::factory()->for($user)->asTask()->create([
            'focus_id' => $foci[0]->id,
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'queue_state' => Todo::QUEUE_COMMITTED,
        ]);
        Todo::factory()->for($user)->asTask()->create([
            'focus_id' => $foci[0]->id,
            'is_completed' => true,
        ]);

        // Unprioritized open task
        Todo::factory()->for($user)->asTask()->create([
            'is_completed' => false,
            'priority' => null,
            'importance' => null,
        ]);

        // Other user's open task must never leak into $user metrics
        Todo::factory()->for($otherUser)->asTask()->create(['is_completed' => false]);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('today.metrics.active_focuses', 6)
                ->where('today.current_work.total_active', 6)
                ->has('today.current_work.items', 6)
                ->where('today.metrics.open_overall', 2)
                ->where('today.metrics.open_today', 1)
                ->where('today.metrics.completed', 1)
                ->where('today.metrics.unprioritized', 1)
                ->etc()
            );
    }

    public function test_empty_active_focus_never_shows_100_percent_and_zero_open_tasks_shows_actionable_planning_message(): void
    {
        $user = User::factory()->create();
        Focus::factory()->for($user)->create(['title' => 'Empty Active Focus']);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('today.current_work.items.0.progress_percent', null)
                ->where('today.current_work.items.0.work_state', 'planning')
                ->where('today.open_tasks.status', 'no_data')
                ->where('today.open_tasks.message', 'Your active Focuses need actionable tasks. Create or select the next step.')
                ->etc()
            );
    }

    public function test_dashboard_sorts_current_work_by_priority_and_respects_server_sort_params(): void
    {
        $user = User::factory()->create();

        // Older focus with a P1 (urgent + important) open task
        $p1Focus = Focus::factory()->for($user)->create([
            'title' => 'P1 Older Active Focus',
            'started_at' => now()->subDays(2),
        ]);
        Todo::factory()->for($user)->asTask()->create([
            'focus_id' => $p1Focus->id,
            'title' => 'Urgent Important Task',
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'due_date' => now()->addDays(5),
        ]);

        // Newer focus with 0 open tasks (P3)
        $p3Focus = Focus::factory()->for($user)->create([
            'title' => 'P3 Newer Empty Focus',
            'started_at' => now(),
        ]);
        Todo::factory()->for($user)->asTask()->create([
            'focus_id' => $p3Focus->id,
            'is_completed' => true,
        ]);

        // Default priority sort MUST put P1 focus above newer P3 focus
        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('today.current_work.items.0.id', $p1Focus->id)
                ->where('today.current_work.items.0.priority_tier', 'P1')
                ->where('today.current_work.items.1.id', $p3Focus->id)
                ->where('today.current_work.items.1.priority_tier', 'P3')
                ->where('filters.focus_sort', 'priority')
                ->where('filters.sort', 'priority')
                ->etc()
            );

        // focus_sort=open_tasks also keeps open tasks focus first
        $this->actingAs($user)
            ->get('/dashboard?focus_sort=open_tasks&sort=due_date')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('today.current_work.items.0.id', $p1Focus->id)
                ->where('filters.focus_sort', 'open_tasks')
                ->where('filters.sort', 'due_date')
                ->etc()
            );
    }
}
