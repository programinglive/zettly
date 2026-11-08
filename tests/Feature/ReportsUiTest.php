<?php

namespace Tests\Feature;

use App\Jobs\DeliverReport;
use App\Models\Report;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ReportsUiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The Inertia view needs a Vite manifest; these tests assert on the
        // Inertia payload, not the built bundle.
        $this->withoutVite();
    }

    public function test_unauthenticated_users_are_redirected_to_login(): void
    {
        $this->get('/reports')->assertRedirect('/login');
        $this->post('/reports/generate')->assertRedirect('/login');
    }

    public function test_it_lists_only_the_calling_users_reports_newest_period_first(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $older = Report::factory()->create([
            'user_id' => $user->id,
            'period_kind' => 'daily',
            'period_start' => '2026-11-01',
            'period_end' => '2026-11-01',
            'report_key' => 'daily:2026-11-01:2026-11-01',
        ]);
        $newer = Report::factory()->create([
            'user_id' => $user->id,
            'period_kind' => 'weekly',
            'period_start' => '2026-11-02',
            'period_end' => '2026-11-08',
            'report_key' => 'weekly:2026-11-02:2026-11-08',
        ]);
        Report::factory()->create([
            'user_id' => $other->id,
            'report_key' => 'daily:2026-11-05:2026-11-05',
        ]);

        $this->actingAs($user)->get('/reports')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Index')
                ->has('reports', 2)
                ->where('reports', fn ($reports) => $reports[0]['id'] === $newer->id && $reports[1]['id'] === $older->id)
            );
    }

    public function test_it_filters_reports_by_period_kind(): void
    {
        $user = User::factory()->create();
        Report::factory()->create([
            'user_id' => $user->id,
            'period_kind' => 'daily',
            'report_key' => 'daily:2026-11-01:2026-11-01',
        ]);
        Report::factory()->create([
            'user_id' => $user->id,
            'period_kind' => 'monthly',
            'period_start' => '2026-11-01',
            'period_end' => '2026-11-30',
            'report_key' => 'monthly:2026-11-01:2026-11-30',
        ]);

        $this->actingAs($user)->get('/reports?period_kind=monthly')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Index')
                ->has('reports', 1)
                ->where('reports.0.period_kind', 'monthly')
            );
    }

    public function test_an_unknown_period_kind_falls_back_to_no_filter(): void
    {
        $user = User::factory()->create();
        Report::factory()->create([
            'user_id' => $user->id,
            'report_key' => 'daily:2026-11-01:2026-11-01',
        ]);

        $this->actingAs($user)->get('/reports?period_kind=hourly')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Index')
                ->has('reports', 1)
            );
    }

    public function test_it_shows_delivery_channels_without_exposing_webhook_urls(): void
    {
        $user = User::factory()->create();
        UserReportChannel::factory()->create([
            'user_id' => $user->id,
            'channel' => 'discord',
            'enabled' => true,
        ]);

        $this->actingAs($user)->get('/reports')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Index')
                ->where('channels', fn ($channels) => $channels[0]['channel'] === 'discord'
                    && $channels[0]['enabled'] === true
                    && ! array_key_exists('webhook_url', $channels[0])
                )
            );
    }

    public function test_a_user_can_open_one_of_their_reports(): void
    {
        $user = User::factory()->create();
        $report = Report::factory()->create([
            'user_id' => $user->id,
            'content' => "# Weekly Productivity Report: 2026-11-02 - 2026-11-08\n\n- Machines: MMCH",
        ]);

        $this->actingAs($user)->get('/reports/'.$report->id)->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Show')
                ->where('report.id', $report->id)
                ->has('report.content')
            );
    }

    public function test_a_user_cannot_open_another_users_report(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $other->id]);

        $this->actingAs($user)->get('/reports/'.$report->id)->assertNotFound();
    }

    public function test_generate_now_creates_todays_daily_report_and_redirects_to_it(): void
    {
        Queue::fake();
        $user = User::factory()->create();

        $this->actingAs($user)->post('/reports/generate')
            ->assertRedirect(route('reports.show', $report = Report::firstOrFail()));

        $this->assertSame('daily', $report->period_kind);
        $this->assertStringStartsWith('# Daily Activity Summary', $report->content);
    }

    public function test_generate_now_queues_delivery_when_a_channel_is_enabled(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        UserReportChannel::factory()->create([
            'user_id' => $user->id,
            'channel' => 'discord',
            'enabled' => true,
        ]);

        $this->actingAs($user)->post('/reports/generate')->assertRedirect();

        $this->assertSame(1, \App\Models\ReportDelivery::count());
        Queue::assertPushed(DeliverReport::class);
    }

    public function test_generate_now_without_a_channel_creates_no_delivery_rows(): void
    {
        Queue::fake();
        $user = User::factory()->create();

        $this->actingAs($user)->post('/reports/generate')->assertRedirect();

        $this->assertSame(0, \App\Models\ReportDelivery::count());
        Queue::assertNothingPushed();
    }
}
