<?php

namespace Tests\Feature\Calendar;

use App\Domain\Priority\WeeklyFocusAllocationService;
use App\Models\PriorityDecision;
use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class WeeklyFocusCalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_weekly_focus_schedule_provides_structured_weekday_and_weekend_themes(): void
    {
        $user = User::factory()->create();
        $service = app(WeeklyFocusAllocationService::class);

        $schedule = $service->getSchedule($user->id);

        $this->assertCount(7, $schedule);
        $this->assertSame('Beautyworld & Clinic', $schedule['monday']['theme']);
        $this->assertSame('Beautyworld & Clinic', $schedule['friday']['theme']);
        $this->assertSame('ProgramingLive', $schedule['saturday']['theme']);
        $this->assertSame('Development Tools', $schedule['sunday']['theme']);
    }

    public function test_user_can_update_weekly_focus_allocations_with_audit_trail_and_user_isolation(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $response = $this->actingAs($user)->putJson('/calendar/allocations', [
            'allocations' => [
                'saturday' => [
                    'theme' => 'ProgramingLive & DBPinball',
                    'tags' => ['area:zettly', 'proyek:dbpinball'],
                    'color' => '#EA580C',
                    'description' => 'Deep work on ProgramingLive products',
                ],
                'sunday' => [
                    'theme' => 'MCP & Dev Tooling',
                    'tags' => ['area:cli', 'proyek:devworkflow-capture-studio'],
                    'color' => '#059669',
                    'description' => 'Maintain developer workflows and tools',
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('schedule.saturday.theme', 'ProgramingLive & DBPinball')
            ->assertJsonPath('schedule.sunday.theme', 'MCP & Dev Tooling')
            ->assertJsonPath('schedule.monday.theme', 'Beautyworld & Clinic');

        $this->assertDatabaseHas('priority_decisions', [
            'user_id' => $user->id,
            'action' => PriorityDecision::ACTION_WEEKLY_FOCUS,
        ]);

        $otherSchedule = app(WeeklyFocusAllocationService::class)->getSchedule($otherUser->id);
        $this->assertSame('ProgramingLive', $otherSchedule['saturday']['theme']);
    }

    public function test_calendar_page_groups_scheduled_todos_and_matches_day_focus_themes_with_p0_override(): void
    {
        $user = User::factory()->create();
        $clinicTag = Tag::create([
            'user_id' => $user->id,
            'name' => 'proyek:clinic',
            'color' => '#2563EB',
        ]);
        $zettlyTag = Tag::create([
            'user_id' => $user->id,
            'name' => 'area:zettly',
            'color' => '#F97316',
        ]);

        // 2026-11-21 is a Saturday (ProgramingLive day)
        $satTodo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Ship Zettly Calendar UI',
            'due_date' => '2026-11-21',
            'is_completed' => false,
            'archived' => false,
        ]);
        $satTodo->tags()->attach($zettlyTag->id);

        // Unscheduled Clinic todo (should be recommended on Monday-Friday)
        $unscheduledClinic = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Clinic POS invoice fix',
            'due_date' => null,
            'is_completed' => false,
            'archived' => false,
        ]);
        $unscheduledClinic->tags()->attach($clinicTag->id);

        // P0 Todo scheduled on Saturday (overrides theme mismatch)
        $p0Todo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'title' => 'Urgent Clinic P0 hotfix',
            'due_date' => '2026-11-21',
            'is_p0' => true,
            'p0_reason' => 'Production incident',
            'p0_since' => CarbonImmutable::parse('2026-11-21T01:00:00Z'),
            'p0_expires_at' => CarbonImmutable::parse('2026-11-21T23:00:00Z'),
            'is_completed' => false,
            'archived' => false,
        ]);

        $response = $this->actingAs($user)->get('/calendar?month=2026-11&date=2026-11-21');

        $response->assertOk();
        $props = $response->viewData('page')['props'];

        $this->assertSame('Calendar/Index', $response->viewData('page')['component']);
        $this->assertSame('2026-11', $props['month']);
        $this->assertSame('ProgramingLive', $props['calendar']['active_day']['allocation']['theme']);

        $satCell = collect($props['calendar']['days'])->firstWhere('date', '2026-11-21');
        $this->assertNotNull($satCell);
        $this->assertCount(2, $satCell['todos']);

        $byId = collect($satCell['todos'])->keyBy('id');
        $this->assertTrue($byId[$satTodo->id]['matches_theme']);
        $this->assertTrue($byId[$p0Todo->id]['is_p0']);
        $this->assertTrue($byId[$p0Todo->id]['matches_theme'], 'P0 tasks must always be treated as valid for any day.');
    }

    public function test_user_can_reschedule_todo_from_calendar_and_non_owner_is_forbidden(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $todo = Todo::factory()->asTask()->create([
            'user_id' => $user->id,
            'due_date' => null,
        ]);

        $this->actingAs($other)
            ->patchJson("/calendar/todos/{$todo->id}/schedule", ['due_date' => '2026-11-22'])
            ->assertForbidden();

        $this->actingAs($user)
            ->patchJson("/calendar/todos/{$todo->id}/schedule", ['due_date' => '2026-11-22'])
            ->assertOk()
            ->assertJsonPath('todo.due_date', '2026-11-22');

        $this->assertSame('2026-11-22', $todo->fresh()->due_date?->format('Y-m-d'));
    }

    public function test_artisan_calendar_command_reads_and_updates_weekly_focus_allocation(): void
    {
        $user = User::factory()->create();

        $exitCode = Artisan::call('zettly:calendar', [
            '--user' => $user->id,
            '--date' => '2026-11-21',
            '--set-day' => 'saturday',
            '--theme' => 'ProgramingLive Focus Day',
            '--tags' => 'area:zettly,proyek:dbpinball',
            '--json' => true,
        ]);

        $this->assertSame(0, $exitCode);
        $payload = json_decode(Artisan::output(), true);

        $this->assertSame('ProgramingLive Focus Day', $payload['schedule']['saturday']['theme']);
        $this->assertSame(['area:zettly', 'proyek:dbpinball'], $payload['schedule']['saturday']['tags']);
    }
}
