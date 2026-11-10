<?php

namespace Tests\Feature;

use App\Models\CodingAgentJob;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodingAgentJobSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_links_to_owners_personal_todo(): void
    {
        $owner = User::factory()->create();
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);

        $job = CodingAgentJob::create([
            'user_id' => $owner->id,
            'todo_id' => $todo->id,
            'repository' => 'zettly',
            'instruction' => 'Fix the login bug',
            'client_request_id' => 'request-1',
        ]);

        $this->assertSame('queued', $job->fresh()->status);
        $this->assertSame($todo->id, $job->fresh()->todo->id);
    }

    public function test_client_request_id_is_unique_per_owner(): void
    {
        $owner = User::factory()->create();
        $todo = Todo::factory()->asTask()->create(['user_id' => $owner->id]);
        $data = [
            'user_id' => $owner->id,
            'todo_id' => $todo->id,
            'repository' => 'zettly',
            'instruction' => 'Fix the login bug',
            'client_request_id' => 'request-1',
        ];
        CodingAgentJob::create($data);

        $this->expectException(QueryException::class);
        CodingAgentJob::create($data);
    }
}
