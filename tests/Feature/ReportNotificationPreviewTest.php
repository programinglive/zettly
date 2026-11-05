<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReportNotificationPreviewTest extends TestCase
{
    public function test_preview_uses_channel_payloads_without_sending_messages(): void
    {
        Http::fake();
        $this->artisan('journal:preview-report', ['--channel' => 'discord'])
            ->expectsOutputToContain('allowed_mentions')
            ->assertSuccessful();
        $this->artisan('journal:preview-report', ['--channel' => 'telegram'])
            ->expectsOutputToContain('link_preview_options')
            ->assertSuccessful();
        Http::assertNothingSent();
    }

    public function test_unknown_channel_is_rejected_without_delivery(): void
    {
        Http::fake();
        $this->artisan('journal:preview-report', ['--channel' => 'unknown'])->assertExitCode(2);
        Http::assertNothingSent();
    }
}
