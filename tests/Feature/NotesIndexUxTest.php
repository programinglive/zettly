<?php

namespace Tests\Feature;

use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class NotesIndexUxTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_notes_index_returns_total_count_canonical_projects_and_active_note_tags_only(): void
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
        $activeNoteTag = Tag::create([
            'user_id' => $user->id,
            'name' => 'area:architecture',
            'color' => '#06B6D4',
        ]);
        $taskOnlyTag = Tag::create([
            'user_id' => $user->id,
            'name' => 'tipe:bugfix',
            'color' => '#EF4444',
        ]);

        $note = Todo::factory()->asNote()->create([
            'user_id' => $user->id,
            'title' => 'Zettelkasten Architecture Guide',
            'description' => '## Core Principles\nUse **canonical projects**.',
        ]);
        $note->tags()->attach([$canonicalZettly->id, $activeNoteTag->id]);

        $task = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Some task not a note',
        ]);
        $task->tags()->attach([$taskOnlyTag->id]);

        $response = $this->actingAs($user)->get(route('notes.index'));

        $response->assertStatus(200);
        $response->assertInertia(function (AssertableInertia $page) use ($legacyWorktree, $taskOnlyTag, $activeNoteTag) {
            $page->component('Notes/Index')
                ->where('totalNotes', 1)
                ->has('canonicalProjects', fn (AssertableInertia $projects) => $projects
                    ->where('0.key', 'zettly')
                    ->where('0.count', 1)
                    ->etc()
                )
                ->where('tags', function ($tags) use ($legacyWorktree, $taskOnlyTag, $activeNoteTag) {
                    $ids = collect($tags)->pluck('id')->all();

                    return in_array($activeNoteTag->id, $ids, true)
                        && ! in_array($legacyWorktree->id, $ids, true)
                        && ! in_array($taskOnlyTag->id, $ids, true);
                });
        });
    }

    public function test_notes_index_supports_search_canonical_project_and_title_sort(): void
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

        $noteB = Todo::factory()->asNote()->create([
            'user_id' => $user->id,
            'title' => 'Beta Zettly Spec',
            'description' => 'Contains keyword taxonomy',
        ]);
        $noteB->tags()->attach($zettlyTag->id);

        $noteA = Todo::factory()->asNote()->create([
            'user_id' => $user->id,
            'title' => 'Alpha Zettly Spec',
            'description' => 'Contains keyword taxonomy',
        ]);
        $noteA->tags()->attach($zettlyTag->id);

        $otherProject = Todo::factory()->asNote()->create([
            'user_id' => $user->id,
            'title' => 'Clinic Taxonomy Note',
            'description' => 'Contains keyword taxonomy',
        ]);
        $otherProject->tags()->attach($clinicTag->id);

        $response = $this->actingAs($user)->get(route('notes.index', [
            'project' => 'zettly',
            'q' => 'taxonomy',
            'sort' => 'title',
        ]));

        $response->assertStatus(200);
        $response->assertInertia(function (AssertableInertia $page) use ($noteA, $noteB) {
            $page->component('Notes/Index')
                ->has('notes.data', 2)
                ->where('notes.data.0.id', $noteA->id)
                ->where('notes.data.1.id', $noteB->id)
                ->where('filters.q', 'taxonomy')
                ->where('filters.project', 'zettly')
                ->where('filters.sort', 'title');
        });
    }

    public function test_todo_show_includes_canonical_project_and_focus_metadata(): void
    {
        $user = User::factory()->create();
        $zettlyTag = Tag::create([
            'user_id' => $user->id,
            'name' => 'proyek:zettly',
            'color' => '#F59E0B',
        ]);
        $todo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Revamp detail page layout',
            'description' => 'Full-width 2-column Notion/Linear style',
        ]);
        $todo->tags()->attach($zettlyTag->id);

        $response = $this->actingAs($user)->get(route('todos.show', $todo));

        $response->assertStatus(200);
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Todos/Show')
            ->where('canonicalProject.key', 'zettly')
            ->where('canonicalProject.label', 'Zettly')
            ->has('todo.focus')
        );
    }

    public function test_notes_index_supports_multi_tag_and_intersection_across_multiple_areas(): void
    {
        $user = User::factory()->create();
        $erpArea = Tag::create(['user_id' => $user->id, 'name' => 'area:erp', 'color' => '#0EA5E9']);
        $notifArea = Tag::create(['user_id' => $user->id, 'name' => 'area:notification', 'color' => '#6366F1']);

        $both = Todo::factory()->asNote()->create([
            'user_id' => $user->id,
            'title' => 'ERP Notification Audit History',
        ]);
        $both->tags()->attach([$erpArea->id, $notifArea->id]);

        $onlyNotif = Todo::factory()->asNote()->create([
            'user_id' => $user->id,
            'title' => 'Generic Notification Note',
        ]);
        $onlyNotif->tags()->attach([$notifArea->id]);

        $response = $this->actingAs($user)->get(route('notes.index', [
            'tags' => "{$erpArea->id},{$notifArea->id}",
        ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('notes.data', 1)
            ->where('notes.data.0.id', $both->id)
            ->where('filters.tags', [$erpArea->id, $notifArea->id])
        );
    }

    public function test_notes_index_scopes_available_tags_to_active_project_filter(): void
    {
        $user = User::factory()->create();
        $erpProject = Tag::create(['user_id' => $user->id, 'name' => 'proyek:erp', 'color' => '#0EA5E9']);
        $zettlyProject = Tag::create(['user_id' => $user->id, 'name' => 'proyek:zettly', 'color' => '#F59E0B']);
        $notifArea = Tag::create(['user_id' => $user->id, 'name' => 'area:notification', 'color' => '#6366F1']);
        $cliArea = Tag::create(['user_id' => $user->id, 'name' => 'area:cli', 'color' => '#10B981']);

        $erpNote = Todo::factory()->asNote()->create(['user_id' => $user->id, 'title' => 'ERP Alerting']);
        $erpNote->tags()->attach([$erpProject->id, $notifArea->id]);

        $zettlyNote = Todo::factory()->asNote()->create(['user_id' => $user->id, 'title' => 'Zettly CLI']);
        $zettlyNote->tags()->attach([$zettlyProject->id, $cliArea->id]);

        $response = $this->actingAs($user)->get(route('notes.index', ['project' => 'erp']));
        $response->assertStatus(200);
        $response->assertInertia(function (AssertableInertia $page) {
            $tagNames = collect($page->toArray()['props']['tags'])->pluck('name')->all();
            $this->assertContains('area:notification', $tagNames);
            $this->assertNotContains('area:cli', $tagNames);
        });
    }
}
