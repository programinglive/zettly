<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkspacePreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_workspace_preference_is_saved_to_database_via_inertia_request(): void
    {
        $user = User::factory()->create([
            'workspace_view' => 'matrix',
        ]);

        $this->app['session']->start();
        $token = csrf_token();

        $response = $this
            ->actingAs($user)
            ->post(
                '/profile/workspace-preference',
                [
                    'workspace_view' => 'kanban',
                ],
                [
                    'X-CSRF-TOKEN' => $token,
                    'X-Requested-With' => 'XMLHttpRequest',
                ],
            );

        $response->assertRedirect(route('dashboard'));

        $this->assertSame('kanban', $user->fresh()->workspace_view);
    }

    public function test_dashboard_receives_workspace_preference_prop(): void
    {
        $user = User::factory()->create([
            'workspace_view' => 'kanban',
        ]);

        $response = $this
            ->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->get('/dashboard');

        $response->assertInertia(fn ($page) => $page->component('Dashboard')
            ->where('preferences.workspace_view', 'kanban')
        );
    }
}
