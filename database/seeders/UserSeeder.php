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
        \App\Models\User::firstOrCreate(
            ['email' => 'john@example.com'],
            [
                'name' => 'John Doe',
                'password' => bcrypt('password123'),
                'email_verified_at' => now(),
            ]
        );

        \App\Models\User::firstOrCreate(
            ['email' => 'jane@example.com'],
            [
                'name' => 'Jane Smith',
                'password' => bcrypt('password123'),
                'email_verified_at' => now(),
            ]
        );

        \App\Models\User::firstOrCreate(
            ['email' => 'bob@example.com'],
            [
                'name' => 'Bob Johnson',
                'password' => bcrypt('password123'),
                'email_verified_at' => now(),
            ]
        );
    }
}
