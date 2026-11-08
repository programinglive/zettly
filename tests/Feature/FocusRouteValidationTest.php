<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FocusRouteValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_numeric_focus_id_returns_404_without_executing_database_query(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        DB::flushQueryLog();
        DB::enableQueryLog();

        // Testing the exact URL path reported in Sentry issue 7809625290
        $response = $this->actingAs($user)->postJson('/api/v1/focus/undefined/complete', [
            'reason' => 'Completed task',
        ]);

        $response->assertStatus(404);

        // Ensure no focus database queries were executed looking for "undefined"
        $queries = DB::getQueryLog();
        $focusQueries = array_filter($queries, function ($q) {
            return str_contains(strtolower($q['query']), 'foci')
                || str_contains(strtolower($q['query']), 'undefined');
        });

        $this->assertEmpty($focusQueries, 'Router should reject non-numeric focus ID before database query');
    }

    public function test_all_focus_endpoints_reject_non_numeric_ids(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $invalidEndpoints = [
            ['method' => 'get', 'url' => '/api/v1/focus/undefined'],
            ['method' => 'put', 'url' => '/api/v1/focus/undefined'],
            ['method' => 'delete', 'url' => '/api/v1/focus/undefined'],
            ['method' => 'post', 'url' => '/api/v1/focus/undefined/complete'],
            ['method' => 'put', 'url' => '/api/focus/undefined'],
            ['method' => 'delete', 'url' => '/api/focus/undefined'],
            ['method' => 'post', 'url' => '/api/focus/undefined/complete'],
            ['method' => 'put', 'url' => '/focus/undefined'],
            ['method' => 'delete', 'url' => '/focus/undefined'],
            ['method' => 'post', 'url' => '/focus/undefined/complete'],
        ];

        foreach ($invalidEndpoints as $endpoint) {
            $response = $this->actingAs($user)->json($endpoint['method'], $endpoint['url']);
            $this->assertSame(
                404,
                $response->status(),
                "Endpoint {$endpoint['method']} {$endpoint['url']} must return 404 for non-numeric ID"
            );
        }
    }

    public function test_valid_numeric_focus_id_routes_properly(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $focus = \App\Models\Focus::factory()->create([
            'user_id' => $user->id,
            'started_at' => now(),
            'completed_at' => null,
        ]);

        $response = $this->actingAs($user)->postJson("/api/v1/focus/{$focus->id}/complete", [
            'reason' => 'Finished successfully',
        ]);

        $response->assertStatus(200);
        $this->assertNotNull($focus->fresh()->completed_at);
    }
}
