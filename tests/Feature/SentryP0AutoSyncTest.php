<?php

namespace Tests\Feature;

use App\Domain\Priority\PriorityQueueBuilder;
use App\Domain\Priority\PrioritySettingsService;
use App\Models\Focus;
use App\Models\Todo;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SentryP0AutoSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_unresolved_erp_sentry_issue_is_automatically_promoted_to_live_p0_and_ranked_number_one_in_today_queue(): void
    {
        $user = User::factory()->create();

        // Create an ordinary committed task first so we can verify the ERP Sentry P0 outranks it
        $otherFocus = Focus::create([
            'user_id' => $user->id,
            'title' => 'Clinic Routine Work',
            'status' => Focus::STATUS_ACTIVE,
            'started_at' => now(),
        ]);

        $ordinaryTodo = Todo::create([
            'user_id' => $user->id,
            'focus_id' => $otherFocus->id,
            'type' => Todo::TYPE_TODO,
            'title' => 'Routine Clinic UI Task',
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'priority' => Todo::PRIORITY_URGENT,
            'queue_state' => Todo::QUEUE_COMMITTED,
            'estimate_minutes' => 60,
            'is_completed' => false,
        ]);

        config([
            'coding_agent.owner_user_id' => $user->id,
            'services.sentry.token' => 'test-sentry-token',
            'services.sentry.org' => 'programinglive',
            'services.sentry.host' => 'https://sentry.io',
        ]);

        Http::fake([
            'https://sentry.io/api/0/organizations/programinglive/issues/*' => Http::response([
                [
                    'id' => '999888777',
                    'shortId' => 'ERP-99',
                    'title' => 'FatalError: Allowed memory size exhausted on /sales/salesInvoice',
                    'culprit' => '/sales/salesInvoice',
                    'permalink' => 'https://programinglive.sentry.io/issues/999888777/',
                    'count' => '12',
                    'project' => [
                        'id' => '1',
                        'slug' => 'erp',
                        'name' => 'erp',
                    ],
                ],
            ], 200),
        ]);

        $this->artisan('zettly:sentry-p0-sync', ['--user' => $user->id])
            ->expectsOutputToContain('Sentry P0 Auto-Sync [erp]: status=synced issues_found=1 created=1')
            ->assertExitCode(0);

        // Running a second time must be idempotent (0 duplicate Todos created)
        $this->artisan('zettly:sentry-p0-sync', ['--user' => $user->id])
            ->expectsOutputToContain('Sentry P0 Auto-Sync [erp]: status=synced issues_found=1 created=0')
            ->assertExitCode(0);

        $erpTodos = Todo::query()
            ->where('user_id', $user->id)
            ->where('title', 'like', '%ERP-99%')
            ->get();

        $this->assertCount(1, $erpTodos);
        $erpTodo = $erpTodos->first();
        $this->assertTrue((bool) $erpTodo->is_p0);
        $this->assertSame(Todo::QUEUE_COMMITTED, $erpTodo->queue_state);
        $this->assertTrue($erpTodo->tags()->where('name', 'proyek:erp')->exists());
        $this->assertTrue($erpTodo->tags()->where('name', 'sumber:sentry')->exists());

        // Verify PriorityQueueBuilder places the ERP Sentry P0 Todo at #1 in Today
        $today = CarbonImmutable::now('Asia/Jakarta')->startOfDay();
        $settings = (new PrioritySettingsService($user->id))->get();
        $queue = (new PriorityQueueBuilder($user->id, $settings, $today))->build();

        $this->assertNotEmpty($queue['today']);
        $this->assertSame($erpTodo->id, $queue['today'][0]['id']);
        $this->assertTrue($queue['today'][0]['is_p0']);
    }

    public function test_sentry_p0_auto_sync_skips_issue_when_recently_completed_or_claimed_on_devworkflow_monitor_and_exposes_ai_claim(): void
    {
        $user = User::factory()->create();

        $focus = Focus::create([
            'user_id' => $user->id,
            'title' => 'Beautyworld ERP Daily Sentry Zero (P0 Auto-Preemption)',
            'status' => Focus::STATUS_ACTIVE,
            'started_at' => now(),
        ]);

        // 1. A Todo that was just completed 5 minutes ago by an AI session (awaiting release tag deploy)
        $recentlyCompletedTodo = Todo::create([
            'user_id' => $user->id,
            'focus_id' => $focus->id,
            'type' => Todo::TYPE_TODO,
            'title' => '[P0 · ERP-8B] Fix erp.beautyworld.co.id: N+1 Query',
            'description' => "Sentry Issue ID: 7869873339\nSentry Short ID: ERP-8B\n<!-- dev-workflow:wf-1:start --><section data-dev-workflow-id=\"wf-1\"><h3>Dev Workflow</h3><p>Task ID: <code>wf-1</code></p><p>Project: D:\\code\\erp.beautyworld.co.id</p><p>Status: completed</p><h4>AI sessions</h4><pre>Tool: opencode | Session: ses_erp_1 | Model: claude</pre></section><!-- dev-workflow:wf-1:end -->",
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'priority' => Todo::PRIORITY_URGENT,
            'queue_state' => Todo::QUEUE_COMMITTED,
            'estimate_minutes' => 30,
            'is_completed' => true,
            'completed_at' => now()->subMinutes(5),
        ]);

        // 2. An open Todo that is currently claimed by an active AI session (Status: coding)
        $claimedOpenTodo = Todo::create([
            'user_id' => $user->id,
            'focus_id' => $focus->id,
            'type' => Todo::TYPE_TODO,
            'title' => '[P0 · ERP-9C] Fix erp.beautyworld.co.id: Queue timeout',
            'description' => "Sentry Issue ID: 7869874444\nSentry Short ID: ERP-9C\n<!-- dev-workflow:wf-2:start --><section data-dev-workflow-id=\"wf-2\"><h3>Dev Workflow</h3><p>Task ID: <code>wf-2</code></p><p>Project: D:\\code\\erp.beautyworld.co.id</p><p>Status: coding</p><h4>AI sessions</h4><pre>Tool: antigravity | Session: ses_agy_2 | Model: claude-opus</pre></section><!-- dev-workflow:wf-2:end -->",
            'importance' => Todo::IMPORTANCE_IMPORTANT,
            'priority' => Todo::PRIORITY_URGENT,
            'queue_state' => Todo::QUEUE_COMMITTED,
            'estimate_minutes' => 30,
            'is_completed' => false,
        ]);

        config([
            'coding_agent.owner_user_id' => $user->id,
            'services.sentry.token' => 'test-sentry-token',
            'services.sentry.org' => 'programinglive',
            'services.sentry.host' => 'https://sentry.io',
            'services.devworkflow_monitor.url' => 'http://100.77.138.14:3100',
        ]);

        Http::fake([
            'https://sentry.io/api/0/organizations/programinglive/issues/*' => Http::response([
                [
                    'id' => '7869873339',
                    'shortId' => 'ERP-8B',
                    'title' => 'N+1 Query on stock-usage',
                    'project' => ['slug' => 'erp'],
                ],
                [
                    'id' => '7869874444',
                    'shortId' => 'ERP-9C',
                    'title' => 'Queue timeout',
                    'project' => ['slug' => 'erp'],
                ],
                [
                    'id' => '7869875555',
                    'shortId' => 'ERP-10D',
                    'title' => 'Monitor-claimed issue without existing Todo yet',
                    'project' => ['slug' => 'erp'],
                ],
            ], 200),
            'http://100.77.138.14:3100/api/sessions*' => Http::response([
                'sessions' => [
                    [
                        'session_key' => 'ses_monitor_worker',
                        'machine' => 'MMCH',
                        'agent_tool' => 'opencode',
                        'phase' => 'coding',
                        'state' => 'live',
                        'task' => 'Fix ERP-10D issue',
                        'workflow_task_id' => 'wf-monitor-10d',
                        'task_origin_json' => ['system' => 'sentry', 'id' => '7869875555', 'label' => 'ERP-10D'],
                        'task_relations_json' => [],
                    ],
                ],
            ], 200),
        ]);

        $this->artisan('zettly:sentry-p0-sync', ['--user' => $user->id])
            ->expectsOutputToContain('Sentry P0 Auto-Sync [erp]: status=synced issues_found=3 created=0')
            ->assertExitCode(0);

        $this->assertSame(1, Todo::where('user_id', $user->id)->where('title', 'like', '%ERP-8B%')->count());
        $this->assertSame(1, Todo::where('user_id', $user->id)->where('title', 'like', '%ERP-9C%')->count());
        $this->assertSame(0, Todo::where('user_id', $user->id)->where('title', 'like', '%ERP-10D%')->count());

        // Verify ai_claim accessor on Todo and PriorityQueueBuilder output
        $claim = $claimedOpenTodo->fresh()->ai_claim;
        $this->assertIsArray($claim);
        $this->assertTrue($claim['claimed']);
        $this->assertSame('in_progress', $claim['status']);
        $this->assertSame('coding', $claim['phase']);
        $this->assertSame('wf-2', $claim['task_id']);
        $this->assertStringContainsString('antigravity', $claim['session']);

        $completedClaim = $recentlyCompletedTodo->fresh()->ai_claim;
        $this->assertIsArray($completedClaim);
        $this->assertFalse($completedClaim['claimed']);
        $this->assertSame('completed', $completedClaim['phase']);

        $today = CarbonImmutable::now('Asia/Jakarta')->startOfDay();
        $settings = (new PrioritySettingsService($user->id))->get();
        $queue = (new PriorityQueueBuilder($user->id, $settings, $today))->build();
        $allItems = array_merge($queue['today'], $queue['next']);
        $item9c = collect($allItems)->firstWhere('id', $claimedOpenTodo->id);
        $this->assertNotNull($item9c);
        $this->assertArrayHasKey('ai_claim', $item9c);
        $this->assertTrue($item9c['ai_claim']['claimed']);
        $this->assertSame('coding', $item9c['ai_claim']['phase']);
    }
}
