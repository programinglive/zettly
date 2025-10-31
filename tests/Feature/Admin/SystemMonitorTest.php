<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemMonitorTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_super_admin_cannot_access_system_monitor(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::USER->value,
        ]);

        $response = $this->actingAs($user)->get('/admin/system-monitor');

        $response->assertForbidden();
    }

    public function test_super_admin_can_view_system_monitor(): void
    {
        $user = User::factory()->superAdmin()->create();

        $response = $this->actingAs($user)->get('/admin/system-monitor');

        $response
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/SystemMonitor')
                ->where('appVersion', config('app.version', 'unknown'))
                ->etc()
            );
    }
}
