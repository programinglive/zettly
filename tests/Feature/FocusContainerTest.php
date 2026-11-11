<?php

namespace Tests\Feature;

use App\Models\Drawing;
use App\Models\Focus;
use App\Models\JournalEntry;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Slice 1 of the focus container model: several focuses may be active at the same
 * time, and artifacts link to a focus through a real foreign key instead of the
 * HTML comment marker that used to live in a Todo description.
 */
class FocusContainerTest extends TestCase
{
    use RefreshDatabase;

    private function activeFocus(User $user, array $attributes = []): Focus
    {
        return Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now(),
            'completed_at' => null,
            ...$attributes,
        ]);
    }

    // ---------------------------------------------------------------- schema

    public function test_artifact_tables_have_a_nullable_focus_foreign_key(): void
    {
        foreach (['todos', 'drawings', 'journal_entries'] as $table) {
            $this->assertTrue(
                Schema::hasColumn($table, 'focus_id'),
                "{$table} is missing the focus_id column."
            );
        }
    }

    public function test_foci_table_carries_status_and_color(): void
    {
        $this->assertTrue(Schema::hasColumn('foci', 'status'));
        $this->assertTrue(Schema::hasColumn('foci', 'color'));
    }

    public function test_deleting_a_focus_keeps_its_artifacts_unlinked(): void
    {
        $user = User::factory()->create();
        $focus = $this->activeFocus($user);

        $todo = Todo::factory()->create(['user_id' => $user->id, 'focus_id' => $focus->id]);

        $focus->delete();

        $this->assertDatabaseHas('todos', ['id' => $todo->id, 'focus_id' => null]);
    }

    public function test_the_focus_migrations_roll_back_on_sqlite(): void
    {
        $migrations = [
            '2026_11_12_000002_add_status_and_color_to_foci_table',
            '2026_11_12_000001_add_focus_id_to_artifacts',
        ];

        // SQLite cannot drop a column that a foreign key still references
        // without rebuilding the table, so the artifact column is kept and the
        // index is removed. Both migrations must still run without error and
        // must be safe to re-run afterwards.
        foreach ($migrations as $name) {
            $migration = require database_path("migrations/{$name}.php");
            $migration->down();
        }

        $this->assertFalse(Schema::hasColumn('foci', 'status'));

        $migration = require database_path('migrations/2026_11_12_000001_add_focus_id_to_artifacts.php');
        $migration->up();

        $this->assertTrue(Schema::hasColumn('todos', 'focus_id'));
    }

    // ------------------------------------------------- multiple active foci

    public function test_an_owner_can_have_several_active_foci(): void    {
        $user = User::factory()->create();

        $first = $this->activeFocus($user, ['title' => 'Blog migration']);
        $second = $this->activeFocus($user, ['title' => 'Sentry bugfix']);

        $activeIds = $user->activeFoci()->orderBy('id')->pluck('id')->all();

        $this->assertSame([$first->id, $second->id], $activeIds);
    }

    public function test_a_paused_focus_is_not_active(): void
    {
        $user = User::factory()->create();
        $paused = $this->activeFocus($user, ['status' => Focus::STATUS_PAUSED]);
        $running = $this->activeFocus($user);

        $activeIds = $user->activeFoci()->pluck('id')->all();

        $this->assertSame([$running->id], $activeIds);
        $this->assertFalse($paused->fresh()->isActive());
        $this->assertTrue($running->fresh()->isActive());
    }

    public function test_current_focus_prefers_a_running_focus_over_a_paused_one(): void
    {
        $user = User::factory()->create();
        // The paused focus is the newest, so a pure started_at ordering would pick it.
        $this->activeFocus($user, ['status' => Focus::STATUS_PAUSED, 'started_at' => now()]);
        $running = $this->activeFocus($user, ['started_at' => now()->subHour()]);

        $this->assertSame($running->id, $user->currentFocus()->first()?->id);
    }

    public function test_current_focus_endpoint_reports_how_many_are_active(): void
    {
        $user = User::factory()->create();
        $this->activeFocus($user);
        $this->activeFocus($user);
        $this->activeFocus($user, ['status' => Focus::STATUS_PAUSED]);

        $response = $this->actingAs($user)->getJson('/api/v1/focus/current');

        $response->assertOk();
        $response->assertJsonPath('active_focus_count', 2);
    }

    // ------------------------------------------------------ status lifecycle

    public function test_a_focus_can_be_paused_and_resumed(): void
    {
        $user = User::factory()->create();
        $focus = $this->activeFocus($user);

        $this->actingAs($user)
            ->patchJson("/api/v1/focus/{$focus->id}/status", ['status' => Focus::STATUS_PAUSED])
            ->assertOk();

        $this->assertSame(Focus::STATUS_PAUSED, $focus->fresh()->status);
        $this->assertDatabaseHas('focus_status_events', [
            'focus_id' => $focus->id,
            'action' => 'paused',
        ]);

        $this->actingAs($user)
            ->patchJson("/api/v1/focus/{$focus->id}/status", ['status' => Focus::STATUS_ACTIVE])
            ->assertOk();

        $this->assertSame(Focus::STATUS_ACTIVE, $focus->fresh()->status);
        $this->assertDatabaseHas('focus_status_events', [
            'focus_id' => $focus->id,
            'action' => 'resumed',
        ]);
    }

    public function test_completing_a_focus_sets_the_completed_status(): void
    {
        $user = User::factory()->create();
        $focus = $this->activeFocus($user);

        $this->actingAs($user)
            ->postJson("/api/v1/focus/{$focus->id}/complete", ['reason' => 'All work verified'])
            ->assertOk();

        $this->assertSame(Focus::STATUS_COMPLETED, $focus->fresh()->status);
        $this->assertNotNull($focus->fresh()->completed_at);
    }

    public function test_a_focus_cannot_be_created_already_paused(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/focus', ['title' => 'Premature', 'status' => Focus::STATUS_PAUSED])
            ->assertStatus(422);
    }

    public function test_focus_color_can_be_changed_after_creation(): void
    {
        $user = User::factory()->create();
        $focus = $this->activeFocus($user, ['color' => '#6366F1']);

        $this->actingAs($user)
            ->patchJson("/api/v1/focus/{$focus->id}", [
                'title' => $focus->title,
                'color' => '#22C55E',
            ])
            ->assertOk();

        $this->assertSame('#22C55E', $focus->fresh()->color);
    }

    // ------------------------------------------------------ artifact linking

    public function test_a_todo_can_be_created_inside_a_focus(): void
    {
        $user = User::factory()->create();
        $focus = $this->activeFocus($user);

        $response = $this->actingAs($user)
            ->postJson('/api/v1/todos', [
                'title' => 'Import post 12',
                'type' => Todo::TYPE_TODO,
                'focus_id' => $focus->id,
            ])
            ->assertCreated();

        $this->assertSame($focus->id, $response->json('data.focus_id'));
        $this->assertSame($focus->id, Todo::findOrFail($response->json('data.id'))->focus_id);
    }

    public function test_a_note_can_be_created_inside_a_focus(): void
    {
        $user = User::factory()->create();
        $focus = $this->activeFocus($user);

        $response = $this->actingAs($user)
            ->postJson('/api/v1/todos', [
                'title' => 'Finding on redirects',
                'type' => Todo::TYPE_NOTE,
                'focus_id' => $focus->id,
            ])
            ->assertCreated();

        $this->assertSame($focus->id, Todo::findOrFail($response->json('data.id'))->focus_id);
    }

    public function test_an_artifact_cannot_link_to_another_owners_focus(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $strangerFocus = $this->activeFocus($stranger);

        $this->actingAs($owner)
            ->postJson('/api/v1/todos', [
                'title' => 'Should be rejected',
                'type' => Todo::TYPE_TODO,
                'focus_id' => $strangerFocus->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('focus_id');

        $this->assertDatabaseMissing('todos', ['title' => 'Should be rejected']);
    }

    public function test_a_drawing_can_be_linked_to_a_focus_by_a_focus_only_patch(): void
    {
        $user = User::factory()->create();
        $focus = $this->activeFocus($user);
        $drawing = Drawing::create([
            'user_id' => $user->id,
            'title' => 'Flow',
            'document' => ['document' => ['store' => []]],
        ]);

        Mail::fake();
        config(['broadcasting.default' => 'null']);

        $this->actingAs($user)
            ->patchJson("/api/v1/drawings/{$drawing->id}", ['focus_id' => $focus->id])
            ->assertOk();

        $this->assertSame($focus->id, $drawing->fresh()->focus_id);
    }

    public function test_a_journal_entry_inherits_the_focus_of_its_todo(): void
    {
        $user = User::factory()->create();
        $focus = $this->activeFocus($user);
        $todo = Todo::factory()->create(['user_id' => $user->id, 'focus_id' => $focus->id]);

        $this->actingAs($user)
            ->postJson('/api/v1/journal/entries', [
                'entry_date' => now()->toDateString(),
                'kind' => 'outcome',
                'content' => 'Finished the import',
                'todo_id' => $todo->id,
            ])
            ->assertCreated();

        $entry = JournalEntry::where('todo_id', $todo->id)->firstOrFail();
        $this->assertSame($focus->id, $entry->focus_id);
    }

    public function test_an_explicit_journal_focus_wins_over_the_todo_focus(): void
    {
        $user = User::factory()->create();
        $todoFocus = $this->activeFocus($user);
        $explicitFocus = $this->activeFocus($user);
        $todo = Todo::factory()->create(['user_id' => $user->id, 'focus_id' => $todoFocus->id]);

        $this->actingAs($user)
            ->postJson('/api/v1/journal/entries', [
                'entry_date' => now()->toDateString(),
                'kind' => 'outcome',
                'content' => 'Recorded under another focus',
                'todo_id' => $todo->id,
                'focus_id' => $explicitFocus->id,
            ])
            ->assertCreated();

        $entry = JournalEntry::where('todo_id', $todo->id)->firstOrFail();
        $this->assertSame($explicitFocus->id, $entry->focus_id);
    }

    // ------------------------------------------------------------- backfill

    public function test_backfill_converts_description_markers_into_real_links(): void
    {
        $user = User::factory()->create();
        $focus = $this->activeFocus($user);

        $marked = Todo::factory()->create([
            'user_id' => $user->id,
            'description' => "Imported ten posts\n<!-- dev-workflow-focus:{$focus->id} -->",
            'focus_id' => null,
        ]);
        $plain = Todo::factory()->create([
            'user_id' => $user->id,
            'description' => 'No marker here',
            'focus_id' => null,
        ]);

        $this->artisan('focus:backfill-links')
            ->expectsOutputToContain('linked')
            ->assertSuccessful();

        $this->assertSame($focus->id, $marked->fresh()->focus_id);
        $this->assertNull($plain->fresh()->focus_id);
    }

    public function test_backfill_dry_run_writes_nothing(): void
    {
        $user = User::factory()->create();
        $focus = $this->activeFocus($user);

        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'description' => "Work\n<!-- dev-workflow-focus:{$focus->id} -->",
            'focus_id' => null,
        ]);

        $this->artisan('focus:backfill-links', ['--dry-run' => true])->assertSuccessful();

        $this->assertNull($todo->fresh()->focus_id);
    }

    public function test_backfill_is_idempotent_and_never_overwrites(): void
    {
        $user = User::factory()->create();
        $original = $this->activeFocus($user);
        $other = $this->activeFocus($user);

        $todo = Todo::factory()->create([
            'user_id' => $user->id,
            'description' => "Work\n<!-- dev-workflow-focus:{$other->id} -->",
            'focus_id' => $original->id,
        ]);

        $this->artisan('focus:backfill-links')->assertSuccessful();
        $this->artisan('focus:backfill-links')->assertSuccessful();

        $this->assertSame($original->id, $todo->fresh()->focus_id);
    }
}
