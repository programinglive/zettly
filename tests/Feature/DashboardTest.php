<?php

namespace Tests\Feature;

use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
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

        $response = $this->actingAs($user, 'web')->get('/dashboard?tags[]=' . $workTag->id);

        $response->assertOk();

        $response->assertInertia(function (Assert $page) use ($workTag, $workTodo) {
            $page->component('Dashboard')
                ->where('filters.tags', [$workTag->id])
                ->where('todos', function ($todos) use ($workTodo) {
                    return count($todos) === 1 && $todos[0]['id'] === $workTodo->id;
                });
        });
    }
}
