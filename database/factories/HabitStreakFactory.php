<?php

namespace Database\Factories;

use App\Models\HabitStreak;
use App\Models\Habit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\HabitStreak>
 */
class HabitStreakFactory extends Factory
{
    protected $model = HabitStreak::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'habit_id' => Habit::factory(),
            'current_streak' => $this->faker->numberBetween(0, 30),
            'longest_streak' => $this->faker->numberBetween(0, 100),
            'last_completion_date' => $this->faker->optional(0.8)->dateTimeBetween('-30 days', 'today')->format('Y-m-d'),
        ];
    }

    /**
     * Create a streak with current activity.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'current_streak' => $this->faker->numberBetween(1, 30),
            'last_completion_date' => now()->format('Y-m-d'),
        ]);
    }

    /**
     * Create a streak that was broken.
     */
    public function broken(): static
    {
        return $this->state(fn (array $attributes) => [
            'current_streak' => 0,
            'last_completion_date' => $this->faker->dateTimeBetween('-10 days', '-2 days')->format('Y-m-d'),
        ]);
    }

    /**
     * Create a streak with impressive numbers.
     */
    public function impressive(): static
    {
        return $this->state(fn (array $attributes) => [
            'current_streak' => $this->faker->numberBetween(30, 100),
            'longest_streak' => $this->faker->numberBetween(50, 200),
            'last_completion_date' => now()->format('Y-m-d'),
        ]);
    }
}
