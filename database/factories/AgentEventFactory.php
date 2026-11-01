<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AgentEvent>
 */
class AgentEventFactory extends Factory
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
            'agent_session_id' => \App\Models\AgentSession::factory(),
            'event_key' => hash('sha256', fake()->uuid()),
            'kind' => 'prompt',
            'occurred_at' => now(),
            'detail' => fake()->optional()->sentence(),
        ];
    }
}
