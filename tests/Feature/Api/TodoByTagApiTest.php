<?php

namespace Tests\Feature\Api;

use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TodoByTagApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_only_the_todos_of_the_requested_tag(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->create(['user_id' => $user->id, 'name' => 'area:factory']);
        $otherTag = Tag::factory()->create(['user_id' => $user->id, 'name' => 'area:other']);

        $tagged = Todo::factory()->asTask()->create(['user_id' => $user->id]);
        $tagged->tags()->attach($tag->id);
        $untagged = Todo::factory()->asTask()->create(['user_id' => $user->id]);
        $untagged->tags()->attach($otherTag->id);

        Sanctum::actingAs($user, ['zettly:cli']);

        $response = $this->getJson('/api/v1/todos/by-tag/'.$tag->id);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.id', $tagged->id);
        $this->assertNotContains($untagged->id, array_column($response->json('data'), 'id'));
    }

    public function test_it_paginates_and_caps_per_page(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->create(['user_id' => $user->id]);
        $todos = Todo::factory()->asTask()->count(3)->create(['user_id' => $user->id]);
        $tag->todos()->attach($todos->pluck('id'));

        Sanctum::actingAs($user, ['zettly:cli']);

        $response = $this->getJson('/api/v1/todos/by-tag/'.$tag->id.'?per_page=2&page=2');

        $response->assertOk()
            ->assertJsonPath('pagination.per_page', 2)
            ->assertJsonPath('pagination.current_page', 2)
            ->assertJsonPath('pagination.total', 3)
            ->assertJsonPath('pagination.last_page', 2)
            ->assertJsonCount(1, 'data');

        $capped = $this->getJson('/api/v1/todos/by-tag/'.$tag->id.'?per_page=500');
        $capped->assertOk()->assertJsonPath('pagination.per_page', 100);
    }

    public function test_it_returns_an_empty_list_for_a_tag_without_todos(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user, ['zettly:cli']);

        $this->getJson('/api/v1/todos/by-tag/'.$tag->id)
            ->assertOk()
            ->assertJsonPath('pagination.total', 0)
            ->assertJsonCount(0, 'data');
    }

    public function test_it_rejects_a_tag_owned_by_another_user(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $tag = Tag::factory()->create(['user_id' => $owner->id]);

        Sanctum::actingAs($intruder, ['zettly:cli']);

        $this->getJson('/api/v1/todos/by-tag/'.$tag->id)
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_it_404s_for_an_unknown_tag(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['zettly:cli']);

        $this->getJson('/api/v1/todos/by-tag/999999')->assertNotFound();
    }

    public function test_it_404s_for_a_non_numeric_tag_id(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['zettly:cli']);

        $this->getJson('/api/v1/todos/by-tag/not-a-number')->assertNotFound();
    }

    public function test_it_never_returns_another_users_todo_attached_to_my_tag(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $tag = Tag::factory()->create(['user_id' => $owner->id]);

        $foreign = Todo::factory()->asTask()->create(['user_id' => $attacker->id]);
        $foreign->tags()->attach($tag->id);

        Sanctum::actingAs($owner, ['zettly:cli']);

        $this->getJson('/api/v1/todos/by-tag/'.$tag->id)
            ->assertOk()
            ->assertJsonPath('pagination.total', 0)
            ->assertJsonCount(0, 'data');
    }

    public function test_it_lists_tasks_by_default_and_notes_on_request(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->create(['user_id' => $user->id]);

        $task = Todo::factory()->asTask()->create(['user_id' => $user->id]);
        $note = Todo::factory()->asNote()->create(['user_id' => $user->id]);
        $tag->todos()->attach([$task->id, $note->id]);

        Sanctum::actingAs($user, ['zettly:cli']);

        $this->getJson('/api/v1/todos/by-tag/'.$tag->id)
            ->assertOk()
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.id', $task->id);

        $this->getJson('/api/v1/todos/by-tag/'.$tag->id.'?type=note')
            ->assertOk()
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.id', $note->id);
    }

    public function test_it_clamps_per_page_to_at_least_one(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->create(['user_id' => $user->id]);
        $tag->todos()->attach(Todo::factory()->asTask()->create(['user_id' => $user->id])->id);

        Sanctum::actingAs($user, ['zettly:cli']);

        $this->getJson('/api/v1/todos/by-tag/'.$tag->id.'?per_page=0')
            ->assertOk()
            ->assertJsonPath('pagination.per_page', 1);
    }
}
