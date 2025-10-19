<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\User;
use Exception;
use Gemini\Exceptions\TransporterException;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Psr\Http\Client\ClientExceptionInterface;
use Tests\TestCase;

class GeminiChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_chat_endpoint_returns_gateway_timeout_on_gemini_timeout(): void
    {
        $user = User::factory()->create();
        Todo::factory()->asTask()->create(['user_id' => $user->id]);

        $clientException = new class ('timeout') extends Exception implements ClientExceptionInterface {
        };

        Gemini::fake([
            new TransporterException($clientException),
        ]);

        $response = $this->actingAs($user)->postJson(route('gemini.chat'), [
            'message' => 'How can I organize my tasks?',
        ]);

        $response->assertStatus(504);
        $response->assertJson([
            'error' => 'Gemini service timed out. Please try again later.',
        ]);
    }
}
