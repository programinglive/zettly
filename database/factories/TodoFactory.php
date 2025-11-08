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

        $priority = null;
        $importance = null;
        $dueDate = null;

        if ($type === 'todo') {
            $priority = fake()->randomElement(['not_urgent', 'urgent']);
            $importance = fake()->randomElement(['not_important', 'important']);
            $dueDate = fake()->optional()->dateTimeBetween('now', '+2 months');
        }

        if ($isCompleted) {
            $priority = null;
            $importance = null;
            $dueDate = $dueDate ?? fake()->optional()->dateTimeBetween('-1 month', 'now');
        }

        return [
            'user_id' => \App\Models\User::factory(),
            'title' => fake()->sentence(),
            'description' => fake()->optional()->paragraph(),
            'type' => $type,
            'priority' => $priority,
            'importance' => $importance,
            'is_completed' => $isCompleted,
            'completed_at' => function (array $attributes) use ($isCompleted) {
                return $isCompleted ? fake()->dateTimeBetween('-1 month', 'now') : null;
            },
            'due_date' => isset($dueDate) ? $dueDate->format('Y-m-d') : null,
        ];
    }

    public function asTask(): self
    {
        return $this->state(fn () => [
            'type' => 'todo',
            'priority' => fake()->randomElement(['not_urgent', 'urgent']),
            'importance' => fake()->randomElement(['not_important', 'important']),
            'is_completed' => false,
            'completed_at' => null,
        ]);
    }

    public function asNote(): self
    {
        return $this->state(fn () => [
            'type' => 'note',
            'priority' => null,
            'importance' => null,
            'is_completed' => false,
            'completed_at' => null,
        ]);
    }
}
