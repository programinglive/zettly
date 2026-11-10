<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CodingAgentSetupTest extends TestCase
{
    use RefreshDatabase;

    private function owner(): User
    {
        $owner = User::factory()->create(['email' => 'mahatma.mahardhika@programinglive.com']);
        config()->set('coding_agent.enabled', false);
        config()->set('coding_agent.owner_user_id', $owner->id);
        config()->set('coding_agent.owner_email', $owner->email);

        return $owner;
    }

    public function test_owner_can_issue_worker_token_while_jobs_remain_disabled(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner)->get('/agent/jobs')->assertNotFound();
        $this->actingAs($owner)->get('/agent/setup')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Agent/Setup')->where('newToken', null)->etc());

        $this->actingAs($owner)->post('/agent/setup/worker-token')->assertRedirect('/agent/setup');
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $owner->id,
            'name' => 'zettly-coding-worker',
            'abilities' => '["coding-agent:worker"]',
        ]);
        $this->actingAs($owner)->get('/agent/setup')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Agent/Setup')->whereType('newToken', 'string')->etc());
        $this->actingAs($owner)->get('/agent/setup')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Agent/Setup')->where('newToken', null)->etc());
    }

    public function test_new_worker_token_revokes_previous_worker_token(): void
    {
        $owner = $this->owner();
        $old = $owner->createToken('zettly-coding-worker', ['coding-agent:worker']);
        $this->actingAs($owner)->post('/agent/setup/worker-token')->assertRedirect();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $old->accessToken->id]);
        $this->assertSame(1, $owner->tokens()->where('name', 'zettly-coding-worker')->count());
    }

    public function test_other_user_cannot_issue_worker_token(): void
    {
        $this->owner();
        $other = User::factory()->create();
        $this->actingAs($other)->postJson('/agent/setup/worker-token')->assertForbidden();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_setup_page_exposes_normalized_repository_registry(): void
    {
        $owner = $this->owner();
        config()->set('coding_agent.repositories', [
            'zettly' => [
                'name' => 'Zettly Workspace',
                'remote' => 'programinglive/zettly',
                'base' => 'main',
                'stack' => 'Laravel',
                'checks' => 'php artisan test && npm run test:js',
            ],
            'clinic' => 'beautyworld_repository/clinic',
        ]);

        $this->actingAs($owner)->get('/agent/setup')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Agent/Setup')
                ->has('repositoryRegistry', 2)
                ->where('repositoryRegistry.0.slug', 'zettly')
                ->where('repositoryRegistry.0.stack', 'Laravel')
                ->where('repositoryRegistry.0.checks', 'php artisan test && npm run test:js')
                ->where('repositoryRegistry.1.slug', 'clinic')
                ->where('repositoryRegistry.1.remote', 'beautyworld_repository/clinic')
                ->where('repositoryRegistry.1.base', 'main')
                ->etc());
    }
}
