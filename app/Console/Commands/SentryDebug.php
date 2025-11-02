<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SentryDebug extends Command
{
    protected $signature = 'sentry:debug';

    protected $description = 'Test Sentry configuration';

    public function handle()
    {
        $this->info('Testing Sentry configuration...');

        $token = env('SENTRY_TOKEN');
        $org = env('SENTRY_ORG');
        $project = env('SENTRY_PROJECT');

        $this->info('Token: '.($token ? substr($token, 0, 20).'...' : 'NOT SET'));
        $this->info('Org: '.($org ?? 'NOT SET'));
        $this->info('Project: '.($project ?? 'NOT SET'));

        if ($token && $org && $project) {
            $this->info('✅ Configuration looks good!');
        } else {
            $this->error('❌ Missing configuration');

            return 1;
        }

        return 0;
    }
}
