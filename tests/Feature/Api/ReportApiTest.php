<?php

namespace Tests\Feature\Api;

use App\Models\Report;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_generates_a_daily_report_on_demand(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        $response = $this->postJson('/api/v1/reports/generate', [
            'period_kind' => 'daily',
            'date' => '2026-11-01',
        ]);

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertSame('daily:2026-11-01:2026-11-01', Report::firstOrFail()->report_key);
    }

    public function test_it_enqueues_delivery_jobs(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        $this->postJson('/api/v1/reports/deliver', ['report_key' => $report->report_key])
            ->assertOk()->assertJsonPath('enqueued', 1);

        Queue::assertPushed(\App\Jobs\DeliverReport::class);
    }

    public function test_channel_listing_never_leaks_the_webhook_url(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        UserReportChannel::factory()->create([
            'user_id' => $user->id,
            'channel' => 'discord',
            'webhook_url' => 'https://discord.com/api/webhooks/999/topsecret',
        ]);

        $response = $this->getJson('/api/v1/report-channels');

        $response->assertOk();
        $this->assertStringNotContainsString('topsecret', $response->getContent());
        $this->assertTrue($response->json('data.0.webhook_url_set'));
    }

    public function test_it_upserts_a_channel(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        $this->postJson('/api/v1/report-channels', [
            'channel' => 'telegram',
            'webhook_url' => 'https://api.telegram.org/bot123/sendMessage',
            'chat_id' => '-100123',
        ])->assertCreated();

        $this->postJson('/api/v1/report-channels', [
            'channel' => 'telegram',
            'webhook_url' => 'https://api.telegram.org/bot456/sendMessage',
            'chat_id' => '-100456',
        ])->assertCreated();

        $this->assertSame(1, UserReportChannel::count());
        $this->assertSame('-100456', UserReportChannel::first()->chat_id);
    }

    public function test_it_rejects_a_non_https_webhook(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['zettly:cli']);

        $this->postJson('/api/v1/report-channels', [
            'channel' => 'discord',
            'webhook_url' => 'http://insecure.example.com/hook',
        ])->assertStatus(422);
    }
}
