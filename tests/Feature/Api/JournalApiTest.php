<?php

namespace Tests\Feature\Api;

use App\Models\JournalEntry;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class JournalApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_journal_entry_and_redacts_secrets(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        $this->postJson('/api/v1/journal/entries', [
            'entry_date' => '2026-11-01',
            'kind' => 'activity',
            'content' => 'Rotated the webhook: https://discord.com/api/webhooks/1/secret',
            'source' => 'codex',
        ])->assertCreated();

        $entry = JournalEntry::firstOrFail();
        $this->assertSame($user->id, $entry->user_id);
        $this->assertStringNotContainsString('secret', $entry->content);
    }

    public function test_it_rejects_an_unknown_kind(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['zettly:cli']);

        $this->postJson('/api/v1/journal/entries', [
            'entry_date' => '2026-11-01',
            'kind' => 'gossip',
            'content' => 'x',
        ])->assertStatus(422);
    }

    public function test_it_rejects_a_todo_owned_by_another_user(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        $foreignTodo = Todo::factory()->asTask()->create();

        $this->postJson('/api/v1/journal/entries', [
            'entry_date' => '2026-11-01',
            'kind' => 'handoff',
            'content' => 'x',
            'todo_id' => $foreignTodo->id,
        ])->assertStatus(422);
    }

    public function test_it_filters_by_date(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        JournalEntry::factory()->create(['user_id' => $user->id, 'entry_date' => '2026-10-31']);
        JournalEntry::factory()->create(['user_id' => $user->id, 'entry_date' => '2026-11-01']);

        $response = $this->getJson('/api/v1/journal/entries?date=2026-11-01');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }
}
