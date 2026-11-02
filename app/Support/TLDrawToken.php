<?php

namespace App\Support;

use Illuminate\Support\Facades\Config;

/**
 * Signed tokens for the TLDraw WebSocket handshake.
 *
 * The previous pair did not work together. TLDrawSyncController emitted
 * `hash_hmac('sha256', json_encode($payload), app.key)` - a bare digest with the
 * payload discarded - while TLDrawSyncHandler did `json_decode(base64_decode($token))`
 * and trusted the `userId` inside. The handler could never verify the digest because
 * the payload was not in the token, so it fell back to trusting whatever the client
 * sent, and the controller's own signature check did not exist at all.
 *
 * Format: base64url(json) . "." . hex(hmac_sha256(base64url(json), app.key))
 */
class TLDrawToken
{
    public static function sign(array $payload): string
    {
        $encoded = self::base64UrlEncode(json_encode($payload));

        return $encoded.'.'.self::signature($encoded);
    }

    /**
     * Verified payload, or null when the token is malformed, tampered with, or
     * expired. Callers must treat null as "not authenticated".
     */
    public static function verify(?string $token, ?int $now = null): ?array
    {
        if (! is_string($token) || $token === '') {
            return null;
        }

        $parts = explode('.', $token);

        if (count($parts) !== 2) {
            return null;
        }

        [$encoded, $signature] = $parts;

        if (! hash_equals(self::signature($encoded), $signature)) {
            return null;
        }

        $json = self::base64UrlDecode($encoded);
        $payload = $json === null ? null : json_decode($json, true);

        if (! is_array($payload)) {
            return null;
        }

        $now = $now ?? time();

        if (isset($payload['exp']) && (int) $payload['exp'] < $now) {
            return null;
        }

        if (! isset($payload['userId'])) {
            return null;
        }

        return $payload;
    }

    private static function signature(string $encoded): string
    {
        return hash_hmac('sha256', $encoded, (string) Config::get('app.key'));
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): ?string
    {
        $padded = strtr($value, '-_', '+/');
        $padded .= str_repeat('=', (4 - strlen($padded) % 4) % 4);
        $decoded = base64_decode($padded, true);

        return $decoded === false ? null : $decoded;
    }
}
