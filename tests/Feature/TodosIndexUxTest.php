<?php

namespace Tests\Feature;

use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class TodosIndexUxTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_index_returns_status_counts_canonical_projects_and_active_secondary_tags_only(): void
    {
        $user = User::factory()->create();

        $canonicalZettly = Tag::create([
            'user_id' => $user->id,
            'name' => 'proyek:zettly',
            'color' => '#F59E0B',
        ]);
        $legacyWorktree = Tag::create([
            'user_id' => $user->id,
            'name' => 'proyek:clinic-wt-apr002',
            'color' => '#94A3B8',
        ]);
        $activeType = Tag::create([
            'user_id' => $user->id,
            'name' => 'tipe:feature',
            'color' => '#06B6D4',
        ]);
        $unusedType = Tag::create([
            'user_id' => $user->id,
            'name' => 'tipe:unused-tag',
            'color' => '#CBD5E1',
        ]);

        $openTodo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Polish Zettly Tasks page',
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
        ]);
        $openTodo->tags()->attach([$canonicalZettly->id, $activeType->id]);

        $doneTodo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Legacy completed task',
            'is_completed' => true,
        ]);
        $doneTodo->tags()->attach([$canonicalZettly->id]);

        $response = $this->actingAs($user)->get(route('todos.index'));

        $response->assertStatus(200);
        $response->assertInertia(function (AssertableInertia $page) use ($legacyWorktree, $unusedType, $activeType, $openTodo) {
            $page->component('Todos/Index')
                ->where('filters.filter', 'pending')
                ->has('todos.data', 1)
                ->where('todos.data.0.id', $openTodo->id)
                ->has('todos.data.0.checklist_items')
                ->where('statusCounts.open', 1)
                ->where('statusCounts.completed', 1)
                ->where('statusCounts.all', 2)
                ->has('canonicalProjects', fn (AssertableInertia $projects) => $projects
                    ->where('0.key', 'zettly')
                    ->where('0.count', 2)
                    ->etc()
                )
                ->where('tags', function ($tags) use ($legacyWorktree, $unusedType, $activeType) {
                    $ids = collect($tags)->pluck('id')->all();

                    return in_array($activeType->id, $ids, true)
                        && ! in_array($legacyWorktree->id, $ids, true)
                        && ! in_array($unusedType->id, $ids, true);
                });
        });

        // Completed tab returns completed tasks cleanly
        $completedResponse = $this->actingAs($user)->get(route('todos.index', ['filter' => 'completed']));
        $completedResponse->assertStatus(200);
        $completedResponse->assertInertia(fn (AssertableInertia $page) => $page
            ->where('filters.filter', 'completed')
            ->has('todos.data', 1)
        );
    }

    public function test_index_filters_by_search_query_canonical_project_and_orthogonal_priority_importance(): void
    {
        $user = User::factory()->create();

        $zettlyTag = Tag::create([
            'user_id' => $user->id,
            'name' => 'proyek:zettly',
            'color' => '#F59E0B',
        ]);
        $clinicTag = Tag::create([
            'user_id' => $user->id,
            'name' => 'proyek:clinic',
            'color' => '#2563EB',
        ]);

        $matching = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Overhaul Tasks filter toolbar',
            'description' => 'Add canonical project dropdown and search',
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
        ]);
        $matching->tags()->attach($zettlyTag->id);

        $wrongProject = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Overhaul Clinic filter toolbar',
            'description' => 'Clinic report filter',
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
        ]);
        $wrongProject->tags()->attach($clinicTag->id);

        $wrongImportance = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Overhaul minor tooltip',
            'description' => 'Filter toolbar minor tweak',
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
        ]);
        $wrongImportance->tags()->attach($zettlyTag->id);

        $response = $this->actingAs($user)->get(route('todos.index', [
            'filter' => 'pending',
            'project' => 'zettly',
            'priority' => 'urgent',
            'importance' => 'important',
            'q' => 'toolbar',
        ]));

        $response->assertStatus(200);
        $response->assertInertia(function (AssertableInertia $page) use ($matching) {
            $page->component('Todos/Index')
                ->has('todos.data', 1)
                ->where('todos.data.0.id', $matching->id)
                ->where('filters.q', 'toolbar')
                ->where('filters.project', 'zettly')
                ->where('filters.priority', 'urgent')
                ->where('filters.importance', 'important');
        });
    }
}
