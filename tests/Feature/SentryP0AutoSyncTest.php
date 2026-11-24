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
}
