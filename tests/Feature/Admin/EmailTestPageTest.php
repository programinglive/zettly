<?php

namespace Tests\Feature\Admin;

use App\Mail\TestEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class EmailTestPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_send_test_email(): void
    {
        Mail::fake();

        $superAdmin = User::factory()->superAdmin()->create();

        $response = $this
            ->actingAs($superAdmin)
            ->post(route('test.email.send'), [
                'recipient' => 'test@example.com',
                'subject' => 'Testing Email',
                'message' => 'Hello world',
            ]);

        $response->assertRedirect(route('test.email'));
        $response->assertSessionHas('success');

        Mail::assertSent(TestEmail::class, function (TestEmail $mail) {
            return $mail->hasTo('test@example.com')
                && $mail->subjectLine === 'Testing Email'
                && $mail->body === 'Hello world';
        });
    }

    public function test_super_admin_sees_error_when_email_send_fails(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        Mail::shouldReceive('to')
            ->once()
            ->with('test@example.com')
            ->andThrow(new TransportException('Expected response code "235" but got code "535"'));

        $this
            ->actingAs($superAdmin)
            ->from(route('test.email'))
            ->post(route('test.email.send'), [
                'recipient' => 'test@example.com',
                'subject' => 'Testing Email',
                'message' => 'Hello world',
            ])
            ->assertRedirect(route('test.email'))
            ->assertSessionHas('error')
            ->assertSessionHasInput([
                'recipient' => 'test@example.com',
                'subject' => 'Testing Email',
                'message' => 'Hello world',
            ]);
    }

    public function test_non_super_admin_cannot_access_email_test_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('test.email'))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('test.email.send'), [
                'recipient' => 'test@example.com',
                'subject' => 'Testing Email',
                'message' => 'Hello world',
            ])
            ->assertForbidden();
    }
}
