<?php

namespace Tests\Feature\Calendar;

use App\Domain\Priority\DayPlanner;
use App\Domain\Priority\PriorityQueueBuilder;
use App\Domain\Priority\WeeklyFocusAllocationService;
use App\Models\Focus;
use App\Models\PriorityDecision;
use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WeeklyFocusPriorityIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Focus $focus;

    private UserPrioritySetting $settings;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->focus = Focus::create([
            'user_id' => $this->user->id,
            'title' => 'Active workspace focus',
        ]);

        $this->settings = UserPrioritySetting::create([
            'user_id' => $this->user->id,
            'wip_limit' => 2,
            'daily_capacity_minutes' => 240,
            'queue_size' => 8,
            'require_focus' => true,
            'require_estimate' => false,
            'max_p0' => 2,
            'main_work_strict' => true,
            'enabled' => true,
        ]);
    }

    private function makeTag(string $name): Tag
    {
        return Tag::create([
            'user_id' => $this->user->id,
            'name' => $name,
            'color' => '#2563EB',
        ]);
    }

    private function makeTodo(string $title, array $attributes = []): Todo
    {
        return Todo::create(array_merge([
            'user_id' => $this->user->id,
            'title' => $title,
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'focus_id' => $this->focus->id,
            'estimate_minutes' => 30,
            'importance' => Todo::IMPORTANCE_NOT_IMPORTANT,
            'priority' => Todo::PRIORITY_NOT_URGENT,
        ], $attributes));
    }

    public function test_priority_queue_prioritizes_todos_matching_weekday_and_weekend_focus_themes(): void
    {
        $clinicTag = $this->makeTag('proyek:clinic');
        $zettlyTag = $this->makeTag('area:zettly');

        // Created earlier with lower ID so without day-theme boost it would always win tie-breaks
        $zettlyTodo = $this->makeTodo('Refine Zettly calendar navigation', [
            'kanban_order' => 1,
        ]);
        $zettlyTodo->tags()->attach($zettlyTag->id);

        $clinicTodo = $this->makeTodo('Fix Clinic cashier receipt spacing', [
            'kanban_order' => 2,
        ]);
        $clinicTodo->tags()->attach($clinicTag->id);

        // Tuesday 2026-11-17 -> Beautyworld & Clinic day
        $tuesday = CarbonImmutable::parse('2026-11-17 09:00', 'Asia/Jakarta');
        $tuesdayQueue = (new PriorityQueueBuilder($this->user->id, $this->settings, $tuesday))->build();

        $this->assertSame('Beautyworld & Clinic', $tuesdayQueue['day_allocation']['theme']);
        $this->assertSame([$clinicTodo->id, $zettlyTodo->id], array_column($tuesdayQueue['next'], 'id'));
        $this->assertTrue($tuesdayQueue['next'][0]['matches_day_theme']);
        $this->assertFalse($tuesdayQueue['next'][1]['matches_day_theme']);
        $this->assertStringContainsString('Beautyworld & Clinic', implode(' ', $tuesdayQueue['next'][0]['reasons']));

        // Saturday 2026-11-21 -> ProgramingLive day
        $saturday = CarbonImmutable::parse('2026-11-21 09:00', 'Asia/Jakarta');
        $saturdayQueue = (new PriorityQueueBuilder($this->user->id, $this->settings, $saturday))->build();

        $this->assertSame('ProgramingLive', $saturdayQueue['day_allocation']['theme']);
        $this->assertSame([$zettlyTodo->id, $clinicTodo->id], array_column($saturdayQueue['next'], 'id'));
        $this->assertTrue($saturdayQueue['next'][0]['matches_day_theme']);
        $this->assertFalse($saturdayQueue['next'][1]['matches_day_theme']);
        $this->assertStringContainsString('ProgramingLive', implode(' ', $saturdayQueue['next'][0]['reasons']));
    }

    public function test_live_p0_always_overrides_day_focus_theme_in_priority_queue(): void
    {
        $clinicTag = $this->makeTag('proyek:clinic');
        $zettlyTag = $this->makeTag('area:zettly');

        $saturday = CarbonImmutable::parse('2026-11-21 09:00', 'Asia/Jakarta');

        $zettlyTodo = $this->makeTodo('Ship Zettly feature polish', ['kanban_order' => 1]);
        $zettlyTodo->tags()->attach($zettlyTag->id);

        $clinicP0 = $this->makeTodo('Production Clinic billing outage', [
            'kanban_order' => 2,
        ]);
        $clinicP0->forceFill([
            'is_p0' => true,
            'p0_reason' => 'Live checkout outage',
            'p0_since' => $saturday->subHour(),
            'p0_expires_at' => $saturday->addHours(8),
        ])->save();
        $clinicP0->tags()->attach($clinicTag->id);

        $queue = (new PriorityQueueBuilder($this->user->id, $this->settings, $saturday))->build();

        $this->assertSame([$clinicP0->id, $zettlyTodo->id], array_column($queue['next'], 'id'));
        $this->assertTrue($queue['next'][0]['is_p0']);
        $this->assertTrue($queue['next'][0]['matches_day_theme']);
    }

    public function test_custom_weekly_focus_allocation_schedule_immediately_updates_queue_ranking(): void
    {
        $clinicTag = $this->makeTag('proyek:clinic');
        $cliTag = $this->makeTag('area:cli');

        $clinicTodo = $this->makeTodo('Clinic billing cleanup', ['kanban_order' => 1]);
        $clinicTodo->tags()->attach($clinicTag->id);

        $cliTodo = $this->makeTodo('Upgrade DevWorkflow CLI parser', ['kanban_order' => 2]);
        $cliTodo->tags()->attach($cliTag->id);

        app(WeeklyFocusAllocationService::class)->updateSchedule($this->user->id, [
            'tuesday' => [
                'theme' => 'CLI Maintenance Day',
                'tags' => ['area:cli'],
                'color' => '#10B981',
                'description' => 'Custom Tuesday override for CLI maintenance',
            ],
        ], 'cli');

        $tuesday = CarbonImmutable::parse('2026-11-17 09:00', 'Asia/Jakarta');
        $queue = (new PriorityQueueBuilder($this->user->id, $this->settings, $tuesday))->build();

        $this->assertSame('CLI Maintenance Day', $queue['day_allocation']['theme']);
        $this->assertSame([$cliTodo->id, $clinicTodo->id], array_column($queue['next'], 'id'));
        $this->assertTrue($queue['next'][0]['matches_day_theme']);
    }

    public function test_day_planner_commit_records_day_theme_metadata_in_audit_trail(): void
    {
        $clinicTag = $this->makeTag('proyek:clinic');
        $clinicTodo = $this->makeTodo('Clinic shift report fix');
        $clinicTodo->tags()->attach($clinicTag->id);

        $tuesday = CarbonImmutable::parse('2026-11-17 09:00', 'Asia/Jakarta');
        $planner = new DayPlanner($this->user->id, $this->settings, $tuesday);
        $planner->commit($clinicTodo, 'Owner committed clinic work for Tuesday', false, 'cli');

        $decision = PriorityDecision::query()
            ->where('user_id', $this->user->id)
            ->where('todo_id', $clinicTodo->id)
            ->where('action', PriorityDecision::ACTION_COMMIT)
            ->latest('id')
            ->first();

        $this->assertNotNull($decision);
        $this->assertSame('Beautyworld & Clinic', $decision->after['day_allocation_theme'] ?? null);
        $this->assertTrue($decision->after['matches_day_theme'] ?? false);
    }
}
