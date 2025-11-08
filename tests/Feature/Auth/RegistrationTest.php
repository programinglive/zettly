<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use App\Mail\TodoCreated;
use App\Mail\UserWelcome;
use App\Notifications\QueuedVerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        Notification::fake();
        Mail::fake();

        $response = $this->withSession(['_token' => 'test-token'])
            ->post('/register', [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'password' => 'password',
                'password_confirmation' => 'password',
                '_token' => 'test-token',
            ]);

        $this->assertAuthenticated();

        /** @var User $user */
        $user = User::where('email', 'test@example.com')->firstOrFail();
        $this->assertSame(UserRole::USER->value, $user->role?->value ?? $user->role);
        $this->assertNull($user->email_verified_at);
        Notification::assertSentToTimes($user, QueuedVerifyEmail::class, 1);
        Mail::assertQueued(UserWelcome::class, function ($mailable) use ($user) {
            return $mailable->hasTo($user->email);
        });
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_registration_sends_verification_email(): void
    {
        Notification::fake();
        Mail::fake();

        $this->withSession(['_token' => 'test-token'])
            ->post('/register', [
                'name' => 'Another User',
                'email' => 'another@example.com',
                'password' => 'password',
                'password_confirmation' => 'password',
                '_token' => 'test-token',
            ]);

        /** @var User $user */
        $user = User::where('email', 'another@example.com')->firstOrFail();

        $this->assertNull($user->email_verified_at);
        Notification::assertSentToTimes($user, QueuedVerifyEmail::class, 1);
        Mail::assertQueued(UserWelcome::class, function ($mailable) use ($user) {
            return $mailable->hasTo($user->email);
        });
    }
}
