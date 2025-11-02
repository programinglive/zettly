<?php

namespace App\Console\Commands;

use GuzzleHttp\Client;
use Illuminate\Console\Command;

class SentryTestToken extends Command
{
    protected $signature = 'sentry:test-token {token}';

    protected $description = 'Test a specific Sentry token';

    public function handle()
    {
        $token = $this->argument('token');

        $this->info('Testing Sentry token...');
        $this->info('Token: '.substr($token, 0, 20).'...');

        $client = new Client([
            'base_uri' => 'https://sentry.io/api/0/',
            'headers' => ['Authorization' => "Bearer {$token}"],
        ]);

        try {
            $res = $client->get('auth/');
            $auth = json_decode($res->getBody()->getContents(), true);

            $this->info('✅ Token is valid');
            $this->info('  User: '.($auth['user']['email'] ?? 'Unknown'));
            $this->info('  Scopes: '.implode(', ', $auth['scopes'] ?? []));

            $requiredScopes = ['project:read', 'event:read'];
            $hasRequired = ! array_diff($requiredScopes, $auth['scopes'] ?? []);

            if (! $hasRequired) {
                $this->error('❌ Missing required scopes');
            } else {
                $this->info('✅ Token has required scopes');
            }
        } catch (\Exception $e) {
            $this->error('❌ Invalid token: '.$e->getMessage());

            return 1;
        }

        return 0;
    }
}
