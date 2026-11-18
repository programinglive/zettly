<?php

namespace Tests\Feature\Api;

use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WeeklyDigestApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_read_a_five_section_weekly_digest(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        $response = $this->getJson('/api/v1/reports/weekly-digest?date=2026-11-17');

        $response->assertOk()->assertJsonPath('success', true);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'period' => ['start', 'end', 'timezone'],
                'sections' => [
                    'completed_work' => ['label', 'provenance', 'status', 'items', 'message'],
                    'blocked_work' => ['label', 'provenance', 'status', 'items', 'message'],
                    'important_decisions' => ['label', 'provenance', 'status', 'items', 'message'],
                    'knowledge_captured' => ['label', 'provenance', 'status', 'items', 'message'],
                    'next_actions' => ['label', 'provenance', 'status', 'items', 'message'],
                ],
                'metrics' => ['tasks_completed', 'agent_active_minutes', 'machines', 'projects'],
                'data_quality' => ['undated_completions'],
            ],
        ]);
        $response->assertJsonPath('data.metrics.agent_active_minutes.value', 'Not measured');
        $response->assertJsonPath('data.metrics.machines.value', 'Not measured');
        $response->assertJsonPath('data.metrics.projects.value', 'Not measured');
    }

    public function test_guest_is_rejected(): void
    {
        $this->getJson('/api/v1/reports/weekly-digest')->assertUnauthorized();
    }

    public function test_token_without_cli_ability_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['other']);

        $this->getJson('/api/v1/reports/weekly-digest')->assertForbidden();
    }

    public function test_digest_is_scoped_to_the_authenticated_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        JournalEntry::factory()->for($other)->create([
            'kind' => JournalEntry::KIND_DECISION,
            'entry_date' => '2026-11-17',
            'content' => 'A private decision belonging to another user.',
        ]);
        Sanctum::actingAs($user, ['zettly:cli']);

        $this->getJson('/api/v1/reports/weekly-digest?date=2026-11-17')
            ->assertOk()
            ->assertJsonMissing(['title' => 'A private decision belonging to another user.']);
    }

    public function test_digest_writes_no_report_or_delivery_rows(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        $this->getJson('/api/v1/reports/weekly-digest')->assertOk();

        $this->assertSame(0, Report::count());
        $this->assertSame(0, ReportDelivery::count());
    }

    public function test_large_dataset_response_is_bounded_and_reports_truncation(): void
    {
        $user = User::factory()->create();
        Todo::factory()->for($user)->asTask()->count(80)->sequence(
            fn ($sequence) => ['title' => "Endpoint task {$sequence->index}", 'due_date' => '2026-11-19']
        )->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        $response = $this->getJson('/api/v1/reports/weekly-digest?date=2026-11-17')->assertOk();

        $response->assertJsonPath('data.sections.next_actions.total', 80);
        $response->assertJsonPath('data.sections.next_actions.shown', 50);
        $response->assertJsonPath('data.sections.next_actions.truncated', true);
        $this->assertCount(50, $response->json('data.sections.next_actions.items'));
        $this->assertLessThan(30000, strlen($response->getContent()));
    }

    public function test_legacy_reports_endpoint_still_works(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        Report::factory()->for($user)->create();

        $this->getJson('/api/v1/reports')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_large_dataset_across_all_sections_preserves_exact_totals_and_caps_at_50(): void
    {
        $user = User::factory()->create();
        $completedAt = now('Asia/Jakarta')->setDate(2026, 11, 17)->setTime(10, 0)->utc();

        Todo::factory()->for($user)->asTask()->count(65)->create([
            'is_completed' => true,
            'completed_at' => $completedAt,
        ]);

        JournalEntry::factory()->for($user)->count(60)->create([
            'kind' => JournalEntry::KIND_BLOCKER,
            'entry_date' => '2026-11-17',
        ]);

        JournalEntry::factory()->for($user)->count(55)->create([
            'kind' => JournalEntry::KIND_DECISION,
            'entry_date' => '2026-11-17',
        ]);

        Todo::factory()->for($user)->count(58)->create([
            'type' => Todo::TYPE_NOTE,
            'is_completed' => false,
            'completed_at' => null,
            'archived' => false,
            'created_at' => $completedAt,
            'updated_at' => $completedAt,
        ]);

        Sanctum::actingAs($user, ['zettly:cli']);

        $response = $this->getJson('/api/v1/reports/weekly-digest?date=2026-11-17')->assertOk();

        $response->assertJsonPath('data.metrics.tasks_completed.value', 65);
        $response->assertJsonPath('data.sections.completed_work.total', 65);
        $response->assertJsonPath('data.sections.completed_work.shown', 50);
        $response->assertJsonPath('data.sections.completed_work.truncated', true);
        $this->assertCount(50, $response->json('data.sections.completed_work.items'));

        $response->assertJsonPath('data.sections.blocked_work.total', 60);
        $response->assertJsonPath('data.sections.blocked_work.shown', 50);
        $response->assertJsonPath('data.sections.blocked_work.truncated', true);
        $this->assertCount(50, $response->json('data.sections.blocked_work.items'));

        $response->assertJsonPath('data.sections.important_decisions.total', 55);
        $response->assertJsonPath('data.sections.important_decisions.shown', 50);
        $response->assertJsonPath('data.sections.important_decisions.truncated', true);
        $this->assertCount(50, $response->json('data.sections.important_decisions.items'));

        $response->assertJsonPath('data.sections.knowledge_captured.total', 58);
        $response->assertJsonPath('data.sections.knowledge_captured.shown', 50);
        $response->assertJsonPath('data.sections.knowledge_captured.truncated', true);
        $this->assertCount(50, $response->json('data.sections.knowledge_captured.items'));
    }
}
