<?php

namespace Database\Factories;

use App\Models\Todo;
use App\Models\TodoStatusEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TodoStatusEvent>
 */
class TodoStatusEventFactory extends Factory
{
    protected $model = TodoStatusEvent::class;

    public function definition(): array
    {
        $fromState = $this->faker->randomElement(['pending', 'completed']);
        $toState = $fromState === 'pending' ? 'completed' : 'pending';

        return [
            'todo_id' => Todo::factory(),
            'user_id' => User::factory(),
            'from_state' => $fromState,
            'to_state' => $toState,
            'reason' => $this->faker->sentence(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    public function forTodo(Todo $todo): self
    {
        return $this->state(fn () => ['todo_id' => $todo->id]);
    }

    public function byUser(User $user): self
    {
        return $this->state(fn () => ['user_id' => $user->id]);
    }

    public function transition(string $from, string $to): self
    {
        return $this->state(fn () => [
            'from_state' => $from,
            'to_state' => $to,
        ]);
    }
}
