<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class CodingAgentOwnerTest extends TestCase
{
    use RefreshDatabase;

    private function registerProbe(): void
    {
        Route::middleware(['web', 'auth', 'coding-agent-owner'])
            ->get('/coding-agent-owner-probe', fn () => response()->json(['allowed' => true]));
    }

    public function test_verified_configured_owner_can_access_agent(): void
    {
        $owner = User::factory()->create(['email' => 'mahatma.mahardhika@programinglive.com']);
        config()->set('coding_agent.enabled', true);
        config()->set('coding_agent.owner_user_id', $owner->id);
        config()->set('coding_agent.owner_email', $owner->email);
        $this->registerProbe();

        $this->actingAs($owner)->getJson('/coding-agent-owner-probe')
            ->assertOk()->assertJsonPath('allowed', true);
    }

    public function test_second_super_admin_cannot_access_agent(): void
    {
        $owner = User::factory()->create(['email' => 'mahatma.mahardhika@programinglive.com']);
        $other = User::factory()->create();
        $other->assignRole(UserRole::SUPER_ADMIN);
        config()->set('coding_agent.enabled', true);
        config()->set('coding_agent.owner_user_id', $owner->id);
        config()->set('coding_agent.owner_email', $owner->email);
        $this->registerProbe();

        $this->actingAs($other)->getJson('/coding-agent-owner-probe')->assertForbidden();
    }

    public function test_disabled_agent_is_not_found(): void
    {
        $owner = User::factory()->create(['email' => 'mahatma.mahardhika@programinglive.com']);
        config()->set('coding_agent.enabled', false);
        config()->set('coding_agent.owner_user_id', $owner->id);
        config()->set('coding_agent.owner_email', $owner->email);
        $this->registerProbe();

        $this->actingAs($owner)->getJson('/coding-agent-owner-probe')->assertNotFound();
    }

    public function test_unverified_owner_cannot_access_agent(): void
    {
        $owner = User::factory()->unverified()->create(['email' => 'mahatma.mahardhika@programinglive.com']);
        config()->set('coding_agent.enabled', true);
        config()->set('coding_agent.owner_user_id', $owner->id);
        config()->set('coding_agent.owner_email', $owner->email);
        $this->registerProbe();

        $this->actingAs($owner)->getJson('/coding-agent-owner-probe')->assertForbidden();
    }
}
