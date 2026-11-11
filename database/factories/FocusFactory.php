<?php

namespace Database\Factories;

use App\Models\Focus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Focus>
 */
class FocusFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => $this->faker->sentence(),
            'description' => $this->faker->paragraph(),
            'status' => Focus::STATUS_ACTIVE,
            'color' => Focus::DEFAULT_COLOR,
            'started_at' => now(),
            'completed_at' => null,
        ];
    }

    public function paused(): static
    {
        return $this->state(fn () => [
            'status' => Focus::STATUS_PAUSED,
            'completed_at' => null,
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => Focus::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);
    }
}
