<?php

namespace App\Console\Commands;

use Illuminate\Broadcasting\Broadcasters\PusherBroadcaster;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Broadcast;

class TestPusher extends Command
{
    protected $signature = 'pusher:test {--detailed : Show detailed output}';

    protected $description = 'Test Pusher connection and configuration';

    public function handle()
    {
        $this->info('🔍 Testing Pusher Configuration...');
        $this->line('');

        // Check environment variables
        $this->checkEnvironmentVariables();

        // Check broadcasting configuration
        $this->checkBroadcastingConfig();

        // Test Pusher connection
        $this->testPusherConnection();

        // Test broadcasting
        $this->testBroadcasting();

        $this->line('');
        $this->info('✅ Pusher test completed!');
    }

    private function checkEnvironmentVariables()
    {
        $this->section('Environment Variables');

        $vars = [
            'BROADCAST_CONNECTION' => env('BROADCAST_CONNECTION'),
            'PUSHER_APP_ID' => env('PUSHER_APP_ID'),
            'PUSHER_APP_KEY' => env('PUSHER_APP_KEY'),
            'PUSHER_APP_SECRET' => env('PUSHER_APP_SECRET'),
            'PUSHER_APP_CLUSTER' => env('PUSHER_APP_CLUSTER'),
        ];

        foreach ($vars as $key => $value) {
            if ($value) {
                $this->info("  ✓ {$key}: ".($this->option('detailed') ? $value : '***SET***'));
            } else {
                $this->error("  ✗ {$key}: NOT SET");
            }
        }
        $this->line('');
    }

    private function checkBroadcastingConfig()
    {
        $this->section('Broadcasting Configuration');

        $connection = config('broadcasting.default');
        $this->info("  Default connection: {$connection}");

        $pusherConfig = config('broadcasting.connections.pusher');
        if ($pusherConfig) {
            $this->info('  ✓ Pusher configuration found');

            if ($this->option('detailed')) {
                $this->info("    App ID: {$pusherConfig['app_id']}");
                $this->info("    App Key: {$pusherConfig['key']}");
                $this->info('    App Secret: ***');
                $this->info("    Cluster: {$pusherConfig['options']['cluster']}");
                $this->info('    Host: '.($pusherConfig['options']['host'] ?? 'default'));
            }
        } else {
            $this->error('  ✗ Pusher configuration not found');
        }
        $this->line('');
    }

    private function testPusherConnection()
    {
        $this->section('Pusher Connection Test');

        try {
            $broadcaster = Broadcast::driver('pusher');

            if ($broadcaster instanceof PusherBroadcaster) {
                $pusher = $broadcaster->getPusher();

                // Test connection by getting channels list
                $channels = $pusher->get_channels();

                $this->info('  ✓ Pusher connection successful');
                $this->info('  ✓ Connected to cluster: '.config('broadcasting.connections.pusher.options.cluster'));

                if ($this->option('detailed')) {
                    $this->info('  ✓ Channels count: '.($channels->channels_count ?? 'N/A'));
                }
            } else {
                $this->error('  ✗ Pusher broadcaster not found');
            }
        } catch (\Exception $e) {
            $this->error('  ✗ Pusher connection failed');
            $this->error('    Error: '.$e->getMessage());

            if ($this->option('detailed')) {
                $this->error('    Trace: '.$e->getTraceAsString());
            }
        }
        $this->line('');
    }

    private function testBroadcasting()
    {
        $this->section('Broadcasting Test');

        try {
            $broadcaster = Broadcast::driver('pusher');

            // Test broadcasting to a test channel
            $testChannel = 'test-channel-'.time();
            $testEvent = 'TestEvent';
            $testData = [
                'message' => 'Test message from Artisan command',
                'timestamp' => now()->toISOString(),
                'test_id' => uniqid(),
            ];

            $broadcaster->broadcast([$testChannel], $testEvent, $testData);

            $this->info('  ✓ Test broadcast sent successfully');
            $this->info("  ✓ Channel: {$testChannel}");
            $this->info("  ✓ Event: {$testEvent}");

            if ($this->option('detailed')) {
                $this->info('  ✓ Data: '.json_encode($testData, JSON_PRETTY_PRINT));
            }

            // Test private channel
            $privateChannel = 'private-test-private-'.time();
            $broadcaster->broadcast([$privateChannel], 'PrivateTestEvent', $testData);

            $this->info('  ✓ Private channel broadcast sent');
            $this->info("  ✓ Private Channel: {$privateChannel}");

        } catch (\Exception $e) {
            $this->error('  ✗ Broadcasting test failed');
            $this->error('    Error: '.$e->getMessage());

            if ($this->option('detailed')) {
                $this->error('    Trace: '.$e->getTraceAsString());
            }
        }
        $this->line('');
    }

    private function section($title)
    {
        $this->info("📋 {$title}");
    }
}
