<?php

namespace Database\Seeders;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Database\Seeder;

class TodoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all existing users
        $users = User::all();

        if ($users->isEmpty()) {
            // If no users exist, create some first
            $users = User::factory(3)->create();
        }

        // Create todos for each user
        $users->each(function ($user) {
            // Create 3-5 todos per user
            Todo::factory()
                ->count(fake()->numberBetween(3, 5))
                ->for($user)
                ->create();
        });

        // Create some additional todos with specific scenarios
        $firstUser = $users->first();

        // Create some completed todos
        Todo::factory()
            ->count(2)
            ->for($firstUser)
            ->create([
                'is_completed' => true,
                'completed_at' => now()->subDays(rand(1, 7)),
            ]);

        // Create some pending todos
        Todo::factory()
            ->count(3)
            ->for($firstUser)
            ->create([
                'is_completed' => false,
                'completed_at' => null,
            ]);
    }
}
