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

    public function test_john_is_seeded_as_super_admin(): void
    {
        $this->seed(UserSeeder::class);

        $john = User::where('email', 'john@example.com')->first();

        $this->assertNotNull($john, 'Seeded John user should exist.');
        $this->assertTrue($john->role === UserRole::SUPER_ADMIN, 'Seeded John user should be a super administrator.');
        $this->assertTrue(Hash::check('password123', $john->password), 'Seeded John user should have the default password.');
    }

    public function test_existing_john_user_is_promoted_to_super_admin(): void
    {
        User::factory()->create([
            'email' => 'john@example.com',
            'role' => UserRole::USER,
        ]);

        $this->seed(UserSeeder::class);

        $john = User::where('email', 'john@example.com')->firstOrFail();

        $this->assertTrue($john->role === UserRole::SUPER_ADMIN, 'Existing John user should be promoted to super administrator.');
        $this->assertTrue(Hash::check('password123', $john->password), 'Existing John user password should be reset to the default.');
    }
}
