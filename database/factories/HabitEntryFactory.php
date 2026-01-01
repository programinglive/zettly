<?php

namespace Database\Factories;

use App\Models\HabitEntry;
use App\Models\Habit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\HabitEntry>
 */
class HabitEntryFactory extends Factory
{
    protected $model = HabitEntry::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'habit_id' => Habit::factory(),
            'date' => $this->faker->dateTimeBetween('-30 days', 'today')->format('Y-m-d'),
            'count' => $this->faker->numberBetween(1, 5),
            'notes' => $this->faker->optional(0.7)->sentence(),
        ];
    }

    /**
     * Create an entry for today.
     */
    public function today(): static
    {
        return $this->state(fn (array $attributes) => [
            'date' => now()->format('Y-m-d'),
        ]);
    }

    /**
     * Create an entry for yesterday.
     */
    public function yesterday(): static
    {
        return $this->state(fn (array $attributes) => [
            'date' => now()->subDay()->format('Y-m-d'),
        ]);
    }

    /**
     * Create a completed entry (count meets target).
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'count' => function (array $attributes) {
                $habit = Habit::find($attributes['habit_id']);
                return $habit ? $habit->target_frequency : 1;
            },
        ]);
    }

    /**
     * Create a partial entry (count below target).
     */
    public function partial(): static
    {
        return $this->state(fn (array $attributes) => [
            'count' => function (array $attributes) {
                $habit = Habit::find($attributes['habit_id']);
                $target = $habit ? $habit->target_frequency : 1;
                return max(1, $target - 1);
            },
        ]);
    }
}
