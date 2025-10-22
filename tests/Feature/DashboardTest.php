<?php

namespace Tests\Feature;

use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_stats_exclude_archived_and_include_archived_count(): void
    {
        /** @var User $user */
        $user = User::factory()->createOne();

        // Non-archived todos
        Todo::factory()->asTask()->for($user)->create([
            'priority' => 'urgent',
            'is_completed' => false,
        ]);

        Todo::factory()->asTask()->for($user)->create([
            'priority' => 'high',
            'is_completed' => false,
        ]);

        Todo::factory()->asTask()->for($user)->create([
            'priority' => 'medium',
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        // Notes should be ignored for stats
        Todo::factory()->for($user)->create([
            'type' => 'note',
            'priority' => null,
            'is_completed' => false,
        ]);

        // Archived todos (should not affect other stats)
        Todo::factory()->asTask()->for($user)->create([
            'priority' => 'urgent',
            'is_completed' => false,
            'archived' => true,
            'archived_at' => now(),
        ]);

        Todo::factory()->asTask()->for($user)->create([
            'priority' => 'low',
            'is_completed' => true,
            'completed_at' => now(),
            'archived' => true,
            'archived_at' => now(),
        ]);

        $response = $this->actingAs($user, 'web')->get('/dashboard');

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('stats.total', 3)
            ->where('stats.completed', 1)
            ->where('stats.pending', 2)
            ->where('stats.urgent', 1)
            ->where('stats.high', 1)
            ->where('stats.archived', 2)
        );
    }

    public function test_dashboard_filters_todos_by_selected_tags(): void
    {
        /** @var User $user */
        $user = User::factory()->createOne();
        /** @var User $otherUser */
        $otherUser = User::factory()->createOne();

        $workTag = Tag::factory()->for($user)->create(['name' => 'Work']);
        $personalTag = Tag::factory()->for($user)->create(['name' => 'Personal']);
        Tag::factory()->for($otherUser)->create(['name' => 'Work']);

        $workTodo = Todo::factory()->asTask()->for($user)->create();
        $personalTodo = Todo::factory()->asTask()->for($user)->create();
        $archivedTodo = Todo::factory()->asTask()->for($user)->create([
            'archived' => true,
            'archived_at' => now(),
        ]);

        $workTodo->tags()->sync([$workTag->id]);
        $personalTodo->tags()->sync([$personalTag->id]);
        $archivedTodo->tags()->sync([$workTag->id]);

        $response = $this->actingAs($user, 'web')->get('/dashboard?tags[]='.$workTag->id);

        $response->assertOk();

        $response->assertInertia(function (Assert $page) use ($workTag, $workTodo) {
            $page->component('Dashboard')
                ->where('filters.tags', [$workTag->id])
                ->where('todos', function ($todos) use ($workTodo) {
                    return count($todos) === 1 && $todos[0]['id'] === $workTodo->id;
                });
        });
    }

    public function test_dashboard_todos_are_sorted_for_kanban_display(): void
    {
        /** @var User $user */
        $user = User::factory()->createOne();

        $urgentNewTime = Carbon::parse('2024-01-01 12:05:00');
        $urgentOldTime = Carbon::parse('2024-01-01 12:00:00');
        $highTime = Carbon::parse('2024-01-01 11:55:00');
        $mediumTime = Carbon::parse('2024-01-01 11:50:00');
        $completedRecentTime = Carbon::parse('2024-01-01 11:45:00');
        $completedOlderTime = Carbon::parse('2024-01-01 11:40:00');

        $urgentNew = Todo::factory()->asTask()->for($user)->create([
            'priority' => 'urgent',
            'is_completed' => false,
            'created_at' => $urgentNewTime,
            'updated_at' => $urgentNewTime,
        ]);

        $urgentOld = Todo::factory()->asTask()->for($user)->create([
            'priority' => 'urgent',
            'is_completed' => false,
            'created_at' => $urgentOldTime,
            'updated_at' => $urgentOldTime,
        ]);

        $high = Todo::factory()->asTask()->for($user)->create([
            'priority' => 'high',
            'is_completed' => false,
            'created_at' => $highTime,
            'updated_at' => $highTime,
        ]);

        $medium = Todo::factory()->asTask()->for($user)->create([
            'priority' => 'medium',
            'is_completed' => false,
            'created_at' => $mediumTime,
            'updated_at' => $mediumTime,
        ]);

        $completedRecent = Todo::factory()->asTask()->for($user)->create([
            'priority' => null,
            'is_completed' => true,
            'completed_at' => $completedRecentTime,
            'created_at' => $completedRecentTime,
            'updated_at' => $completedRecentTime,
        ]);

        $completedOlder = Todo::factory()->asTask()->for($user)->create([
            'priority' => null,
            'is_completed' => true,
            'completed_at' => $completedOlderTime,
            'created_at' => $completedOlderTime,
            'updated_at' => $completedOlderTime,
        ]);

        Todo::factory()->asTask()->for($user)->create([
            'priority' => 'high',
            'is_completed' => false,
            'archived' => true,
            'archived_at' => Carbon::parse('2024-01-01 12:10:00'),
        ]);

        Todo::factory()->for($user)->create([
            'type' => 'note',
            'priority' => null,
        ]);

        $response = $this->actingAs($user, 'web')->get('/dashboard');

        $response->assertOk();

        $expectedOrder = [
            $urgentNew->id,
            $urgentOld->id,
            $high->id,
            $medium->id,
            $completedRecent->id,
            $completedOlder->id,
        ];

        $response->assertInertia(function (Assert $page) use ($expectedOrder) {
            $page->component('Dashboard')
                ->has('todos', 6)
                ->where('todos', function ($todos) use ($expectedOrder) {
                    $ids = collect($todos)->pluck('id')->all();

                    return $ids === $expectedOrder;
                });
        });
    }

    public function test_dashboard_layout_uses_fluid_containers(): void
    {
        $layoutContent = file_get_contents(resource_path('js/Layouts/AppLayout.jsx'));
        $this->assertNotFalse($layoutContent);

        $this->assertStringContainsString("resolvedVariant === 'public'", $layoutContent);
        $this->assertStringContainsString("variant ?? (isAuthenticated ? 'authenticated' : 'public')", $layoutContent);
        $this->assertStringContainsString('className={resolvedContentClassName}', $layoutContent);
        $this->assertStringContainsString('className={resolvedNavClassName}', $layoutContent);

        $dashboardLayoutContent = file_get_contents(resource_path('js/Layouts/DashboardLayout.jsx'));
        $this->assertNotFalse($dashboardLayoutContent);
        $this->assertStringContainsString("contentClassName ?? 'w-full px-4 sm:px-6 lg:px-8'", $dashboardLayoutContent);
        $this->assertStringContainsString("navClassName ?? 'w-full px-4 sm:px-6 lg:px-8'", $dashboardLayoutContent);

        $dashboardContent = file_get_contents(resource_path('js/Pages/Dashboard.jsx'));
        $this->assertNotFalse($dashboardContent);

        $this->assertStringContainsString('DashboardLayout title="Dashboard"', $dashboardContent);
        $this->assertStringContainsString('flex flex-wrap items-stretch gap-3 md:flex-nowrap', $dashboardContent);
        $this->assertStringContainsString('sticky bottom-6 left-0 right-0', $dashboardContent);
        $this->assertStringNotContainsString('max-w-6xl', $dashboardContent);
    }
}
