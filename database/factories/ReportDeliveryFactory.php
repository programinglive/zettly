<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ReportDelivery>
 */
class ReportDeliveryFactory extends Factory
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
            'report_id' => \App\Models\Report::factory(),
            'channel' => 'discord',
            'status' => 'pending',
            'attempts' => 0,
            'last_error' => null,
            'delivered_at' => null,
        ];
    }
}
