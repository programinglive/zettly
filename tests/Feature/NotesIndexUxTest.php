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
}
