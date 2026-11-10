<?php

namespace Tests\Feature;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CodingAgentPagesTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(): array
    {
        $owner = User::factory()->create(['email' => 'mahatma.mahardhika@programinglive.com']);
        config()->set('coding_agent.enabled', true);
        config()->set('coding_agent.owner_user_id', $owner->id);
        config()->set('coding_agent.owner_email', $owner->email);
        config()->set('coding_agent.repositories', ['zettly' => 'programinglive/zettly']);
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);
        $job = CodingAgentJob::create([
            'user_id' => $owner->id, 'todo_id' => $todo->id, 'repository' => 'zettly',
            'instruction' => 'Fix login', 'client_request_id' => 'mobile-1',
        ]);

        return [$owner, $todo, $job];
    }

    public function test_owner_sees_jobs_and_eligible_todos(): void
    {
        [$owner, $todo, $job] = $this->fixture();
        $this->actingAs($owner)->get('/agent/jobs')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Agent/Index')
                ->where('jobs.data.0.id', $job->id)
                ->where('todos.0.id', $todo->id)
                ->where('repositories.0', 'zettly')
                ->where('canUseCodingAgent', true)
                ->etc());
    }

    public function test_non_owner_and_disabled_feature_cannot_read_pages(): void
    {
        [$owner, , $job] = $this->fixture();
        $this->actingAs(User::factory()->create())->get('/agent/jobs')->assertForbidden();
        $this->actingAs(User::factory()->create())->get("/agent/jobs/{$job->id}")->assertForbidden();
        config()->set('coding_agent.enabled', false);
        $this->actingAs($owner)->get('/agent/jobs')->assertNotFound();
    }

    public function test_detail_has_bounded_events_and_no_lease_hash(): void
    {
        [$owner, , $job] = $this->fixture();
        $job->update(['lease_token_hash' => hash('sha256', 'secret-lease')]);
        foreach (range(1, 25) as $number) {
            $job->events()->create([
                'event_key' => "event-{$number}", 'kind' => 'progress',
                'detail' => "Step {$number}", 'occurred_at' => now(),
            ]);
        }

        $response = $this->actingAs($owner)->get("/agent/jobs/{$job->id}")->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Agent/Show')
                ->where('job.id', $job->id)
                ->has('events.data', 20)
                ->where('events.current_page', 1)
                ->etc());
        $this->assertStringNotContainsString($job->lease_token_hash, $response->getContent());
    }

    public function test_foreign_job_is_not_found(): void
    {
        [, , $job] = $this->fixture();
        $foreign = User::factory()->create(['email' => 'another@example.com']);
        config()->set('coding_agent.owner_user_id', $foreign->id);
        config()->set('coding_agent.owner_email', $foreign->email);
        $this->actingAs($foreign)->get("/agent/jobs/{$job->id}")->assertNotFound();
    }

    public function test_index_includes_enriched_todo_dod_recap_and_repository_registry(): void
    {
        [$owner, $todo, $job] = $this->fixture();
        $todo->update(['description' => 'Fix the Sentry N+1 query in clinic dashboard']);
        $todo->checklistItems()->create([
            'title' => 'Add eager loading test',
            'is_completed' => false,
            'position' => 1,
        ]);

        CodingAgentJob::create([
            'user_id' => $owner->id,
            'todo_id' => $todo->id,
            'repository' => 'zettly',
            'instruction' => 'Shipped fix',
            'client_request_id' => 'completed-job-1',
            'status' => 'completed',
        ]);

        $this->actingAs($owner)->get("/agent/jobs?todo_id={$todo->id}")->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Agent/Index')
                ->where('selectedTodoId', $todo->id)
                ->where('todos.0.id', $todo->id)
                ->where('todos.0.description', 'Fix the Sentry N+1 query in clinic dashboard')
                ->where('todos.0.checklist_items.0.title', 'Add eager loading test')
                ->has('repositoryRegistry', 1)
                ->where('repositoryRegistry.0.slug', 'zettly')
                ->where('recap.today', 1)
                ->where('recap.all', 1)
                ->has('recap.dailyStrip', 14)
                ->where('recap.byRepository.0.repository', 'zettly')
                ->where('recap.byRepository.0.completed', 1)
                ->etc());
    }
}
