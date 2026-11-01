<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UserReportChannel>
 */
class UserReportChannelFactory extends Factory
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
            'channel' => 'discord',
            'webhook_url' => 'https://discord.com/api/webhooks/1/x',
            'chat_id' => null,
            'enabled' => true,
        ];
    }
}
