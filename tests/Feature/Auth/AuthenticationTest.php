<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create();

        $response = $this->withSession(['_token' => 'test-token'])
            ->post('/login', [
                'email' => $user->email,
                'password' => 'password',
                '_token' => 'test-token',
            ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->withSession(['_token' => 'test-token'])
            ->post('/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
                '_token' => 'test-token',
            ]);

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'test-token'])
            ->post('/logout', ['_token' => 'test-token']);

        $this->assertGuest();
        $response->assertRedirect('/');
    }

    public function test_get_logout_signs_the_user_out_instead_of_returning_405(): void
    {
        // /logout was POST-only, so a browser that navigated to it got Symfony's
        // raw "An Error Occurred: Method Not Allowed" page and stayed signed in.
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }

    public function test_get_logout_while_signed_out_redirects_to_login(): void
    {
        $this->get('/logout')->assertRedirect('/login');
    }
}
