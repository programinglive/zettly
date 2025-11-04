<?php

namespace Tests\Feature;

use App\Models\Focus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FocusTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_get_current_focus(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $response = $this->actingAs($user)->get(route('focus.current'));

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'id' => $focus->id,
                'title' => $focus->title,
                'user_id' => $user->id,
            ],
        ]);
    }

    public function test_user_can_get_all_foci(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        Focus::factory()->count(3)->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('focus.index'));

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_user_can_create_focus(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $payload = [
            'title' => 'Complete project proposal',
            'description' => 'Finish the Q4 project proposal',
        ];

        $response = $this->actingAs($user)->post(route('focus.store'), $payload);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'data' => [
                'title' => 'Complete project proposal',
                'description' => 'Finish the Q4 project proposal',
                'user_id' => $user->id,
            ],
        ]);

        $this->assertDatabaseHas('foci', [
            'title' => 'Complete project proposal',
            'user_id' => $user->id,
        ]);
    }

    public function test_user_cannot_create_focus_without_title(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $payload = [
            'title' => '',
            'description' => 'Some description',
        ];

        $response = $this->actingAs($user)->post(route('focus.store'), $payload);

        $response->assertStatus(422);
        $response->assertJson(['success' => false]);
    }

    public function test_user_can_complete_focus(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $response = $this->actingAs($user)->post(route('focus.complete', $focus));

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'id' => $focus->id,
                'completed_at' => $response->json('data.completed_at'),
            ],
        ]);

        $this->assertNotNull($focus->fresh()->completed_at);
    }

    public function test_user_cannot_complete_already_completed_focus(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        $response = $this->actingAs($user)->post(route('focus.complete', $focus));

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'message' => 'Focus is already completed',
        ]);
    }

    public function test_user_cannot_complete_other_users_focus(): void
    {
        /** @var User $user1 */
        $user1 = User::factory()->create();
        /** @var User $user2 */
        $user2 = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user1->id,
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $response = $this->actingAs($user2)->post(route('focus.complete', $focus));

        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'message' => 'Unauthorized',
        ]);
    }

    public function test_user_can_delete_focus(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->delete(route('focus.destroy', $focus));

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Focus deleted successfully',
        ]);

        $this->assertDatabaseMissing('foci', ['id' => $focus->id]);
    }

    public function test_user_cannot_delete_other_users_focus(): void
    {
        /** @var User $user1 */
        $user1 = User::factory()->create();
        /** @var User $user2 */
        $user2 = User::factory()->create();
        $focus = Focus::factory()->create(['user_id' => $user1->id]);

        $response = $this->actingAs($user2)->delete(route('focus.destroy', $focus));

        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'message' => 'Unauthorized',
        ]);

        $this->assertDatabaseHas('foci', ['id' => $focus->id]);
    }

    public function test_unauthenticated_user_cannot_access_focus_endpoints(): void
    {
        $response = $this->get(route('focus.current'));
        $response->assertRedirect(route('login'));

        $response = $this->get(route('focus.index'));
        $response->assertRedirect(route('login'));

        $response = $this->post(route('focus.store'), ['title' => 'Test']);
        $response->assertRedirect(route('login'));
    }

    public function test_focus_model_has_correct_relationships(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create(['user_id' => $user->id]);

        $this->assertInstanceOf(User::class, $focus->user);
        $this->assertEquals($user->id, $focus->user->id);
    }

    public function test_focus_is_active_method(): void
    {
        $activeFocus = Focus::factory()->create([
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $completedFocus = Focus::factory()->create([
            'started_at' => now()->subHours(2),
            'completed_at' => now(),
        ]);

        $this->assertTrue($activeFocus->isActive());
        $this->assertFalse($completedFocus->isActive());
    }

    public function test_focus_is_completed_method(): void
    {
        $activeFocus = Focus::factory()->create([
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $completedFocus = Focus::factory()->create([
            'started_at' => now()->subHours(2),
            'completed_at' => now(),
        ]);

        $this->assertFalse($activeFocus->isCompleted());
        $this->assertTrue($completedFocus->isCompleted());
    }

    public function test_user_current_focus_relationship(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Create multiple foci
        $oldFocus = Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now()->subHours(5),
            'completed_at' => now()->subHours(4),
        ]);

        $currentFocus = Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now()->subHours(2),
            'completed_at' => null,
        ]);

        $this->assertEquals($currentFocus->id, $user->currentFocus->id);
    }
}
