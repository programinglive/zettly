<?php

namespace Tests\Feature;

use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TagManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_their_tags(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create([
            'name' => 'Important',
            'color' => '#EF4444'
        ]);

        $response = $this->actingAs($user)
            ->withHeader('Accept', 'application/json')
            ->get('/tags');

        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonFragment([
            'name' => 'Important',
            'color' => '#EF4444'
        ]);
    }

    public function test_user_can_create_a_tag(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/tags', [
            'name' => 'Urgent',
            'color' => '#10B981'
        ]);

        $response->assertRedirect('/tags');
        $response->assertSessionHas('success', 'Tag created successfully!');
        $this->assertDatabaseHas('tags', [
            'user_id' => $user->id,
            'name' => 'Urgent',
            'color' => '#10B981'
        ]);
    }

    public function test_user_can_delete_their_tag(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create();

        $response = $this->actingAs($user)->delete("/tags/{$tag->id}");

        $response->assertRedirect('/tags');
        $response->assertSessionHas('success', 'Tag deleted successfully!');
        $this->assertSoftDeleted('tags', ['id' => $tag->id]);
    }

    public function test_user_cannot_delete_another_users_tag(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $tag = Tag::factory()->for($user2)->create();

        $response = $this->actingAs($user1)->delete("/tags/{$tag->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('tags', ['id' => $tag->id]);
    }

    public function test_tag_creation_requires_valid_data(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withHeader('Accept', 'application/json')
            ->post('/tags', [
                'name' => '',
                'color' => 'not-a-hex-color'
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'color']);
    }
}
