<?php

namespace Tests\Feature\Ai;

use App\Services\Ai\KenariClient;
use App\Services\Ai\KenariConfigurationException;
use App\Services\Ai\KenariModelNotAllowedException;
use App\Services\Ai\KenariRequestException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class KenariClientTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('coding_agent.kenari_api_key', 'test-secret-kenari-key');
        config()->set('coding_agent.kenari_base_url', 'https://kenari.id/v1');
        config()->set('coding_agent.models', [
            'qwen3-5-397b-a17b:free',
            'north-mini-code:free',
            'paid-model-should-be-filtered',
        ]);
        config()->set('coding_agent.default_model', 'qwen3-5-397b-a17b:free');
        config()->set('coding_agent.kenari_retry_delay_ms', 0);
    }

    public function test_allowed_free_models_filters_out_non_free_entries(): void
    {
        $client = app(KenariClient::class);

        $this->assertSame([
            'qwen3-5-397b-a17b:free',
            'north-mini-code:free',
        ], $client->allowedFreeModels());
    }

    public function test_rejects_paid_or_unlisted_model_without_fallback(): void
    {
        Http::fake();
        $client = app(KenariClient::class);

        $this->expectException(KenariModelNotAllowedException::class);

        try {
            $client->chat([['role' => 'user', 'content' => 'Hello']], 'gpt-4o');
        } finally {
            Http::assertNothingSent();
        }
    }

    public function test_rejects_unlisted_free_model(): void
    {
        Http::fake();
        $client = app(KenariClient::class);

        $this->expectException(KenariModelNotAllowedException::class);

        try {
            $client->chat([['role' => 'user', 'content' => 'Hello']], 'unknown-model:free');
        } finally {
            Http::assertNothingSent();
        }
    }

    public function test_throws_configuration_exception_when_api_key_is_missing(): void
    {
        config()->set('coding_agent.kenari_api_key', null);
        $client = app(KenariClient::class);

        $this->expectException(KenariConfigurationException::class);
        $client->chat([['role' => 'user', 'content' => 'Hello']]);
    }

    public function test_does_not_retry_on_401_or_403(): void
    {
        Http::fake([
            'https://kenari.id/v1/chat/completions' => Http::sequence()
                ->push(['error' => ['message' => 'Unauthorized']], 401)
                ->push(['choices' => [['message' => ['content' => 'Should never reach']]]], 200),
        ]);

        $client = app(KenariClient::class);

        try {
            $client->chat([['role' => 'user', 'content' => 'Hello']]);
            $this->fail('Expected KenariRequestException was not thrown.');
        } catch (KenariRequestException $e) {
            $this->assertSame(401, $e->statusCode());
            $this->assertFalse($e->isRetryable());
        }

        Http::assertSentCount(1);
    }

    public function test_retries_on_429_and_5xx_with_same_free_model_and_succeeds(): void
    {
        Http::fake([
            'https://kenari.id/v1/chat/completions' => Http::sequence()
                ->push(['error' => 'rate limited'], 429)
                ->push(['error' => 'upstream error'], 503)
                ->push([
                    'choices' => [['message' => ['content' => 'Success after retry']]],
                    'usage' => ['total_tokens' => 42],
                ], 200),
        ]);

        $client = app(KenariClient::class);
        $result = $client->chat([['role' => 'user', 'content' => 'Hello']]);

        $this->assertSame('Success after retry', $result['content']);
        $this->assertSame('qwen3-5-397b-a17b:free', $result['model']);
        $this->assertSame(42, $result['usage']['total_tokens']);
        Http::assertSentCount(3);
        Http::assertSent(fn (Request $request) => $request['model'] === 'qwen3-5-397b-a17b:free');
    }

    public function test_chat_json_parses_fenced_json_and_throws_on_invalid_json(): void
    {
        Http::fake([
            'https://kenari.id/v1/chat/completions' => Http::sequence()
                ->push([
                    'choices' => [[
                        'message' => [
                            'content' => "```json\n{\"importance\":\"important\",\"urgency\":\"urgent\"}\n```",
                        ],
                    ]],
                ], 200)
                ->push([
                    'choices' => [[
                        'message' => [
                            'content' => 'not valid json at all',
                        ],
                    ]],
                ], 200),
        ]);

        $client = app(KenariClient::class);
        $valid = $client->chatJson([['role' => 'user', 'content' => 'Triage']]);

        $this->assertSame([
            'importance' => 'important',
            'urgency' => 'urgent',
        ], $valid['data']);

        $this->expectException(KenariRequestException::class);
        $client->chatJson([['role' => 'user', 'content' => 'Triage']]);
    }

    public function test_logs_safe_observability_metadata_without_exposing_api_key(): void
    {
        Log::spy();

        Http::fake([
            'https://kenari.id/v1/chat/completions' => Http::response([
                'choices' => [['message' => ['content' => 'OK']]],
            ], 200),
        ]);

        $client = app(KenariClient::class);
        $client->chat([['role' => 'user', 'content' => 'Hello']]);

        Log::shouldHaveReceived('info')
            ->once()
            ->withArgs(function (string $message, array $context) {
                $serialized = json_encode($context);

                return str_contains($message, 'Kenari')
                    && ($context['model'] ?? null) === 'qwen3-5-397b-a17b:free'
                    && ($context['status'] ?? null) === 200
                    && array_key_exists('latency_ms', $context)
                    && ! str_contains((string) $serialized, 'test-secret-kenari-key');
            });
    }
}
