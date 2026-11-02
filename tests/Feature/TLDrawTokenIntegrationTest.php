<?php

use App\Support\TLDrawToken;
use Tests\TestCase;

class TLDrawTokenIntegrationTest extends TestCase
{
    /**
     * Guard against the controller/handler divergence. Mint a token exactly the
     * way TLDrawSyncController does, then verify it exactly the way
     * TLDrawSyncHandler does. Both sides use TLDrawToken, so this is a unit
     * test on the shared class - no database needed.
     */
    public function test_the_token_minted_by_the_controller_is_accepted_by_the_handler(): void
    {
        $now = time();
        $drawingId = '42';
        $userId = 7;

        // Controller mints:
        $token = TLDrawToken::sign([
            'roomId' => 'drawing-'.$drawingId,
            'clientId' => 'client-1',
            'userId' => $userId,
            'drawingId' => $drawingId,
            'exp' => $now + 3600,
        ]);

        // Handler verifies:
        $payload = TLDrawToken::verify($token);

        $this->assertNotNull($payload);
        $this->assertSame($userId, $payload['userId']);
        $this->assertSame($drawingId, $payload['drawingId']);
        $this->assertSame('drawing-'.$drawingId, $payload['roomId']);
    }

    public function test_a_tampered_token_minted_for_a_victim_fails_verification(): void
    {
        $victimId = 7;
        $attackerId = 99;
        $now = time();

        // Attacker signs a payload naming the victim:
        $attackerToken = TLDrawToken::sign([
            'userId' => $victimId,
            'drawingId' => '1',
            'exp' => $now + 3600,
        ]);

        // But the handler receives the attacker's forged blob:
        $forged = rtrim(strtr(base64_encode(json_encode([
            'userId' => $attackerId,
            'drawingId' => '1',
            'exp' => $now + 3600,
        ])), '+/', '-_'), '=');

        $this->assertNull(TLDrawToken::verify($forged.'.'.substr($attackerToken, strpos($attackerToken, '.'))));
    }
}
