<?php

namespace Tests\Feature;

use App\Console\Commands\SentryResolve;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class SentryResolveCommandTest extends TestCase
{
    private array $previousEnv = [];

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['SENTRY_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT'] as $key) {
            $this->previousEnv[$key] = $_ENV[$key] ?? null;
        }

        $this->setEnv('SENTRY_TOKEN', 'test-token');
        $this->setEnv('SENTRY_ORG', 'test-org');
        $this->setEnv('SENTRY_PROJECT', 'test-project');
    }

    protected function tearDown(): void
    {
        foreach (['SENTRY_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT'] as $key) {
            $previous = $this->previousEnv[$key];

            if ($previous === null) {
                putenv("{$key}=");
                unset($_ENV[$key], $_SERVER[$key]);
            } else {
                $this->setEnv($key, $previous);
            }
        }

        parent::tearDown();
    }

    public function test_short_identifier_is_resolved_via_lookup(): void
    {
        $history = [];

        $mock = new MockHandler([
            new Response(200, [], json_encode([
                [
                    'id' => '6927570568',
                    'shortId' => 'TODOAPP-2',
                ],
            ])),
            new Response(200, [], json_encode(['status' => 'resolved'])),
        ]);

        $stack = HandlerStack::create($mock);
        $stack->push(Middleware::history($history));

        $client = new Client([
            'handler' => $stack,
            'base_uri' => 'https://sentry.io/api/0/',
        ]);

        $this->registerCommandWith($client);

        $exitCode = Artisan::call('sentry:resolve', ['identifier' => ['TODOAPP-2']]);

        $this->assertSame(0, $exitCode);
        $this->assertCount(2, $history);

        $firstRequest = $history[0]['request'];
        $this->assertSame('GET', $firstRequest->getMethod());
        $this->assertSame('/api/0/projects/test-org/test-project/issues/', $firstRequest->getUri()->getPath());

        parse_str($firstRequest->getUri()->getQuery(), $query);
        $this->assertSame('TODOAPP-2', $query['query'] ?? null);
        $this->assertSame('1', $query['shortIdLookup'] ?? null);

        $secondRequest = $history[1]['request'];
        $this->assertSame('PUT', $secondRequest->getMethod());
        $this->assertSame('/api/0/issues/6927570568/', $secondRequest->getUri()->getPath());

        $output = Artisan::output();
        $this->assertStringContainsString('Resolved issue TODOAPP-2 (ID 6927570568).', $output);
        $this->assertStringContainsString('Done resolving issues.', $output);
    }

    public function test_warns_when_issue_not_found(): void
    {
        $history = [];

        $mock = new MockHandler([
            new Response(200, [], json_encode([])),
        ]);

        $stack = HandlerStack::create($mock);
        $stack->push(Middleware::history($history));

        $client = new Client([
            'handler' => $stack,
            'base_uri' => 'https://sentry.io/api/0/',
        ]);

        $this->registerCommandWith($client);

        $exitCode = Artisan::call('sentry:resolve', ['identifier' => ['TODOAPP-999']]);

        $this->assertSame(0, $exitCode);
        $this->assertCount(1, $history);

        $request = $history[0]['request'];
        $this->assertSame('GET', $request->getMethod());
        $this->assertSame('/api/0/projects/test-org/test-project/issues/', $request->getUri()->getPath());

        parse_str($request->getUri()->getQuery(), $query);
        $this->assertSame('TODOAPP-999', $query['query'] ?? null);

        $output = Artisan::output();
        $this->assertStringContainsString('No matching issue found for identifier TODOAPP-999.', $output);
        $this->assertStringContainsString('Done resolving issues.', $output);
    }

    private function setEnv(string $key, string $value): void
    {
        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }

    private function registerCommandWith(Client $client): void
    {
        $this->app->bind(SentryResolve::class, function ($app) use ($client) {
            $command = new SentryResolve($client);
            $command->setLaravel($app);

            return $command;
        });
    }
}
