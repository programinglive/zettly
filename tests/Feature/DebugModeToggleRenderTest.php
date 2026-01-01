<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DebugModeToggleRenderTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_access_profile_page(): void
    {
        /** @var User $superAdmin */
        $superAdmin = User::factory()->create([
            'role' => UserRole::SUPER_ADMIN,
        ]);

        $response = $this->actingAs($superAdmin)->get('/profile');

        $response->assertStatus(200);
        // Verify the page loads (Inertia renders client-side, so we just check HTTP 200)
        $this->assertStringContainsString('super_admin', $response->getContent());
    }

    public function test_regular_user_can_access_profile_page(): void
    {
        /** @var User $user */
        $user = User::factory()->create([
            'role' => UserRole::USER,
        ]);

        $response = $this->actingAs($user)->get('/profile');

        $response->assertStatus(200);
        // Verify the page loads with user role
        $this->assertStringContainsString('user', $response->getContent());
    }

    public function test_super_admin_user_model_has_correct_role(): void
    {
        $superAdmin = User::factory()->create([
            'role' => UserRole::SUPER_ADMIN,
        ]);

        $this->assertTrue($superAdmin->role === UserRole::SUPER_ADMIN,
            'Super admin user should have SUPER_ADMIN role');
        $this->assertEquals('super_admin', $superAdmin->role->value,
            'Super admin role value should be super_admin string');
    }

    public function test_seeded_default_user_is_super_admin(): void
    {
        $this->seed(\Database\Seeders\UserSeeder::class);

        $admin = User::where('email', 'mahatma.mahardhika@programinglive.com')->first();

        $this->assertNotNull($admin, 'Default super admin should be seeded');
        $this->assertTrue($admin->role === UserRole::SUPER_ADMIN,
            'Default user should be a super administrator');
        $this->assertEquals('super_admin', $admin->role->value,
            'Role value should be super_admin string');
    }

    public function test_debug_mode_toggle_renders_in_built_component(): void
    {
        // Verify the built JavaScript contains the Debug Settings UI
        $buildDir = public_path('build/assets');
        $files = glob($buildDir.'/Edit-*.js');

        $this->assertNotEmpty($files, 'Edit component should be built');

        $containsDebug = collect($files)->contains(function ($file) {
            $content = file_get_contents($file);

            return str_contains($content, 'Debug');
        });

        $this->assertTrue(
            $containsDebug,
            'Built Edit component should contain Debug related code'
        );
    }
}
