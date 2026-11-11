<?php

namespace Tests\Feature;

use App\Models\Drawing;
use App\Models\Focus;
use App\Models\JournalEntry;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The focus board is the single read a workspace page needs: one request that
 * returns the container and everything filed inside it.
 */
class FocusBoardTest extends TestCase
{
    use RefreshDatabase;

    private function focusFor(User $user, array $attributes = []): Focus
    {
        return Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now(),
            'completed_at' => null,
            ...$attributes,
        ]);
    }

    public function test_the_board_returns_the_focus_with_its_artifacts_and_counts(): void
    {
        $user = User::factory()->create();
        $focus = $this->focusFor($user, ['title' => 'Blog migration']);

        Todo::factory()->count(3)->create([
            'user_id' => $user->id,
            'type' => Todo::TYPE_TODO,
            'focus_id' => $focus->id,
            'is_completed' => false,
        ]);
        Todo::factory()->count(2)->create([
            'user_id' => $user->id,
            'type' => Todo::TYPE_NOTE,
            'focus_id' => $focus->id,
        ]);
        Drawing::create([
            'user_id' => $user->id,
            'focus_id' => $focus->id,
            'title' => 'Flow',
            'document' => ['document' => ['store' => []]],
        ]);
        JournalEntry::create([
            'user_id' => $user->id,
            'focus_id' => $focus->id,
            'entry_date' => now()->toDateString(),
            'kind' => JournalEntry::KIND_OUTCOME,
            'content' => 'Imported the first batch',
        ]);

        $response = $this->actingAs($user)->getJson("/api/v1/focus/{$focus->id}/board");

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.focus.id', $focus->id);
        $response->assertJsonPath('data.counts.todos', 3);
        $response->assertJsonPath('data.counts.notes', 2);
        $response->assertJsonPath('data.counts.drawings', 1);
        $response->assertJsonPath('data.counts.journal', 1);
        $response->assertJsonPath('data.counts.open_todos', 3);
        $response->assertJsonCount(3, 'data.todos');
        $response->assertJsonCount(2, 'data.notes');
        $response->assertJsonCount(1, 'data.drawings');
        $response->assertJsonCount(1, 'data.journal');
    }

    public function test_the_board_never_includes_another_owners_artifacts(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $focus = $this->focusFor($owner);

        Todo::factory()->create([
            'user_id' => $stranger->id,
            'type' => Todo::TYPE_TODO,
            'focus_id' => $focus->id,
        ]);

        $response = $this->actingAs($owner)->getJson("/api/v1/focus/{$focus->id}/board");

        $response->assertOk();
        $response->assertJsonPath('data.counts.todos', 0);
        $response->assertJsonCount(0, 'data.todos');
    }

    public function test_another_owners_focus_is_forbidden(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $focus = $this->focusFor($stranger);

        $this->actingAs($owner)
            ->getJson("/api/v1/focus/{$focus->id}/board")
            ->assertStatus(403);
    }

    public function test_an_empty_focus_returns_zero_counts(): void
    {
        $user = User::factory()->create();
        $focus = $this->focusFor($user);

        $response = $this->actingAs($user)->getJson("/api/v1/focus/{$focus->id}/board");

        $response->assertOk();
        $response->assertJsonPath('data.counts.todos', 0);
        $response->assertJsonPath('data.counts.notes', 0);
        $response->assertJsonPath('data.counts.drawings', 0);
        $response->assertJsonPath('data.counts.journal', 0);
        $response->assertJsonPath('data.counts.open_todos', 0);
    }

    public function test_the_board_page_renders_for_the_owner(): void
    {
        $user = User::factory()->create();
        $focus = $this->focusFor($user, ['title' => 'Blog migration']);

        Todo::factory()->create([
            'user_id' => $user->id,
            'type' => Todo::TYPE_TODO,
            'focus_id' => $focus->id,
            'title' => 'Import post 12',
        ]);

        $this->actingAs($user)
            ->get("/focus/{$focus->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Focus/Board')
                ->where('focus.id', $focus->id)
                ->where('counts.todos', 1)
            );
    }

    public function test_the_board_page_is_not_found_for_another_owner(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $focus = $this->focusFor($stranger);

        $this->actingAs($owner)
            ->get("/focus/{$focus->id}")
            ->assertNotFound();
    }
}
