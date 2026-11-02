<?php

namespace Tests\Feature\Api;

use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RouteResolutionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Literal segments used to be declared after Route::apiResource(), so the
     * {todo} / {tag} wildcard swallowed them and route-model binding answered 404.
     */
    public function test_todos_priorities_resolves_to_the_priorities_action(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/todos/priorities')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_tags_search_resolves_to_the_search_action(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        Tag::factory()->create(['user_id' => $user->id, 'name' => 'urgent']);

        $response = $this->getJson('/api/tags/search?q=urg');

        $response->assertOk();
        $this->assertSame('urgent', $response->json('0.name'));
    }
}