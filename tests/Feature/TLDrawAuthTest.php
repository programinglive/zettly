<?php

namespace Tests\Feature;

use App\Models\Drawing;
use App\Models\User;
use App\Support\TLDrawToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TLDrawAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_issued_token_is_verifiable_and_carries_the_owner(): void
    {
        // Regression: the controller hashed json_encode($payload) and returned only
        // the digest, so the payload - including userId - was not in the token at
        // all. The WebSocket handler could not verify it and trusted the client.
        $user = User::factory()->create();
        $drawing = Drawing::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->postJson('/tldraw/sync/auth', [
            'roomId' => 'drawing-'.$drawing->id,
            'client' => 'client-1',
        ])->assertOk();

        $payload = TLDrawToken::verify($response->json('token'));

        $this->assertNotNull($payload, 'the issued token must verify');
        $this->assertSame($user->id, $payload['userId']);
        $this->assertSame((string) $drawing->id, (string) $payload['drawingId']);
        $this->assertSame('drawing-'.$drawing->id, $payload['roomId']);
        $this->assertGreaterThan(time(), $payload['exp']);
    }

    public function test_a_user_cannot_get_a_token_for_someone_elses_drawing(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $drawing = Drawing::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($attacker)
            ->postJson('/tldraw/sync/auth', [
                'roomId' => 'drawing-'.$drawing->id,
                'client' => 'client-1',
            ])
            ->assertForbidden();
    }

    public function test_a_malformed_room_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/tldraw/sync/auth', ['roomId' => 'not-a-room', 'client' => 'c'])
            ->assertStatus(400);
    }
}
