<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Todo>
 */
class TodoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(['todo', 'note']);
        $isCompleted = $type === 'note' ? false : fake()->boolean(30);

        return [
            'user_id' => \App\Models\User::factory(),
            'title' => fake()->sentence(),
            'description' => fake()->optional()->paragraph(),
            'type' => $type,
            'priority' => $type === 'note' ? null : fake()->randomElement(['low', 'medium', 'high', 'urgent']),
            'importance' => $type === 'note' ? null : fake()->randomElement(['low', 'high']),
            'is_completed' => $isCompleted,
            'completed_at' => function (array $attributes) use ($isCompleted) {
                return $isCompleted ? fake()->dateTimeBetween('-1 month', 'now') : null;
            },
        ];
    }

    public function asTask(): self
    {
        return $this->state(fn () => [
            'type' => 'todo',
            'priority' => fake()->randomElement(['low', 'medium', 'high', 'urgent']),
        ]);
    }

    public function asNote(): self
    {
        return $this->state(fn () => [
            'type' => 'note',
            'priority' => null,
            'is_completed' => false,
            'completed_at' => null,
        ]);
    }
}
