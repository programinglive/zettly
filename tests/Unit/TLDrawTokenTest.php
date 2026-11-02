<?php

namespace Tests\Unit;

use App\Support\TLDrawToken;
use Tests\TestCase;

class TLDrawTokenTest extends TestCase
{
    public function test_a_signed_token_round_trips(): void
    {
        $token = TLDrawToken::sign([
            'roomId' => 'drawing-7',
            'userId' => 3,
            'drawingId' => '7',
            'exp' => time() + 300,
        ]);

        $payload = TLDrawToken::verify($token);

        $this->assertSame(3, $payload['userId']);
        $this->assertSame('7', $payload['drawingId']);
    }

    public function test_a_forged_payload_is_rejected(): void
    {
        // The old handler base64-decoded the token and trusted userId. Re-signing
        // the payload as somebody else must not authenticate.
        $forged = rtrim(strtr(base64_encode(json_encode([
            'userId' => 1,
            'drawingId' => '99',
            'exp' => time() + 300,
        ])), '+/', '-_'), '=');

        $this->assertNull(TLDrawToken::verify($forged.'.'.str_repeat('a', 64)));
        $this->assertNull(TLDrawToken::verify($forged));
        $this->assertNull(TLDrawToken::verify(null));
        $this->assertNull(TLDrawToken::verify(''));
    }

    public function test_an_expired_token_is_rejected(): void
    {
        $token = TLDrawToken::sign(['userId' => 3, 'exp' => time() - 1]);

        $this->assertNull(TLDrawToken::verify($token));
    }

    public function test_a_token_without_a_user_is_rejected(): void
    {
        $token = TLDrawToken::sign(['exp' => time() + 300]);

        $this->assertNull(TLDrawToken::verify($token));
    }

    public function test_swapping_the_signature_between_tokens_does_not_work(): void
    {
        $mine = TLDrawToken::sign(['userId' => 3, 'exp' => time() + 300]);
        $theirs = TLDrawToken::sign(['userId' => 1, 'exp' => time() + 300]);

        [$myBody] = explode('.', $mine);
        [, $theirSig] = explode('.', $theirs);

        $this->assertNull(TLDrawToken::verify($myBody.'.'.$theirSig));
    }
}
