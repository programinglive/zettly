<?php

namespace Tests\Feature;

use App\Models\Focus;
use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use App\Services\ProjectClassifierService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProjectClassificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_classifier_normalizes_worktree_aliases_and_rejects_generic_placeholders(): void
    {
        $classifier = app(ProjectClassifierService::class);

        $this->assertSame('dev-workflow', $classifier->normalizeSlug('dev-workflow-mcp-server'));
        $this->assertSame('dev-workflow', $classifier->normalizeSlug('dev-workflow-wt-v310'));
        $this->assertSame('clinic', $classifier->normalizeSlug('clinic-wt-apr002'));
        $this->assertSame('zettly', $classifier->normalizeSlug('zettly-calendar-feature'));
        $this->assertSame('dbpinball', $classifier->normalizeSlug('dbpinball-mariadb-safesync'));
        $this->assertSame('bw-infra', $classifier->normalizeSlug('bw-server-grooming-drift'));

        $this->assertNull($classifier->normalizeSlug('project'));
        $this->assertNull($classifier->normalizeSlug('repo'));
        $this->assertNull($classifier->normalizeSlug('r'));
        $this->assertNull($classifier->normalizeSlug('wt-poc'));
    }

    public function test_classifier_infers_canonical_project_from_focus_and_text_when_unassigned_or_placeholder(): void
    {
        $user = User::factory()->create();
        $placeholderTag = Tag::create(['user_id' => $user->id, 'name' => 'proyek:project', 'color' => '#999999']);
        $focus = Focus::factory()->for($user)->create(['title' => 'Clinic Room Mic Setup']);

        $todoWithPlaceholder = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Fix Zettly summary chart layout',
            'is_completed' => true,
            'completed_at' => now(),
        ]);
        $todoWithPlaceholder->tags()->attach($placeholderTag->id);

        $todoWithFocus = Todo::factory()->for($user)->asTask()->create([
            'focus_id' => $focus->id,
            'title' => 'Verify audio capture script',
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        $classifier = app(ProjectClassifierService::class);
        $this->assertSame('zettly', $classifier->classifyTodo($todoWithPlaceholder)['key']);
        $this->assertSame('clinic', $classifier->classifyTodo($todoWithFocus)['key']);
    }

    public function test_artisan_classify_projects_command_supports_dry_run_and_apply(): void
    {
        $user = User::factory()->create();
        $legacyTag = Tag::create(['user_id' => $user->id, 'name' => 'proyek:dev-workflow-mcp-server', 'color' => '#EF4444']);
        $todo = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Add focus closure check to complete_task',
            'is_completed' => true,
            'completed_at' => now(),
        ]);
        $todo->tags()->attach($legacyTag->id);

        $this->artisan('zettly:classify-projects', ['--user' => $user->id])
            ->expectsOutputToContain('DRY RUN')
            ->assertSuccessful();

        $this->assertFalse($todo->fresh()->tags()->where('name', 'proyek:dev-workflow')->exists());

        $this->artisan('zettly:classify-projects', ['--user' => $user->id, '--apply' => true])
            ->expectsOutputToContain('APPLIED')
            ->assertSuccessful();

        $this->assertTrue($todo->fresh()->tags()->where('name', 'proyek:dev-workflow')->exists());
        $this->assertFalse($todo->fresh()->tags()->where('name', 'proyek:dev-workflow-mcp-server')->exists());
    }

    public function test_summary_dashboard_merges_canonical_projects_and_surfaces_unclassified_count(): void
    {
        $user = User::factory()->create();
        $legacyTag = Tag::create(['user_id' => $user->id, 'name' => 'proyek:dev-workflow-wt-v310', 'color' => '#EF4444']);
        $t1 = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Ship workflow rule',
            'is_completed' => true,
            'completed_at' => now(),
        ]);
        $t1->tags()->attach($legacyTag->id);

        // Truly ambiguous task with no project cues
        Todo::factory()->for($user)->asTask()->create([
            'title' => 'Buy coffee beans',
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        // Task whose project cue lives only in description (regression for missing description select)
        Todo::factory()->for($user)->asTask()->create([
            'title' => 'Verify release artifacts',
            'description' => 'Repo: D:\code\clinic — check live staging deploy',
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        $this->actingAs($user)
            ->get('/summary?days=30')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Summary/Index')
                ->where('summary.projects.0.key', 'clinic')
                ->where('summary.projects.1.key', 'dev-workflow')
                ->where('summary.unclassified_count', 1)
                ->etc()
            );
    }

    public function test_classifier_and_cli_auto_tag_notes_with_canonical_project_and_tipe_note(): void
    {
        $user = User::factory()->create();

        $note = Todo::factory()->for($user)->asNote()->create([
            'title' => 'DBPinball M4 S2-c — Handover',
            'description' => 'Preflight complete for D:\\code\\dbpinball',
        ]);

        $classifier = app(ProjectClassifierService::class);
        $this->assertSame('dbpinball', $classifier->autoTagIfRecognized($note));
        $this->assertTrue($note->fresh()->tags()->where('name', 'proyek:dbpinball')->exists());
        $this->assertTrue($note->fresh()->tags()->where('name', 'tipe:note')->exists());

        $untaggedCloudNote = Todo::factory()->for($user)->asNote()->create([
            'title' => 'What is Cloud Computing',
            'description' => 'Overview of cloud infrastructure models',
        ]);

        $this->artisan('zettly:classify-projects', ['--user' => $user->id, '--apply' => true])
            ->expectsOutputToContain('APPLIED: inspected=2 updated=1 unchanged=1 unclassified=0')
            ->assertSuccessful();

        $this->assertTrue($untaggedCloudNote->fresh()->tags()->where('name', 'proyek:bw-infra')->exists());
        $this->assertTrue($untaggedCloudNote->fresh()->tags()->where('name', 'tipe:note')->exists());
    }

    public function test_classifier_eliminates_meaningless_tipe_other_and_normalizes_to_explicit_work_types(): void
    {
        $user = User::factory()->create();
        $otherTag = Tag::create(['user_id' => $user->id, 'name' => 'tipe:other', 'color' => '#94A3B8']);
        $featAliasTag = Tag::create(['user_id' => $user->id, 'name' => 'tipe:feat', 'color' => '#06B6D4']);
        $zettlyTag = Tag::create(['user_id' => $user->id, 'name' => 'proyek:zettly', 'color' => '#F59E0B']);

        $auditTodo = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Full scan of all Zettly web routes and UI/UX compliance audit',
            'description' => 'Audit all pages against ZET-UI-003',
        ]);
        $auditTodo->tags()->attach([$zettlyTag->id, $otherTag->id]);

        $opsTodo = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Backup production database and deploy v1.10.14 to bw-app',
            'description' => 'Run pg_dump and webhook-deploy-launcher',
        ]);
        $opsTodo->tags()->attach([$zettlyTag->id, $otherTag->id]);

        $featTodo = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Add split view reading pane to Zettly',
        ]);
        $featTodo->tags()->attach([$zettlyTag->id, $featAliasTag->id]);

        $this->artisan('zettly:classify-projects', ['--user' => $user->id, '--apply' => true])
            ->expectsOutputToContain('APPLIED')
            ->assertSuccessful();

        $this->assertFalse($auditTodo->fresh()->tags()->where('name', 'tipe:other')->exists());
        $this->assertTrue($auditTodo->fresh()->tags()->where('name', 'tipe:audit')->exists());

        $this->assertFalse($opsTodo->fresh()->tags()->where('name', 'tipe:other')->exists());
        $this->assertTrue($opsTodo->fresh()->tags()->where('name', 'tipe:ops')->exists());

        $this->assertFalse($featTodo->fresh()->tags()->where('name', 'tipe:feat')->exists());
        $this->assertTrue($featTodo->fresh()->tags()->where('name', 'tipe:feature')->exists());
    }

    public function test_classifier_eliminates_vague_area_dev_and_replaces_with_explicit_domain_area(): void
    {
        $user = User::factory()->create();
        $devAreaTag = Tag::create(['user_id' => $user->id, 'name' => 'area:dev', 'color' => '#94A3B8']);
        $appsAreaTag = Tag::create(['user_id' => $user->id, 'name' => 'area:apps', 'color' => '#94A3B8']);
        $zettlyTag = Tag::create(['user_id' => $user->id, 'name' => 'proyek:zettly', 'color' => '#F59E0B']);

        $uiTodo = Todo::factory()->for($user)->asTask()->create([
            'title' => 'Overhaul Zettly Master-Detail split view UI/UX layout',
            'description' => 'Update typography and responsive grid',
        ]);
        $uiTodo->tags()->attach([$zettlyTag->id, $devAreaTag->id]);

        $dbNote = Todo::factory()->for($user)->asNote()->create([
            'title' => 'PostgreSQL backup and schema migration plan for Zettly',
            'description' => 'Rename todos table to tasks and split notes table',
        ]);
        $dbNote->tags()->attach([$zettlyTag->id, $appsAreaTag->id]);

        $this->artisan('zettly:classify-projects', ['--user' => $user->id, '--apply' => true])
            ->expectsOutputToContain('APPLIED')
            ->assertSuccessful();

        $this->assertFalse($uiTodo->fresh()->tags()->where('name', 'area:dev')->exists());
        $this->assertTrue($uiTodo->fresh()->tags()->where('name', 'area:ui-ux')->exists());

        $this->assertFalse($dbNote->fresh()->tags()->where('name', 'area:apps')->exists());
        $this->assertTrue($dbNote->fresh()->tags()->where('name', 'area:database')->exists());
    }

    public function test_classify_eliminates_redundant_tipe_todo_and_prunes_unused_forbidden_tags(): void
    {
        $user = User::factory()->create();
        $zettlyTag = Tag::create(['user_id' => $user->id, 'name' => 'proyek:zettly', 'color' => '#F59E0B']);
        $todoTypeTag = Tag::create(['user_id' => $user->id, 'name' => 'tipe:todo', 'color' => '#64748B']);
        $orphanOtherTag = Tag::create(['user_id' => $user->id, 'name' => 'tipe:other', 'color' => '#64748B']);

        $task = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Fix login redirect bug in Zettly',
        ]);
        $task->tags()->attach([$zettlyTag->id, $todoTypeTag->id]);

        $this->artisan('zettly:classify-projects', ['--user' => $user->id, '--apply' => true])
            ->expectsOutputToContain('APPLIED')
            ->assertSuccessful();

        $this->assertFalse($task->fresh()->tags()->where('name', 'tipe:todo')->exists());
        $this->assertTrue($task->fresh()->tags()->where('name', 'tipe:bugfix')->exists());
        $this->assertNull(Tag::find($todoTypeTag->id));
        $this->assertNull(Tag::find($orphanOtherTag->id));
    }
}
