<?php

namespace Database\Factories;

use App\Models\Drawing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Drawing>
 */
class DrawingFactory extends Factory
{
    protected $model = Drawing::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => $this->faker->sentence(3),
            'document' => [
                'schema' => [
                    'version' => 1,
                ],
                'store' => [
                    'shape' => [],
                    'instance' => [],
                    'camera' => [],
                    'page' => [],
                    'page_state' => [],
                    'asset' => [],
                ],
            ],
        ];
    }
}
