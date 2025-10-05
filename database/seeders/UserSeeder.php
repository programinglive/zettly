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
        \App\Models\User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
        ]);

        \App\Models\User::factory()->create([
            'name' => 'Jane Smith',
            'email' => 'jane@example.com',
        ]);

        \App\Models\User::factory()->create([
            'name' => 'Bob Johnson',
            'email' => 'bob@example.com',
        ]);
    }
}
