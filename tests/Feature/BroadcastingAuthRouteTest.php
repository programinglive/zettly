<?php

namespace Tests\Feature;

use App\Models\Drawing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BroadcastingAuthRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_request_to_broadcasting_auth_is_rejected_not_404(): void
    {
        $response = $this->postJson('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-drawings.1',
        ]);

        $this->assertNotEquals(404, $response->getStatusCode());
        $response->assertUnauthorized();
    }

    public function test_authenticated_owner_can_authorize_private_drawing_channel(): void
    {
        config()->set('broadcasting.default', 'pusher');
        config()->set('broadcasting.connections.pusher', [
            'driver' => 'pusher',
            'key' => 'test-key',
            'secret' => 'test-secret',
            'app_id' => 'test-app',
            'options' => [
                'cluster' => 'ap1',
                'useTLS' => true,
            ],
        ]);
        \Illuminate\Support\Facades\Broadcast::forgetDrivers();
        require base_path('routes/channels.php');

        $owner = User::factory()->create();
        $drawing = Drawing::factory()->for($owner)->create();

        $response = $this->actingAs($owner)->post('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-drawings.'.$drawing->id,
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['auth']);
    }

    public function test_authenticated_non_owner_is_forbidden_from_private_drawing_channel(): void
    {
        config()->set('broadcasting.default', 'pusher');
        config()->set('broadcasting.connections.pusher', [
            'driver' => 'pusher',
            'key' => 'test-key',
            'secret' => 'test-secret',
            'app_id' => 'test-app',
            'options' => [
                'cluster' => 'ap1',
                'useTLS' => true,
            ],
        ]);
        \Illuminate\Support\Facades\Broadcast::forgetDrivers();
        require base_path('routes/channels.php');

        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $drawing = Drawing::factory()->for($owner)->create();

        $response = $this->actingAs($otherUser)->post('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-drawings.'.$drawing->id,
        ]);

        $response->assertForbidden();
    }
}
