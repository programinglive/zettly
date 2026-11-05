<?php

namespace Tests\Unit;

use App\Services\NotificationText;
use PHPUnit\Framework\TestCase;

class NotificationTextTest extends TestCase
{
    public function test_plain_text_is_bounded_and_redacted_without_markup(): void
    {
        $this->assertSame('Title line', NotificationText::line("# **Title**\nline", 120));
        $this->assertSame('Open docs', NotificationText::line('Open [docs](https://example.test)', 120));
        $this->assertStringNotContainsString('example-secret', NotificationText::line('Bearer example-secret', 120));
        $this->assertSame(120, mb_strlen(NotificationText::line(str_repeat('界', 150), 120)));
        $this->assertSame("First\nSecond", NotificationText::redact("First\nSecond"));
    }

    public function test_encoded_and_quoted_credentials_are_redacted_before_plain_text_display(): void
    {
        foreach ([
            'Bearer&#32;example-encoded-secret',
            '{"password":"example-json-secret"}',
            'https://person:example-url-secret@example.test/path',
        ] as $text) {
            $this->assertStringNotContainsString('example-', NotificationText::line($text, 200));
        }
        $this->assertSame('Plain title', NotificationText::line('&#35; &ast;&ast;Plain title&ast;&ast;', 120));
    }

    public function test_utf16_budget_does_not_split_emoji_or_exceed_channel_limits(): void
    {
        $text = NotificationText::line(str_repeat('😀', 150), 120);
        $this->assertLessThanOrEqual(120, strlen(mb_convert_encoding($text, 'UTF-16LE', 'UTF-8')) / 2);
        $this->assertTrue(mb_check_encoding($text, 'UTF-8'));
    }

    public function test_quoted_credentials_with_spaces_are_removed_in_full(): void
    {
        foreach (['password="synthetic first second"', "api_key='synthetic alpha beta'", '{"token":"synthetic gamma delta"}'] as $text) {
            $result = NotificationText::redact($text);
            foreach (['synthetic', 'first', 'second', 'alpha', 'beta', 'gamma', 'delta'] as $word) {
                $this->assertStringNotContainsString($word, $result);
            }
        }
    }
}
