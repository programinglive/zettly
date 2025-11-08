<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LogViewerAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_any_authenticated_user_can_access_log_viewer_outside_production(): void
    {
        $originalEnv = $this->app['env'];
        $this->app['env'] = 'local';
        config(['app.env' => 'local']);

        try {
            $user = User::factory()->create();

            $this->actingAs($user)
                ->get('/log-viewer')
                ->assertStatus(200);
        } finally {
            $this->app['env'] = $originalEnv;
            config(['app.env' => $originalEnv]);
        }
    }

    public function test_production_access_is_limited_to_owner_email(): void
    {
        $originalEnv = $this->app['env'];
        $this->app['env'] = 'production';
        config(['app.env' => 'production']);

        try {
            $owner = User::factory()->create([
                'email' => 'mahatma.mahardhika@programinglive.com',
            ]);

            $this->actingAs($owner)
                ->get('/log-viewer')
                ->assertStatus(200);

            $other = User::factory()->create([
                'email' => 'other@example.com',
            ]);

            $this->actingAs($other)
                ->get('/log-viewer')
                ->assertStatus(403);
        } finally {
            $this->app['env'] = $originalEnv;
            config(['app.env' => $originalEnv]);
        }
    }
}
