<?php

namespace Database\Factories;

use App\Models\Habit;
use App\Models\User;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Habit>
 */
class HabitFactory extends Factory
{
    protected $model = Habit::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'organization_id' => null,
            'title' => $this->faker->words(3, true),
            'description' => $this->faker->sentence(),
            'color' => $this->faker->randomElement([
                '#6B7280', // gray-500
                '#374151', // gray-700
                '#111827', // gray-900
                '#9CA3AF', // gray-400
                '#D1D5DB', // gray-300
            ]),
            'icon' => $this->faker->randomElement(['circle', 'star', 'heart', 'check', 'target']),
            'target_frequency' => $this->faker->numberBetween(1, 5),
            'frequency_period' => $this->faker->randomElement(['daily', 'weekly', 'monthly']),
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the habit belongs to an organization.
     */
    public function forOrganization(Organization $organization): static
    {
        return $this->state(fn (array $attributes) => [
            'organization_id' => $organization->id,
        ]);
    }

    /**
     * Indicate that the habit is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Create a daily habit.
     */
    public function daily(): static
    {
        return $this->state(fn (array $attributes) => [
            'frequency_period' => 'daily',
        ]);
    }

    /**
     * Create a weekly habit.
     */
    public function weekly(): static
    {
        return $this->state(fn (array $attributes) => [
            'frequency_period' => 'weekly',
        ]);
    }

    /**
     * Create a monthly habit.
     */
    public function monthly(): static
    {
        return $this->state(fn (array $attributes) => [
            'frequency_period' => 'monthly',
        ]);
    }
}
