<?php

namespace Tests\Feature;

use App\Models\Focus;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TodayRetrospectiveAndReportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_today_dashboard_exposes_external_schedule_and_human_daily_retrospective(): void
    {
        $user = User::factory()->create();
        $focus = Focus::factory()->for($user)->create(['title' => 'DevWorkflow Release']);

        Todo::factory()->for($user)->asTask()->create([
            'focus_id' => $focus->id,
            'title' => 'Ship focus closure guidance',
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        $waiting = Todo::factory()->for($user)->asTask()->create([
            'focus_id' => $focus->id,
            'title' => '[npm Support #5040981] Permanently remove legacy npm package',
            'is_completed' => false,
            'priority' => Todo::PRIORITY_URGENT,
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'due_date' => now()->addDays(2)->toDateString(),
        ]);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('today.external_schedule.status', 'ok')
                ->has('today.external_schedule.items', 1)
                ->where('today.external_schedule.items.0.id', $waiting->id)
                ->where('today.external_schedule.items.0.is_external_waiting', true)
                ->where('today.daily_retrospective.period', 'daily')
                ->where('today.daily_retrospective.completed_count', 1)
                ->has('today.daily_retrospective.done_highlights', 1)
                ->has('today.daily_retrospective.went_well')
                ->has('today.daily_retrospective.blockers')
                ->has('today.daily_retrospective.improvements')
                ->etc()
            );
    }

    public function test_reports_index_exposes_human_daily_weekly_monthly_retrospectives_and_technical_page_works(): void
    {
        $user = User::factory()->create();
        Todo::factory()->for($user)->asTask()->create([
            'title' => 'Finish human retrospective overhaul',
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        $this->actingAs($user)
            ->get('/reports')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reports/Index')
                ->where('retrospectives.daily.period', 'daily')
                ->where('retrospectives.weekly.period', 'weekly')
                ->where('retrospectives.monthly.period', 'monthly')
                ->where('retrospectives.daily.completed_count', 1)
                ->etc()
            );

        $this->actingAs($user)
            ->get('/reports/technical')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reports/Technical')
                ->has('reports')
                ->has('channels')
                ->has('weeklyDigest')
                ->etc()
            );
    }

    public function test_artisan_retrospective_cli_outputs_human_readable_summary(): void
    {
        $user = User::factory()->create();
        Todo::factory()->for($user)->asTask()->create([
            'title' => 'Verify CLI retrospective output',
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        $this->artisan('zettly:retrospective', [
            'period' => 'daily',
            '--user' => $user->id,
            '--json' => true,
        ])
            ->expectsOutputToContain('Verify CLI retrospective output')
            ->assertSuccessful();
    }
}
