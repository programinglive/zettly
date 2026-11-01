<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\JournalEntry>
 */
class JournalEntryFactory extends Factory
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
            'entry_date' => today()->toDateString(),
            'kind' => 'activity',
            'content' => fake()->paragraph(),
            'source' => 'manual',
            'todo_id' => null,
        ];
    }
}
