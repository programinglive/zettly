<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GraphPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_graph_page_is_reachable(): void
    {
        $user = User::factory()->create();

        config([
            'services.graph.api_url' => '/graph-api',
            'services.graph.ws_url' => 'wss://example.test/graph-ws',
        ]);

        $this->actingAs($user)
            ->get('/graph')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Graph/Index')
                ->where('graphServiceUrl', '/graph-api')
                ->where('wsUrl', 'wss://example.test/graph-ws')
            );
    }

    public function test_it_falls_back_to_the_service_url_when_the_proxy_url_is_not_configured(): void
    {
        // GRAPH_API_URL is optional, but config() returns null for a key that exists
        // with a null value — the default argument never applies. The page used to
        // receive graphServiceUrl = null and requested "null/graph".
        $user = User::factory()->create();

        config([
            'services.graph.api_url' => null,
            'services.graph.ws_url' => null,
            'services.graph.url' => 'http://localhost:3001',
        ]);

        $this->actingAs($user)
            ->get('/graph')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('graphServiceUrl', 'http://localhost:3001')
                ->where('wsUrl', 'ws://localhost:3001')
            );
    }

    public function test_it_derives_a_secure_websocket_url_from_an_https_service(): void
    {
        // str_replace('http://', 'ws://') left https:// untouched, so the browser
        // was handed an https URL for `new WebSocket()`.
        $user = User::factory()->create();

        config([
            'services.graph.api_url' => null,
            'services.graph.ws_url' => null,
            'services.graph.url' => 'https://graph.example.test',
        ]);

        $this->actingAs($user)
            ->get('/graph')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('wsUrl', 'wss://graph.example.test')
            );
    }

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get('/graph')->assertRedirect('/login');
    }
}