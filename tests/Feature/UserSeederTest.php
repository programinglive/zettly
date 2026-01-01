<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_super_admin_is_seeded(): void
    {
        $this->seed(UserSeeder::class);

        $admin = User::where('email', 'mahatma.mahardhika@programinglive.com')->first();

        $this->assertNotNull($admin, 'Seeded super admin user should exist.');
        $this->assertTrue($admin->role === UserRole::SUPER_ADMIN, 'Seeded default user should be a super administrator.');
        $this->assertTrue(Hash::check('Programinglive@123', $admin->password), 'Seeded super admin user should have the default password.');
    }

    public function test_existing_user_promoted_to_super_admin(): void
    {
        User::factory()->create([
            'email' => 'mahatma.mahardhika@programinglive.com',
            'role' => UserRole::USER,
        ]);

        $this->seed(UserSeeder::class);

        $admin = User::where('email', 'mahatma.mahardhika@programinglive.com')->firstOrFail();

        $this->assertTrue($admin->role === UserRole::SUPER_ADMIN, 'Existing default user should be promoted to super administrator.');
        $this->assertTrue(Hash::check('Programinglive@123', $admin->password), 'Existing super admin user password should be reset to the default.');
    }
}
