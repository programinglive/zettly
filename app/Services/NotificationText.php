<?php

namespace App\Services;

class NotificationText
{
    /** Remove credentials while keeping report paragraph and list boundaries. */
    public static function redact(string $text): string
    {
        for ($pass = 0; $pass < 3; $pass++) {
            $decoded = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            if ($decoded === $text) {
                break;
            }
            $text = $decoded;
        }
        $text = preg_replace('/(["\']?(?:[\w-]*(?:api[_-]?key|token|password|secret|webhook|dsn))["\']?\s*[:=]\s*)["\'][^"\'\r\n]*["\']/i', '$1[redacted]', $text) ?? '';
        $text = preg_replace(AgentSessionIngestor::SECRET_PATTERN, '[redacted]', $text) ?? '';

        return preg_replace('#(https?://)[^/\s:@]+:[^@\s/]+@#i', '$1[redacted]@', $text) ?? '';
    }

    /** Measure the UTF-16 units used by chat clients for content limits. */
    public static function units(string $text): int
    {
        return intdiv(strlen(mb_convert_encoding($text, 'UTF-16LE', 'UTF-8')), 2);
    }

    public static function truncate(string $text, int $limit): string
    {
        if ($limit <= 0) {
            return '';
        }
        if (self::units($text) <= $limit) {
            return $text;
        }
        $low = 0;
        $high = mb_strlen($text);
        while ($low < $high) {
            $middle = intdiv($low + $high + 1, 2);
            if (self::units(mb_substr($text, 0, $middle)) <= $limit - 1) {
                $low = $middle;
            } else {
                $high = $middle - 1;
            }
        }

        return mb_substr($text, 0, $low).'…';
    }

    /** Produce one short plain-text line from user-supplied markup. */
    public static function line(string $text, int $limit): string
    {
        $text = self::redact($text);
        $text = preg_replace('/<[^>]*>|[\x00-\x1f\x7f]|[\x{202A}-\x{202E}\x{2066}-\x{2069}]/u', ' ', $text) ?? '';
        $text = preg_replace('/\[([^\]]+)\]\([^)]*\)/u', '$1', $text) ?? '';
        $text = str_replace(['*', '_', '`', '~', '|', '#', '\\'], '', $text);
        $text = trim(preg_replace('/\s+/u', ' ', $text) ?? '');

        return self::truncate($text, $limit);
    }
}
