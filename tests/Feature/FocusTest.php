<?php

namespace Tests\Feature;

use App\Models\Focus;
use App\Models\FocusStatusEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
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

        FocusStatusEvent::factory()
            ->forFocus($focus)
            ->byUser($user)
            ->state([
                'reason' => 'Wrapped up morning session',
                'created_at' => now()->subMinutes(5),
            ])
            ->create();

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

        $response->assertJsonPath('data.status_events.0.reason', 'Wrapped up morning session');
        $this->assertSame('Wrapped up morning session', $response->json('recent_events.0.reason'));
    }

    public function test_recent_focus_history_defaults_to_today(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now(),
            'completed_at' => null,
        ]);

        FocusStatusEvent::factory()
            ->forFocus($focus)
            ->byUser($user)
            ->create([
                'reason' => 'Today event',
                'created_at' => Carbon::today()->setHour(10),
                'updated_at' => Carbon::today()->setHour(10),
            ]);

        FocusStatusEvent::factory()
            ->forFocus($focus)
            ->byUser($user)
            ->create([
                'reason' => 'Yesterday event',
                'created_at' => Carbon::yesterday()->setHour(16),
                'updated_at' => Carbon::yesterday()->setHour(16),
            ]);

        $response = $this->actingAs($user)->get(route('focus.current'));

        $response->assertStatus(200);
        $this->assertSame(Carbon::today()->toDateString(), $response->json('filter_date'));
        $recentEvents = $response->json('recent_events');
        $this->assertCount(1, $recentEvents);
        $this->assertSame('Today event', $recentEvents[0]['reason']);
    }

    public function test_recent_focus_history_can_be_filtered_by_date(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $targetDate = Carbon::today()->subDays(3)->setHour(14);

        FocusStatusEvent::factory()
            ->forFocus($focus)
            ->byUser($user)
            ->create([
                'reason' => 'Three days ago',
                'created_at' => $targetDate,
                'updated_at' => $targetDate,
            ]);

        FocusStatusEvent::factory()
            ->forFocus($focus)
            ->byUser($user)
            ->create([
                'reason' => 'Today event',
                'created_at' => Carbon::today()->setHour(11),
                'updated_at' => Carbon::today()->setHour(11),
            ]);

        $response = $this->actingAs($user)->get(route('focus.current', [
            'date' => $targetDate->toDateString(),
        ]));

        $response->assertStatus(200);
        $this->assertSame($targetDate->toDateString(), $response->json('filter_date'));
        $recentEvents = $response->json('recent_events');
        $this->assertCount(1, $recentEvents);
        $this->assertSame('Three days ago', $recentEvents[0]['reason']);
    }

    public function test_user_can_get_all_foci(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $foci = Focus::factory()->count(3)->create(['user_id' => $user->id]);

        $foci->each(function (Focus $focus) use ($user) {
            FocusStatusEvent::factory()
                ->forFocus($focus)
                ->byUser($user)
                ->create([
                    'reason' => 'Progress update for focus '.$focus->id,
                ]);
        });

        $response = $this->actingAs($user)->get(route('focus.index'));

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $this->assertCount(3, $response->json('data'));

        $payload = collect($response->json('data'));

        $foci->each(function (Focus $focus) use ($payload) {
            $match = $payload->firstWhere('id', $focus->id);
            $this->assertNotNull($match, 'Expected focus '.$focus->id.' to be present in index response.');
            $this->assertSame('Progress update for focus '.$focus->id, $match['status_events'][0]['reason'] ?? null);
        });
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
        $this->assertSame([], $response->json('data.status_events'));

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

        $response = $this->actingAs($user)->post(route('focus.complete', $focus), [
            'reason' => 'Focus finished after sprint planning.',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'id' => $focus->id,
                'completed_at' => $response->json('data.completed_at'),
            ],
        ]);
        $response->assertJsonPath('event.reason', 'Focus finished after sprint planning.');

        $this->assertDatabaseHas('focus_status_events', [
            'focus_id' => $focus->id,
            'reason' => 'Focus finished after sprint planning.',
        ]);

        $this->assertNotNull($focus->fresh()->completed_at);
    }

    public function test_focus_completion_requires_reason(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $response = $this->actingAs($user)->postJson(route('focus.complete', $focus));

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
        ]);
        $this->assertSame('The reason field is required.', $response->json('errors.reason.0'));
        $this->assertDatabaseCount('focus_status_events', 0);
        $this->assertNull($focus->fresh()->completed_at);
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

        $response = $this->actingAs($user)->post(route('focus.complete', $focus), [
            'reason' => 'Trying to finish twice.',
        ]);

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

        $response = $this->actingAs($user2)->post(route('focus.complete', $focus), [
            'reason' => 'Unauthorized attempt',
        ]);

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

    public function test_user_can_update_focus(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user->id,
            'title' => 'Original Title',
            'description' => 'Original Description',
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $payload = [
            'title' => 'Updated Title',
            'description' => 'Updated Description',
        ];

        $response = $this->actingAs($user)->put(route('focus.update', $focus), $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'id' => $focus->id,
                'title' => 'Updated Title',
                'description' => 'Updated Description',
                'user_id' => $user->id,
            ],
        ]);

        $this->assertDatabaseHas('foci', [
            'id' => $focus->id,
            'title' => 'Updated Title',
            'description' => 'Updated Description',
        ]);
    }

    public function test_user_can_update_focus_title_only(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user->id,
            'title' => 'Original Title',
            'description' => 'Original Description',
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $payload = [
            'title' => 'New Title',
            'description' => null,
        ];

        $response = $this->actingAs($user)->put(route('focus.update', $focus), $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'title' => 'New Title',
                'description' => null,
            ],
        ]);

        $this->assertDatabaseHas('foci', [
            'id' => $focus->id,
            'title' => 'New Title',
            'description' => null,
        ]);
    }

    public function test_user_cannot_update_focus_without_title(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $payload = [
            'title' => '',
            'description' => 'Some description',
        ];

        $response = $this->actingAs($user)->put(route('focus.update', $focus), $payload);

        $response->assertStatus(422);
        $response->assertJson(['success' => false]);
    }

    public function test_user_cannot_update_completed_focus(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user->id,
            'title' => 'Completed Focus',
            'started_at' => now()->subHours(2),
            'completed_at' => now(),
        ]);

        $payload = [
            'title' => 'Trying to update',
            'description' => 'This should fail',
        ];

        $response = $this->actingAs($user)->put(route('focus.update', $focus), $payload);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'message' => 'Cannot update a completed focus',
        ]);

        // Verify the focus wasn't updated
        $this->assertDatabaseHas('foci', [
            'id' => $focus->id,
            'title' => 'Completed Focus',
        ]);
    }

    public function test_user_cannot_update_other_users_focus(): void
    {
        /** @var User $user1 */
        $user1 = User::factory()->create();
        /** @var User $user2 */
        $user2 = User::factory()->create();
        $focus = Focus::factory()->create([
            'user_id' => $user1->id,
            'title' => 'User 1 Focus',
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $payload = [
            'title' => 'Unauthorized update',
            'description' => 'This should fail',
        ];

        $response = $this->actingAs($user2)->put(route('focus.update', $focus), $payload);

        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'message' => 'Unauthorized',
        ]);

        // Verify the focus wasn't updated
        $this->assertDatabaseHas('foci', [
            'id' => $focus->id,
            'title' => 'User 1 Focus',
        ]);
    }
}
