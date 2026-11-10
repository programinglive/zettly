<?php

namespace Database\Factories;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<CodingAgentJob> */
class CodingAgentJobFactory extends Factory
{
    protected $model = CodingAgentJob::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'todo_id' => Todo::factory()->asTask(),
            'repository' => 'zettly',
            'instruction' => 'Investigate a bug',
            'client_request_id' => (string) Str::uuid(),
        ];
    }
}
