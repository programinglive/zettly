<?php

namespace Tests\Feature;

use App\Models\PushSubscription;
use App\Models\User;
use App\Services\WebPushService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Minishlink\WebPush\WebPush;
use Tests\TestCase;

class WebPushFormattingTest extends TestCase
{
    use RefreshDatabase;

    public function test_push_service_bounds_plain_text_for_all_callers(): void
    {
        $user = User::factory()->create();
        PushSubscription::create([
            'user_id' => $user->id, 'endpoint' => 'https://example.test/push',
            'p256dh_token' => 'example-public-key', 'auth_token' => 'example-auth',
        ]);
        $client = \Mockery::mock(WebPush::class);
        $client->shouldReceive('queueNotification')->once()->withArgs(function ($subscription, $payload) {
            $payload = json_decode($payload, true);
            $this->assertLessThanOrEqual(120, mb_strlen($payload['title']));
            $this->assertLessThanOrEqual(255, mb_strlen($payload['body']));
            $this->assertStringNotContainsString('**', $payload['title']);
            $this->assertStringNotContainsString('example-secret', $payload['body']);

            return true;
        });
        $client->shouldReceive('flush')->once()->andReturn((function () {
            yield from [];
        })());
        $service = new class($client) extends WebPushService
        {
            public function __construct(private WebPush $client) {}

            protected function buildClient(): WebPush
            {
                return $this->client;
            }
        };
        $service->sendToUser($user, [
            'title' => '**'.str_repeat('界', 160).'**',
            'body' => "Bearer example-secret\n".str_repeat('body ', 100),
        ]);
    }
}
