<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AgentSession>
 */
class AgentSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => \App\Models\User::factory(),
            'session_id' => fake()->uuid(),
            'project' => 'zettly',
            'title' => fake()->sentence(6),
            'category' => 'Development',
            'status' => 'in_progress',
            'started_at' => now()->subHour(),
            'last_activity_at' => now(),
            'duration_seconds' => 600,
            'machine' => 'TEST',
        ];
    }
}
