<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CodingAgentPromptTest extends TestCase
{
    use RefreshDatabase;

    private function setupOwner(): array
    {
        $owner = User::factory()->create(['email' => 'mahatma.mahardhika@programinglive.com']);
        config()->set('coding_agent.enabled', true);
        config()->set('coding_agent.owner_user_id', $owner->id);
        config()->set('coding_agent.owner_email', $owner->email);
        config()->set('coding_agent.kenari_api_key', 'test-kenari-key');
        config()->set('coding_agent.kenari_base_url', 'https://kenari.id/v1');

        $todo = Todo::factory()->asTask()->create([
            'user_id' => $owner->id,
            'title' => 'Add CSV export to ReportController',
            'description' => 'Users should be able to download reports as CSV files with date filtering.',
        ]);

        return [$owner, $todo];
    }

    public function test_owner_can_generate_prompt_with_todo_context(): void
    {
        [$owner, $todo] = $this->setupOwner();

        Http::fake([
            'https://kenari.id/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => "## Goal\nImplement CSV export in ReportController.\n\n## Requirements\n- Add exportCsv method.\n\n## Testing\n- Write unit test for CSV formatting.",
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->actingAs($owner)->postJson('/agent/generate-prompt', [
            'todo_id' => $todo->id,
            'instruction' => '',
            'repository' => 'zettly',
            'model' => 'agnes-3-0-flash:free',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['prompt']);
        $this->assertStringContainsString('Implement CSV export', $response->json('prompt'));

        Http::assertSent(function ($request) {
            return $request->url() === 'https://kenari.id/v1/chat/completions'
                && $request->hasHeader('Authorization', 'Bearer test-kenari-key')
                && str_contains($request['messages'][1]['content'], 'Add CSV export to ReportController');
        });
    }

    public function test_non_owner_is_forbidden_from_generating_prompt(): void
    {
        [$owner, $todo] = $this->setupOwner();
        $otherUser = User::factory()->create();

        $this->actingAs($otherUser)->postJson('/agent/generate-prompt', [
            'todo_id' => $todo->id,
        ])->assertForbidden();
    }

    public function test_missing_api_key_returns_service_unavailable(): void
    {
        [$owner, $todo] = $this->setupOwner();
        config()->set('coding_agent.kenari_api_key', null);

        $response = $this->actingAs($owner)->postJson('/agent/generate-prompt', [
            'todo_id' => $todo->id,
        ]);

        $response->assertStatus(503);
        $response->assertJsonStructure(['error']);
    }
}
