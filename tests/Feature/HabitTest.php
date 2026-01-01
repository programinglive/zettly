<?php

namespace Tests\Feature;

use App\Models\Habit;
use App\Models\HabitEntry;
use App\Models\HabitStreak;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HabitTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return User
     */
    private function signIn(?User $user = null): User
    {
        /** @var User $user */
        $user ??= User::factory()->createOne();
        $this->actingAs($user);

        return $user;
    }

    public function test_user_can_view_their_habits_index(): void
    {
        $user = $this->signIn();
        $habit = Habit::factory()->create(['user_id' => $user->id]);

        $this->get('/habits')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Habits/Index')
                ->has('habits', 1)
                ->where('habits.0.id', $habit->id));
    }

    public function test_user_cannot_view_other_users_habits(): void
    {
        $user = $this->signIn();
        Habit::factory()->create();

        $this->get('/habits')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Habits/Index')
                ->has('habits', 0));
    }

    public function test_user_can_create_habit(): void
    {
        $user = $this->signIn();

        $payload = [
            'title' => 'Exercise',
            'description' => 'Daily workout',
            'color' => '#6B7280',
            'icon' => 'circle',
            'target_frequency' => 1,
            'frequency_period' => 'daily',
        ];

        $this->post('/habits', $payload)
            ->assertStatus(201);

        $habit = Habit::latest('id')->first();
        $this->assertNotNull($habit);
        $this->assertEquals($user->id, $habit->user_id);

        $this->assertDatabaseHas('habit_streaks', [
            'habit_id' => $habit->id,
            'current_streak' => 0,
            'longest_streak' => 0,
        ]);
    }

    public function test_habit_creation_validates_required_fields(): void
    {
        $this->signIn();

        $this->post('/habits', [])
            ->assertSessionHasErrors(['title', 'color', 'icon', 'target_frequency', 'frequency_period']);
    }

    public function test_user_can_view_habit_details(): void
    {
        $user = $this->signIn();
        $habit = Habit::factory()->create(['user_id' => $user->id]);
        HabitEntry::factory()->create([
            'habit_id' => $habit->id,
            'date' => Carbon::today(),
            'count' => 1,
        ]);

        $this->get("/habits/{$habit->id}")
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Habits/Show')
                ->where('habit.id', $habit->id)
                ->has('entries', 1));
    }

    public function test_user_cannot_view_other_users_habit_details(): void
    {
        $user = $this->signIn();
        $otherHabit = Habit::factory()->create();

        $this->get("/habits/{$otherHabit->id}")
            ->assertStatus(403);
    }

    public function test_user_can_update_habit(): void
    {
        $user = $this->signIn();
        $habit = Habit::factory()->create(['user_id' => $user->id]);

        $payload = [
            'title' => 'Updated Exercise',
            'description' => 'New description',
            'color' => '#111827',
            'icon' => 'star',
            'target_frequency' => 2,
            'frequency_period' => 'weekly',
            'is_active' => true,
        ];

        $this->put("/habits/{$habit->id}", $payload)
            ->assertStatus(200);

        $this->assertDatabaseHas('habits', [
            'id' => $habit->id,
            'title' => 'Updated Exercise',
            'color' => '#111827',
            'target_frequency' => 2,
            'frequency_period' => 'weekly',
        ]);
    }

    public function test_user_cannot_update_other_users_habit(): void
    {
        $user = $this->signIn();
        $otherHabit = Habit::factory()->create();

        $this->put("/habits/{$otherHabit->id}", ['title' => 'Nope'])
            ->assertStatus(403);
    }

    public function test_user_can_delete_habit(): void
    {
        $user = $this->signIn();
        $habit = Habit::factory()->create(['user_id' => $user->id]);

        $this->delete("/habits/{$habit->id}")
            ->assertStatus(204);

        $this->assertSoftDeleted('habits', ['id' => $habit->id]);
    }

    public function test_user_cannot_delete_other_users_habit(): void
    {
        $this->signIn();
        $otherHabit = Habit::factory()->create();

        $this->delete("/habits/{$otherHabit->id}")
            ->assertStatus(403);
    }

    public function test_user_can_toggle_habit_completion(): void
    {
        $user = $this->signIn();
        $habit = Habit::factory()->create([
            'user_id' => $user->id,
            'target_frequency' => 1,
        ]);

        $this->post("/habits/{$habit->id}/toggle", ['count' => 1])
            ->assertStatus(200);

        $entry = HabitEntry::where('habit_id', $habit->id)->first();
        $this->assertNotNull($entry);
        $this->assertTrue(Carbon::parse($entry->date)->isSameDay(Carbon::today()));
        $this->assertEquals(1, $entry->count);
    }

    public function test_habit_toggle_updates_streak(): void
    {
        $user = $this->signIn();
        $habit = Habit::factory()->create([
            'user_id' => $user->id,
            'target_frequency' => 1,
        ]);

        $this->post("/habits/{$habit->id}/toggle", ['count' => 1]);

        $streak = HabitStreak::where('habit_id', $habit->id)->first();
        $this->assertNotNull($streak);
        $this->assertEquals(1, $streak->current_streak);
        $this->assertTrue(Carbon::parse($streak->last_completion_date)->isSameDay(Carbon::today()));
    }

    public function test_habit_completion_percentage_calculation(): void
    {
        $user = $this->signIn();
        $habit = Habit::factory()->create([
            'user_id' => $user->id,
            'target_frequency' => 1,
        ]);

        foreach (range(0, 14) as $i) {
            HabitEntry::factory()->create([
                'habit_id' => $habit->id,
                'date' => Carbon::today()->subDays($i),
                'count' => 1,
            ]);
        }

        $percentage = $habit->fresh()->getCompletionPercentage(
            Carbon::today()->subDays(29),
            Carbon::today()
        );

        $this->assertEquals(50.0, $percentage);
    }

    public function test_organization_members_can_view_shared_habits(): void
    {
        $member = $this->signIn();
        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner, [$member]);

        $habit = Habit::factory()->create([
            'user_id' => $owner->id,
            'organization_id' => $organization->id,
        ]);

        $this->get('/habits?organization_id=' . $organization->id)
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Habits/Index')
                ->has('habits', 1)
                ->where('habits.0.id', $habit->id));
    }

    public function test_non_members_cannot_view_shared_habits(): void
    {
        $user = $this->signIn();
        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner);

        Habit::factory()->create([
            'user_id' => $owner->id,
            'organization_id' => $organization->id,
        ]);

        $this->get('/habits?organization_id=' . $organization->id)
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Habits/Index')
                ->has('habits', 0));
    }

    private function createOrganization(User $owner, array $members = []): Organization
    {
        $organization = Organization::factory()->create([
            'created_by' => $owner->id,
        ]);

        OrganizationMember::factory()->create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'admin',
        ]);

        foreach ($members as $member) {
            OrganizationMember::factory()->create([
                'organization_id' => $organization->id,
                'user_id' => $member->id,
                'role' => 'member',
            ]);
        }

        return $organization;
    }
}
