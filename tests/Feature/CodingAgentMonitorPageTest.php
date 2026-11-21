<?php

namespace Tests\Feature;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CodingAgentMonitorPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_open_dedicated_single_session_live_monitor_page(): void
    {
        config([
            'coding_agent.enabled' => true,
            'coding_agent.owner_email' => 'mahatma.mahardhika@programinglive.com',
        ]);

        $owner = User::factory()->create([
            'email' => 'mahatma.mahardhika@programinglive.com',
            'email_verified_at' => now(),
        ]);
        config(['coding_agent.owner_user_id' => $owner->id]);

        $todo = Todo::factory()->create(['user_id' => $owner->id, 'title' => 'Verify headless agent']);
        $job = CodingAgentJob::create([
            'user_id' => $owner->id,
            'todo_id' => $todo->id,
            'repository' => 'zettly',
            'instruction' => 'Check worker status',
            'model' => 'hy4-flash:free',
            'client_request_id' => 'req-monitor-1',
            'status' => 'running',
        ]);
        $job->events()->create([
            'event_key' => 'ev-monitor-1',
            'kind' => 'worker_phase',
            'detail' => 'Codex AI agent started reasoning',
            'occurred_at' => now(),
        ]);

        $this->actingAs($owner)
            ->get(route('agent.jobs.monitor', $job->id))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Agent/Monitor')
                ->where('job.id', $job->id)
                ->where('job.model', 'hy4-flash:free')
                ->has('events', 1)
            );
    }

    public function test_non_owner_cannot_access_live_monitor_page(): void
    {
        config([
            'coding_agent.enabled' => true,
            'coding_agent.owner_user_id' => 999,
            'coding_agent.owner_email' => 'mahatma.mahardhika@programinglive.com',
        ]);

        $other = User::factory()->create(['email_verified_at' => now()]);
        $todo = Todo::factory()->create(['user_id' => $other->id]);
        $job = CodingAgentJob::create([
            'user_id' => $other->id,
            'todo_id' => $todo->id,
            'repository' => 'zettly',
            'instruction' => 'Blocked',
            'model' => 'hy4-flash:free',
            'client_request_id' => 'req-monitor-2',
            'status' => 'queued',
        ]);

        $this->actingAs($other)
            ->get(route('agent.jobs.monitor', $job->id))
            ->assertForbidden();
    }
}
