<?php

namespace Tests\Feature;

use App\Models\Focus;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The dashboard must show every focus that is running, not only the newest one.
 * A single card hid the others and made parallel work invisible.
 */
class FocusDashboardListTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_current_endpoint_lists_every_active_focus_with_open_counts(): void
    {
        $user = User::factory()->create();

        $blog = Focus::factory()->create(['user_id' => $user->id, 'title' => 'Blog migration', 'started_at' => now()->subHour()]);
        $sentry = Focus::factory()->create(['user_id' => $user->id, 'title' => 'Sentry bugfix', 'started_at' => now()]);

        Todo::factory()->count(2)->create([
            'user_id' => $user->id,
            'type' => Todo::TYPE_TODO,
            'focus_id' => $blog->id,
            'is_completed' => false,
        ]);
        Todo::factory()->create([
            'user_id' => $user->id,
            'type' => Todo::TYPE_TODO,
            'focus_id' => $blog->id,
            'is_completed' => true,
        ]);
        Todo::factory()->create([
            'user_id' => $user->id,
            'type' => Todo::TYPE_NOTE,
            'focus_id' => $blog->id,
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/focus/current');

        $response->assertOk();
        $response->assertJsonPath('active_focus_count', 2);
        $response->assertJsonCount(2, 'active_focuses');

        $titles = collect($response->json('active_focuses'))->pluck('title')->all();
        $this->assertContains('Blog migration', $titles);
        $this->assertContains('Sentry bugfix', $titles);

        $blogEntry = collect($response->json('active_focuses'))->firstWhere('title', 'Blog migration');
        $this->assertSame(2, $blogEntry['open_todos'], 'only open todos count, notes and completed todos do not');
        $this->assertSame($blog->id, $blogEntry['id']);
        $this->assertArrayHasKey('color', $blogEntry);
    }

    public function test_a_paused_focus_is_not_listed_as_active(): void
    {
        $user = User::factory()->create();
        Focus::factory()->create(['user_id' => $user->id, 'title' => 'Running', 'started_at' => now()]);
        Focus::factory()->paused()->create(['user_id' => $user->id, 'title' => 'Parked']);

        $response = $this->actingAs($user)->getJson('/api/v1/focus/current');

        $response->assertOk();
        $response->assertJsonPath('active_focus_count', 1);
        $response->assertJsonCount(1, 'active_focuses');
        $response->assertJsonPath('active_focuses.0.title', 'Running');
    }

    public function test_no_active_focus_returns_an_empty_list(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/v1/focus/current');

        $response->assertOk();
        $response->assertJsonPath('active_focus_count', 0);
        $response->assertJsonCount(0, 'active_focuses');
    }
}
