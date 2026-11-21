<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginSessionHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_behind_https_load_balancer_persists_session_and_redirects_to_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this->withServerVariables([
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_X_FORWARDED_FOR' => '203.0.113.42',
            'REMOTE_ADDR' => '10.184.0.1',
        ])->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_service_worker_does_not_cache_auth_or_inertia_navigation(): void
    {
        $sw = file_get_contents(public_path('sw.js'));

        $this->assertIsString($sw);
        $this->assertStringContainsString('zettly-cache-v2', $sw);
        $this->assertStringContainsString("request.mode === 'navigate'", $sw);
        $this->assertStringContainsString("request.headers.get('X-Inertia') === 'true'", $sw);
        $this->assertStringContainsString("url.pathname.startsWith('/login')", $sw);
    }

    public function test_frontend_bootstrap_does_not_freeze_meta_csrf_header_on_axios(): void
    {
        $bootstrap = file_get_contents(resource_path('js/bootstrap.js'));

        $this->assertIsString($bootstrap);
        $this->assertStringNotContainsString("defaults.headers.common['X-CSRF-TOKEN']", $bootstrap);
    }
}
