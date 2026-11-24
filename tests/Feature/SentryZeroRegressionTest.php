<?php

namespace Tests\Feature;

use App\Domain\Priority\DayPlanner;
use App\Domain\Priority\PrioritySettingsService;
use App\Models\DailyPlan;
use App\Models\Todo;
use App\Models\User;
use App\Services\EngineeringIntelligence\EngineeringIntelligenceService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Psy\Exception\ParseErrorException;
use Symfony\Component\Console\Exception\RuntimeException as ConsoleRuntimeException;
use Tests\TestCase;

class SentryZeroRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_day_planner_today_items_eager_loads_todo_relationship_without_n_plus_one(): void
    {
        $user = User::factory()->create();
        $today = CarbonImmutable::parse('2026-11-25');
        $settings = (new PrioritySettingsService($user->id))->get();
        $planner = new DayPlanner($user->id, $settings, $today);

        $plan = $planner->ensurePlan();
        $todos = Todo::factory()->count(3)->create([
            'user_id' => $user->id,
            'estimate_minutes' => 30,
        ]);

        foreach ($todos as $index => $todo) {
            $plan->items()->create([
                'todo_id' => $todo->id,
                'position' => $index + 1,
                'state' => DailyPlan::ITEM_PLANNED,
                'reason' => 'Initial planned item',
            ]);
        }

        DB::enableQueryLog();
        DB::flushQueryLog();

        $items = $planner->todayItems();
        $totalMinutes = $items->sum(fn ($item) => (int) ($item->todo?->estimate_minutes ?? 0));

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertCount(3, $items);
        $this->assertSame(90, $totalMinutes);
        $this->assertTrue($items->every(fn ($item) => $item->relationLoaded('todo')));
        // 1 query for daily_plans, 1 query for daily_plan_items, 1 eager-load query for todos (where id in (...))
        $this->assertLessThanOrEqual(3, count($queries));
    }

    public function test_engineering_retrospective_falls_back_to_existing_user_when_default_user_id_is_missing(): void
    {
        // Create a user with a non-1 ID so user_id=1 does not exist
        $user = User::factory()->create(['id' => 42]);

        /** @var EngineeringIntelligenceService $service */
        $service = app(EngineeringIntelligenceService::class);

        $resolvedId = $service->resolveTargetUserId(1);
        $this->assertSame(42, $resolvedId);

        $retro = $service->generateDailyRetrospective(1, '2026-11-21');
        $this->assertSame($user->id, $retro->user_id);
        $this->assertSame('2026-11-21', $retro->period_key);
    }

    public function test_engineering_retrospective_command_skips_gracefully_when_no_users_exist(): void
    {
        User::query()->delete();

        $this->artisan('engineering:retrospective', ['kind' => 'daily', '--period' => '2026-11-21'])
            ->expectsOutputToContain('Skipping engineering:retrospective (daily): no users exist in the database.')
            ->assertExitCode(0);
    }

    public function test_exception_handler_does_not_report_tinker_parse_errors_or_invalid_console_options(): void
    {
        /** @var ExceptionHandler $handler */
        $handler = app(ExceptionHandler::class);

        $this->assertFalse($handler->shouldReport(new ParseErrorException('Syntax error')));
        $this->assertFalse($handler->shouldReport(new ConsoleRuntimeException('The "--force" option does not exist.')));
        $this->assertFalse($handler->shouldReport(new InvalidArgumentException('Unexpected end of input')));
        $this->assertTrue($handler->shouldReport(new InvalidArgumentException('Genuine domain validation failure')));
    }
}
