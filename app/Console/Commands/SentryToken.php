<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SentryToken extends Command
{
    protected $signature = 'sentry:token {token?}';
    protected $description = 'Alias for sentry:test-token command';

    public function handle()
    {
        $this->info('This command has been renamed to "sentry:test-token"');
        $this->info('Please use: php artisan sentry:test-token <token>');
        
        if ($token = $this->argument('token')) {
            return $this->call('sentry:test-token', ['token' => $token]);
        }
        
        return 0;
    }
}
