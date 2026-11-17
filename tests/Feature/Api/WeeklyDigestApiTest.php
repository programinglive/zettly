<?php

namespace Tests\Feature\Api;

use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\ReportDelivery;
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

    public function test_legacy_reports_endpoint_still_works(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        Report::factory()->for($user)->create();

        $this->getJson('/api/v1/reports')
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}
