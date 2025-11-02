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
            'color' => '#EF4444',
        ]);

        $response = $this->actingAs($user)
            ->withHeader('Accept', 'application/json')
            ->get('/manage/tags');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'tags',
            'deletedTags',
        ]);
        $response->assertJsonCount(1, 'tags');
        $response->assertJsonFragment([
            'name' => 'Important',
            'color' => '#EF4444',
        ]);
    }

    public function test_user_can_create_a_tag(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post('/manage/tags', [
                'name' => 'Urgent',
                'color' => '#10B981',
                '_token' => 'test-token',
            ]);

        $response->assertRedirect('/manage/tags');
        $response->assertSessionHas('success', 'Tag created successfully!');
        $this->assertDatabaseHas('tags', [
            'user_id' => $user->id,
            'name' => 'Urgent',
            'color' => '#10B981',
        ]);
    }

    public function test_user_can_create_tag_via_json_request(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withHeader('Accept', 'application/json')
            ->postJson('/manage/tags', [
                'name' => 'Json Tag',
                'color' => '#123456',
            ]);

        $response->assertCreated();
        $response->assertJsonFragment([
            'name' => 'Json Tag',
            'color' => '#123456',
        ]);

        $this->assertDatabaseHas('tags', [
            'user_id' => $user->id,
            'name' => 'Json Tag',
            'color' => '#123456',
        ]);
    }

    public function test_user_can_delete_their_tag(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create();

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->delete("/manage/tags/{$tag->id}", ['_token' => 'test-token']);

        $response->assertRedirect('/manage/tags');
        $response->assertSessionHas('success', 'Tag deleted successfully!');
        $this->assertSoftDeleted('tags', ['id' => $tag->id]);
    }

    public function test_user_cannot_delete_another_users_tag(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $tag = Tag::factory()->for($user2)->create();

        $response = $this->actingAs($user1)
            ->withSession(['_token' => 'test-token'])
            ->delete("/manage/tags/{$tag->id}", ['_token' => 'test-token']);

        $response->assertStatus(403);
        $this->assertDatabaseHas('tags', ['id' => $tag->id]);
    }

    public function test_tag_creation_requires_valid_data(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->withHeader('Accept', 'application/json')
            ->post('/manage/tags', [
                'name' => '',
                '_token' => 'test-token',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
    }

    public function test_tag_creation_handles_invalid_color_gracefully(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post('/manage/tags', [
                'name' => 'Test Tag',
                'color' => 'not-a-hex-color',
                '_token' => 'test-token',
            ]);

        $response->assertRedirect('/manage/tags');
        $response->assertSessionHas('success', 'Tag created successfully!');

        // Should use default color when invalid color is provided
        $this->assertDatabaseHas('tags', [
            'user_id' => $user->id,
            'name' => 'Test Tag',
            'color' => '#3B82F6', // Default blue color
        ]);
    }

    public function test_tag_creation_without_color_uses_random_color(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post('/manage/tags', [
                'name' => 'No Color Tag',
                '_token' => 'test-token',
            ]);

        $response->assertRedirect('/manage/tags');
        $response->assertSessionHas('success', 'Tag created successfully!');

        $tag = Tag::where('user_id', $user->id)->where('name', 'No Color Tag')->first();
        $this->assertNotNull($tag);
        $this->assertNotEmpty($tag->color);
        $this->assertStringStartsWith('#', $tag->color);
    }

    public function test_duplicate_tag_creation_returns_existing_tag(): void
    {
        $user = User::factory()->create();

        // Create initial tag
        $existingTag = Tag::factory()->for($user)->create([
            'name' => 'Duplicate Test',
            'color' => '#FF0000',
        ]);

        // Try to create duplicate tag
        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post('/manage/tags', [
                'name' => 'Duplicate Test',
                '_token' => 'test-token',
            ]);

        $response->assertRedirect('/manage/tags');
        $response->assertSessionHas('error', 'A tag with this name already exists!');

        // Should still only have one tag with this name
        $tagCount = Tag::where('user_id', $user->id)->where('name', 'Duplicate Test')->count();
        $this->assertEquals(1, $tagCount);
    }

    public function test_user_can_restore_deleted_tag(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create([
            'name' => 'Restore Test',
            'color' => '#00FF00',
        ]);

        // Delete the tag
        $tag->delete();
        $this->assertSoftDeleted('tags', ['id' => $tag->id]);

        // Restore the tag
        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post("/manage/tags/{$tag->id}/restore", ['_token' => 'test-token']);

        $response->assertRedirect('/manage/tags');
        $response->assertSessionHas('success', 'Tag restored successfully!');

        // Tag should be restored
        $this->assertDatabaseHas('tags', [
            'id' => $tag->id,
            'name' => 'Restore Test',
            'deleted_at' => null,
        ]);
    }

    public function test_user_cannot_restore_another_users_tag(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $tag = Tag::factory()->for($user2)->create();
        $tag->delete();

        $response = $this->actingAs($user1)
            ->withSession(['_token' => 'test-token'])
            ->post("/manage/tags/{$tag->id}/restore", ['_token' => 'test-token']);

        $response->assertStatus(404); // Should not find the tag
        $this->assertSoftDeleted('tags', ['id' => $tag->id]); // Tag should still be deleted
    }

    public function test_user_can_update_tag_name_and_color(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create([
            'name' => 'Original Name',
            'color' => '#FF0000',
        ]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->put("/manage/tags/{$tag->id}", [
                'name' => 'Updated Name',
                'color' => '#00FF00',
                '_token' => 'test-token',
            ]);

        $response->assertRedirect('/manage/tags');
        $response->assertSessionHas('success', 'Tag updated successfully!');

        $this->assertDatabaseHas('tags', [
            'id' => $tag->id,
            'name' => 'Updated Name',
            'color' => '#00FF00',
        ]);
    }

    public function test_user_can_update_tag_with_only_name(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create([
            'name' => 'Original Name',
            'color' => '#FF0000',
        ]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->put("/manage/tags/{$tag->id}", [
                'name' => 'Updated Name',
                '_token' => 'test-token',
            ]);

        $response->assertRedirect('/manage/tags');
        $response->assertSessionHas('success', 'Tag updated successfully!');

        // Should keep original color and update name
        $this->assertDatabaseHas('tags', [
            'id' => $tag->id,
            'name' => 'Updated Name',
            'color' => '#FF0000', // Original color preserved
        ]);
    }

    public function test_user_can_update_tag_via_json_request(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create([
            'name' => 'Json Original',
            'color' => '#ABCDEF',
        ]);

        $response = $this->actingAs($user)
            ->withHeader('Accept', 'application/json')
            ->putJson("/manage/tags/{$tag->id}", [
                'name' => 'Json Updated',
                'color' => '#654321',
            ]);

        $response->assertOk();
        $response->assertJsonFragment([
            'id' => $tag->id,
            'name' => 'Json Updated',
            'color' => '#654321',
        ]);

        $this->assertDatabaseHas('tags', [
            'id' => $tag->id,
            'user_id' => $user->id,
            'name' => 'Json Updated',
            'color' => '#654321',
        ]);
    }

    public function test_user_cannot_update_tag_to_duplicate_name(): void
    {
        $user = User::factory()->create();
        $tag1 = Tag::factory()->for($user)->create(['name' => 'Existing Tag']);
        $tag2 = Tag::factory()->for($user)->create(['name' => 'Tag to Update']);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->put("/manage/tags/{$tag2->id}", [
                'name' => 'Existing Tag',
                'color' => '#00FF00',
                '_token' => 'test-token',
            ]);

        $response->assertRedirect('/manage/tags');
        $response->assertSessionHas('error', 'A tag with this name already exists!');

        // Tag should not be updated
        $this->assertDatabaseHas('tags', [
            'id' => $tag2->id,
            'name' => 'Tag to Update', // Original name preserved
        ]);
    }

    public function test_user_can_update_tag_to_same_name(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create([
            'name' => 'Same Name',
            'color' => '#FF0000',
        ]);

        // Should be able to update color while keeping same name
        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->put("/manage/tags/{$tag->id}", [
                'name' => 'Same Name',
                'color' => '#00FF00',
                '_token' => 'test-token',
            ]);

        $response->assertRedirect('/manage/tags');
        $response->assertSessionHas('success', 'Tag updated successfully!');

        $this->assertDatabaseHas('tags', [
            'id' => $tag->id,
            'name' => 'Same Name',
            'color' => '#00FF00',
        ]);
    }

    public function test_user_cannot_update_another_users_tag(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $tag = Tag::factory()->for($user2)->create(['name' => 'User 2 Tag']);

        $response = $this->actingAs($user1)
            ->withSession(['_token' => 'test-token'])
            ->put("/manage/tags/{$tag->id}", [
                'name' => 'Hacked Name',
                'color' => '#FF0000',
                '_token' => 'test-token',
            ]);

        $response->assertStatus(403);

        // Tag should not be updated
        $this->assertDatabaseHas('tags', [
            'id' => $tag->id,
            'name' => 'User 2 Tag', // Original name preserved
        ]);
    }

    public function test_tag_update_validates_required_name(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create(['name' => 'Original Name']);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->withHeader('Accept', 'application/json')
            ->put("/manage/tags/{$tag->id}", [
                'name' => '',
                'color' => '#FF0000',
                '_token' => 'test-token',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
    }

    public function test_tag_update_handles_invalid_color_gracefully(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create([
            'name' => 'Test Tag',
            'color' => '#FF0000',
        ]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->put("/manage/tags/{$tag->id}", [
                'name' => 'Updated Tag',
                'color' => 'invalid-color',
                '_token' => 'test-token',
            ]);

        $response->assertRedirect('/manage/tags');
        $response->assertSessionHas('success', 'Tag updated successfully!');

        // Should use default color for invalid input
        $this->assertDatabaseHas('tags', [
            'id' => $tag->id,
            'name' => 'Updated Tag',
            'color' => '#3B82F6', // Default blue color
        ]);
    }
}
