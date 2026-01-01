<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Always promote John to super admin even if the record already exists.
        \App\Models\User::updateOrCreate(
            ['email' => 'mahatma.mahardhika@programinglive.com'],
            [
                'name' => 'Mahatma Mahardhika',
                'password' => bcrypt('Programinglive@123'),
                'email_verified_at' => now(),
                'role' => \App\Enums\UserRole::SUPER_ADMIN->value,
            ]
        );

        \App\Models\User::firstOrCreate(
            ['email' => 'jane@example.com'],
            [
                'name' => 'Jane Smith',
                'password' => bcrypt('keepmoving'),
                'email_verified_at' => now(),
            ]
        );

        \App\Models\User::firstOrCreate(
            ['email' => 'bob@example.com'],
            [
                'name' => 'Bob Johnson',
                'password' => bcrypt('keepmoving'),
                'email_verified_at' => now(),
            ]
        );
    }
}
