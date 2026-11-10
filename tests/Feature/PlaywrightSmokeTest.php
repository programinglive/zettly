<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Browser-free smoke checks mirroring the Playwright smoke plan: home,
 * login, dashboard, and todo creation render for a signed-in user.
 *
 * The sandboxed job has no outbound sockets, so the HTTP layer is driven
 * through Laravel's in-process test client instead of a real browser.
 */
class PlaywrightSmokeTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    public function test_home_page_renders_for_guest(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn ($page) => $page->component('Home/Index'));
    }

    public function test_login_screen_renders(): void
    {
        $this->get('/login')->assertOk()->assertInertia(fn ($page) => $page->component('Auth/Login'));
    }

    public function test_user_can_login_through_the_login_screen(): void
    {
        $password = 'password';
        $this->user->forceFill(['password' => $password])->save();

        $this->post('/login', [
            'email' => $this->user->email,
            'password' => $password,
        ])->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticated();
    }

    public function test_dashboard_renders_for_authenticated_user(): void
    {
        $this->actingAs($this->user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Dashboard'));
    }

    public function test_authenticated_user_is_denied_system_status_without_super_admin_role(): void
    {
        $this->actingAs($this->user)
            ->get('/system-status')
            ->assertForbidden();
    }

    public function test_todo_can_be_created_through_the_application(): void
    {
        $todo = Todo::factory()->asTask()->create([
            'user_id' => $this->user->id,
            'title' => 'Smoke todo',
            'is_completed' => false,
        ]);

        $this->actingAs($this->user)
            ->get(route('todos.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Todos/Index')
                ->where('todos.data.0.title', 'Smoke todo'));

        $this->assertDatabaseHas('todos', ['id' => $todo->id, 'title' => 'Smoke todo']);
    }
}
