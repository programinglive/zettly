<?php

namespace Tests\Feature\Priority;

use App\Domain\Priority\MainWorkService;
use App\Domain\Priority\P0Service;
use App\Models\Focus;
use App\Models\Todo;
use App\Models\User;
use App\Models\UserPrioritySetting;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PriorityCrossInterfaceParityTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Focus $focus;
    private Todo $p0Task;
    private Todo $mainWorkTask;
    private Todo $regularTask;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $today = CarbonImmutable::parse('2026-11-17 08:00', 'Asia/Jakarta');
        $this->travelTo($today);

        $settings = UserPrioritySetting::create([
            'user_id' => $this->user->id,
            'wip_limit' => 3,
            'daily_capacity_minutes' => 240,
            'queue_size' => 10,
            'require_focus' => false,
            'require_estimate' => false,
            'max_p0' => 2,
            'main_work_strict' => true,
            'enabled' => true,
        ]);

        $this->focus = Focus::create([
            'user_id' => $this->user->id,
            'title' => 'Main Focus',
            'status' => 'active',
        ]);

        $this->regularTask = Todo::create([
            'user_id' => $this->user->id,
            'title' => 'Regular task with distant deadline',
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'due_date' => $today->addDays(5),
            'is_completed' => false,
            'archived' => false,
        ]);

        $this->mainWorkTask = Todo::create([
            'user_id' => $this->user->id,
            'focus_id' => $this->focus->id,
            'title' => 'Main work task',
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'is_completed' => false,
            'archived' => false,
        ]);

        $this->p0Task = Todo::create([
            'user_id' => $this->user->id,
            'title' => 'P0 Critical Incident',
            'type' => Todo::TYPE_TODO,
            'queue_state' => Todo::QUEUE_BACKLOG,
            'is_completed' => false,
            'archived' => false,
        ]);

        (new MainWorkService($this->user->id))->set('focus', $this->focus->id, 'Core project focus', 'test', $this->user->id);
        (new P0Service($this->user->id, $settings))->declare($this->p0Task, 'Production payment outage', $today->addHours(12), 'test', $this->user->id);
    }

    public function test_cli_api_and_ui_produce_identical_task_ranking(): void
    {
        // 1. API ranking
        Sanctum::actingAs($this->user, ['zettly:cli']);
        $apiResponse = $this->getJson('/api/v1/priority/queue?date=2026-11-17');
        $apiResponse->assertOk();
        $apiData = $apiResponse->json('data');
        $apiNextIds = array_column($apiData['next'], 'id');

        // 2. UI ranking
        $uiResponse = $this->actingAs($this->user)->getJson('/priority?date=2026-11-17');
        $uiResponse->assertOk();
        $uiData = $uiResponse->json();
        $uiNextIds = array_column($uiData['next'], 'id');

        // 3. CLI ranking
        $cliExit = Artisan::call('zettly:priority', [
            'action' => 'queue',
            '--user' => $this->user->id,
            '--date' => '2026-11-17',
            '--json' => true,
        ]);
        $this->assertSame(0, $cliExit);
        $cliOutput = json_decode(Artisan::output(), true);
        $this->assertTrue($cliOutput['success']);
        $cliNextIds = array_column($cliOutput['data']['next'], 'id');

        // The expected order according to domain rules:
        // P0 outranks Main Work, which outranks regular task!
        $expectedOrder = [$this->p0Task->id, $this->mainWorkTask->id, $this->regularTask->id];

        $this->assertSame($expectedOrder, $apiNextIds, 'API ranking must follow P0 > Main Work > Regular');
        $this->assertSame($expectedOrder, $uiNextIds, 'UI ranking must match API ranking');
        $this->assertSame($expectedOrder, $cliNextIds, 'CLI ranking must match API and UI ranking');
    }

    public function test_cli_and_api_produce_identical_explanation(): void
    {
        Sanctum::actingAs($this->user, ['zettly:cli']);
        $apiResponse = $this->getJson("/api/v1/priority/explain/{$this->p0Task->id}");
        $apiResponse->assertOk();
        $apiExplain = $apiResponse->json('data');

        $cliExit = Artisan::call('zettly:priority', [
            'action' => 'explain',
            '--user' => $this->user->id,
            '--todo' => $this->p0Task->id,
            '--date' => '2026-11-17',
            '--json' => true,
        ]);
        $this->assertSame(0, $cliExit);
        $cliOutput = json_decode(Artisan::output(), true);
        $cliExplain = $cliOutput['data'];

        $this->assertSame($apiExplain['decided_by'], $cliExplain['decided_by']);
        $this->assertSame($apiExplain['ready'], $cliExplain['ready']);
        $this->assertSame($apiExplain['key'], $cliExplain['key']);
    }
}
