<?php

namespace Database\Factories;

use App\Models\Focus;
use App\Models\FocusStatusEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FocusStatusEvent>
 */
class FocusStatusEventFactory extends Factory
{
    protected $model = FocusStatusEvent::class;

    public function definition(): array
    {
        return [
            'focus_id' => Focus::factory(),
            'user_id' => User::factory(),
            'action' => 'completed',
            'reason' => $this->faker->sentence(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    public function forFocus(Focus $focus): self
    {
        return $this->state(fn () => ['focus_id' => $focus->id]);
    }

    public function byUser(User $user): self
    {
        return $this->state(fn () => ['user_id' => $user->id]);
    }

    public function action(string $action): self
    {
        return $this->state(fn () => ['action' => $action]);
    }
}
