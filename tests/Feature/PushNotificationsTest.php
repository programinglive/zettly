<?php

namespace Tests\Feature;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PushNotificationsTest extends TestCase
{
    use RefreshDatabase;

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_allows_an_authenticated_user_to_store_a_push_subscription(): void
    {
        $user = User::factory()->create();

        $payload = [
            'endpoint' => 'https://example.com/push/subscription',
            'keys' => [
                'auth' => 'auth-token',
                'p256dh' => 'p256dh-token',
            ],
        ];

        $this->actingAs($user)
            ->post('/push-subscriptions', $payload)
            ->assertCreated();

        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $user->id,
            'endpoint' => $payload['endpoint'],
            'auth_token' => $payload['keys']['auth'],
            'p256dh_token' => $payload['keys']['p256dh'],
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_overwrites_existing_subscription_for_same_endpoint(): void
    {
        $user = User::factory()->create();

        PushSubscription::create([
            'user_id' => $user->id,
            'endpoint' => 'https://example.com/push/subscription',
            'auth_token' => 'old-auth',
            'p256dh_token' => 'old-p256dh',
        ]);

        $payload = [
            'endpoint' => 'https://example.com/push/subscription',
            'keys' => [
                'auth' => 'new-auth-token',
                'p256dh' => 'new-p256dh-token',
            ],
        ];

        $this->actingAs($user)
            ->post('/push-subscriptions', $payload)
            ->assertCreated();

        $this->assertDatabaseCount('push_subscriptions', 1);

        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $user->id,
            'endpoint' => $payload['endpoint'],
            'auth_token' => $payload['keys']['auth'],
            'p256dh_token' => $payload['keys']['p256dh'],
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_allows_an_authenticated_user_to_remove_a_push_subscription(): void
    {
        $user = User::factory()->create();

        PushSubscription::create([
            'user_id' => $user->id,
            'endpoint' => 'https://example.com/push/subscription',
            'auth_token' => 'auth-token',
            'p256dh_token' => 'p256dh-token',
        ]);

        $this->actingAs($user)
            ->delete('/push-subscriptions', [
                'endpoint' => 'https://example.com/push/subscription',
            ])
            ->assertOk();

        $this->assertDatabaseMissing('push_subscriptions', [
            'user_id' => $user->id,
            'endpoint' => 'https://example.com/push/subscription',
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function guests_cannot_manage_push_subscriptions(): void
    {
        $payload = [
            'endpoint' => 'https://example.com/push/subscription',
            'keys' => [
                'auth' => 'auth-token',
                'p256dh' => 'p256dh-token',
            ],
        ];

        $this->post('/push-subscriptions', $payload)->assertRedirect('/login');
        $this->delete('/push-subscriptions', ['endpoint' => $payload['endpoint']])->assertRedirect('/login');

        $this->assertDatabaseCount('push_subscriptions', 0);
    }
}
