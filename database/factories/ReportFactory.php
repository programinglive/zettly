<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Report>
 */
class ReportFactory extends Factory
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
            'period_kind' => 'daily',
            'period_start' => today()->toDateString(),
            'period_end' => today()->toDateString(),
            'report_key' => 'daily:'.today()->toDateString().':'.today()->toDateString(),
            'content' => '# Daily Activity Summary',
            'generated_at' => now(),
        ];
    }
}
