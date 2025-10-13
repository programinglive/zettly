<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_stats_exclude_archived_and_include_archived_count(): void
    {
        $user = User::factory()->create();

        // Non-archived todos
        Todo::factory()->for($user)->create([
            'priority' => 'urgent',
            'is_completed' => false,
        ]);

        Todo::factory()->for($user)->create([
            'priority' => 'high',
            'is_completed' => false,
        ]);

        Todo::factory()->for($user)->create([
            'priority' => 'medium',
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        // Archived todos (should not affect other stats)
        Todo::factory()->for($user)->create([
            'priority' => 'urgent',
            'is_completed' => false,
            'archived' => true,
            'archived_at' => now(),
        ]);

        Todo::factory()->for($user)->create([
            'priority' => 'low',
            'is_completed' => true,
            'completed_at' => now(),
            'archived' => true,
            'archived_at' => now(),
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('stats.total', 3)
            ->where('stats.completed', 1)
            ->where('stats.pending', 2)
            ->where('stats.urgent', 1)
            ->where('stats.high', 1)
            ->where('stats.archived', 2)
        );
    }
}
