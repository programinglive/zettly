<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use JsonException;

/**
 * Shared client for Kenari.ID OpenAI-compatible chat completions.
 *
 * Enforces the configured :free model allowlist, retry/backoff policy,
 * structured JSON decoding, and secret-free observability logging.
 */
class KenariClient
{
    /**
     * Return all configured models that strictly satisfy the :free suffix policy.
     *
     * @return array<int, string>
     */
    public function allowedFreeModels(): array
    {
        $configured = config('coding_agent.models', []);
        if (! is_array($configured)) {
            return [];
        }

        $allowed = [];
        foreach ($configured as $model) {
            if (is_string($model)) {
                $trimmed = trim($model);
                if ($trimmed !== '' && str_ends_with($trimmed, ':free')) {
                    $allowed[] = $trimmed;
                }
            }
        }

        return array_values(array_unique($allowed));
    }

    /**
     * Resolve and validate the requested model against the free-model allowlist.
     *
     * Never falls back to a paid model.
     */
    public function resolveModel(?string $model = null): string
    {
        $allowed = $this->allowedFreeModels();
        if ($allowed === []) {
            throw new KenariConfigurationException('No :free Kenari models are configured in coding_agent.models.');
        }

        $candidate = $model !== null ? trim($model) : '';
        if ($candidate === '') {
            $default = trim((string) config('coding_agent.default_model', ''));
            $candidate = ($default !== '' && in_array($default, $allowed, true))
                ? $default
                : $allowed[0];
        }

        if (! str_ends_with($candidate, ':free') || ! in_array($candidate, $allowed, true)) {
            throw new KenariModelNotAllowedException("Model '{$candidate}' is not in the allowed :free Kenari model list.");
        }

        return $candidate;
    }

    /**
     * Send a chat completion request to Kenari.ID using an allowed :free model.
     *
     * @param  array<int, array{role: string, content: string}>  $messages
     * @param  array<string, mixed>  $options
     * @return array{content: string, model: string, latency_ms: int, usage: array<string, mixed>|null}
     */
    public function chat(array $messages, ?string $model = null, array $options = []): array
    {
        $apiKey = trim((string) config('coding_agent.kenari_api_key', ''));
        if ($apiKey === '') {
            throw new KenariConfigurationException('Kenari API key is not configured in CODING_AGENT_KENARI_API_KEY.');
        }

        $resolvedModel = $this->resolveModel($model);
        $baseUrl = rtrim((string) config('coding_agent.kenari_base_url', 'https://kenari.id/v1'), '/');
        $timeout = max(1, (int) ($options['timeout'] ?? config('coding_agent.kenari_timeout_seconds', 30)));
        $maxRetries = max(0, (int) ($options['max_retries'] ?? config('coding_agent.kenari_max_retries', 2)));
        $retryDelayMs = max(0, (int) ($options['retry_delay_ms'] ?? config('coding_agent.kenari_retry_delay_ms', 250)));

        $payload = [
            'model' => $resolvedModel,
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? 0.4,
        ];

        if (isset($options['max_tokens'])) {
            $payload['max_tokens'] = (int) $options['max_tokens'];
        }

        $attempts = $maxRetries + 1;
        $lastException = null;

        for ($attempt = 1; $attempt <= $attempts; $attempt++) {
            $startedAt = microtime(true);

            try {
                $response = Http::timeout($timeout)
                    ->withToken($apiKey)
                    ->post("{$baseUrl}/chat/completions", $payload);

                $latencyMs = (int) round((microtime(true) - $startedAt) * 1000);
                $status = $response->status();

                if ($response->successful()) {
                    $content = trim((string) $response->json('choices.0.message.content', ''));
                    if ($content === '') {
                        Log::warning('Kenari chat completion returned empty content', [
                            'model' => $resolvedModel,
                            'status' => $status,
                            'latency_ms' => $latencyMs,
                            'attempt' => $attempt,
                        ]);

                        throw new KenariRequestException('AI provider returned an empty response.', $status, false);
                    }

                    Log::info('Kenari chat completion succeeded', [
                        'model' => $resolvedModel,
                        'status' => $status,
                        'latency_ms' => $latencyMs,
                        'attempt' => $attempt,
                    ]);

                    return [
                        'content' => $content,
                        'model' => $resolvedModel,
                        'latency_ms' => $latencyMs,
                        'usage' => is_array($response->json('usage')) ? $response->json('usage') : null,
                    ];
                }

                $retryable = $status === 429 || $status >= 500;

                Log::warning('Kenari chat completion failed', [
                    'model' => $resolvedModel,
                    'status' => $status,
                    'latency_ms' => $latencyMs,
                    'attempt' => $attempt,
                    'retryable' => $retryable,
                ]);

                if (! $retryable || $attempt === $attempts) {
                    throw new KenariRequestException(
                        "Kenari request failed with HTTP {$status}.",
                        $status,
                        $retryable
                    );
                }
            } catch (ConnectionException $e) {
                $latencyMs = (int) round((microtime(true) - $startedAt) * 1000);

                Log::warning('Kenari chat completion connection error', [
                    'model' => $resolvedModel,
                    'latency_ms' => $latencyMs,
                    'attempt' => $attempt,
                    'error' => $e->getMessage(),
                ]);

                $lastException = new KenariRequestException(
                    'Failed to connect to Kenari provider: ' . $e->getMessage(),
                    null,
                    true,
                    $e
                );

                if ($attempt === $attempts) {
                    throw $lastException;
                }
            }

            if ($retryDelayMs > 0) {
                usleep(($retryDelayMs * (2 ** ($attempt - 1))) * 1000);
            }
        }

        throw $lastException ?? new KenariRequestException('Kenari request failed after retries.');
    }

    /**
     * Send a chat completion request and decode a structured JSON object response.
     *
     * @param  array<int, array{role: string, content: string}>  $messages
     * @param  array<string, mixed>  $options
     * @return array{data: array<string, mixed>, model: string, latency_ms: int, usage: array<string, mixed>|null}
     */
    public function chatJson(array $messages, ?string $model = null, array $options = []): array
    {
        $result = $this->chat($messages, $model, $options);
        $raw = trim($result['content']);

        if (preg_match('/^```(?:json)?\s*(.*?)\s*```$/is', $raw, $matches) === 1) {
            $raw = trim($matches[1]);
        }

        try {
            $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new KenariRequestException('AI provider returned invalid JSON payload.', null, false, $e);
        }

        if (! is_array($decoded)) {
            throw new KenariRequestException('AI provider JSON payload must decode to an array/object.');
        }

        return [
            'data' => $decoded,
            'model' => $result['model'],
            'latency_ms' => $result['latency_ms'],
            'usage' => $result['usage'],
        ];
    }
}
