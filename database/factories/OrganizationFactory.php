<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Organization>
 */
class OrganizationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = $this->faker->company();

        return [
            'created_by' => User::factory(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(6),
            'description' => $this->faker->optional()->sentence(),
            'logo_url' => $this->faker->optional()->url(),
        ];
    }
}
