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

    public function test_generate_dispatches_a_delivery_job_when_a_channel_exists(): void
    {
        // Regression: generate() used to create the delivery row and report
        // "enqueued: 1" without ever dispatching the job, so nothing was sent
        // until someone separately called /reports/deliver.
        Queue::fake();
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        $this->postJson('/api/v1/reports/generate', [
            'period_kind' => 'daily',
            'date' => '2026-11-01',
        ])->assertOk()->assertJsonPath('enqueued', 1);

        $this->assertSame(1, \App\Models\ReportDelivery::count());
        Queue::assertPushed(\App\Jobs\DeliverReport::class);
    }

    public function test_it_enqueues_delivery_jobs(): void
    {        Queue::fake();
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        $this->postJson('/api/v1/reports/deliver', ['report_key' => $report->report_key])
            ->assertOk()->assertJsonPath('enqueued', 1);

        Queue::assertPushed(\App\Jobs\DeliverReport::class);
    }

    public function test_targeted_deliver_only_enqueues_that_report(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        // Both keys must be explicit: the factory's default key is derived from
        // today's date, which collides with a hard-coded key on that date.
        $target = Report::factory()->create([
            'user_id' => $user->id,
            'report_key' => 'daily:2026-10-01:2026-10-01',
        ]);
        $other = Report::factory()->create(['user_id' => $user->id, 'report_key' => 'daily:2026-10-02:2026-10-02']);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        $this->postJson('/api/v1/reports/deliver', ['report_key' => $target->report_key])
            ->assertOk()->assertJsonPath('enqueued', 1);

        $this->assertSame(1, \App\Models\ReportDelivery::count());
        $this->assertSame($target->id, \App\Models\ReportDelivery::first()->report_id);
        $this->assertNull(\App\Models\ReportDelivery::where('report_id', $other->id)->first());
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
    public function test_generating_a_weekly_report_uses_the_whole_week(): void
    {
        // Regression: the endpoint used the given date as both start and end, so
        // a weekly request produced a one-day report.
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        $response = $this->postJson('/api/v1/reports/generate', [
            'period_kind' => 'weekly',
            'date' => '2026-11-04',
        ]);

        $response->assertOk();
        // 2026-11-04 is a Wednesday -> Mon 2026-11-02 .. Sun 2026-11-08
        $response->assertJsonPath('data.report_key', 'weekly:2026-11-02:2026-11-08');
    }

    public function test_generating_a_monthly_report_uses_the_whole_month(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        $response = $this->postJson('/api/v1/reports/generate', [
            'period_kind' => 'monthly',
            'date' => '2026-11-04',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.report_key', 'monthly:2026-11-01:2026-11-30');
    }
}
