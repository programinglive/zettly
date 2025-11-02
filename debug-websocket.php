<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

// Test the broadcasting configuration
echo "=== WebSocket Debug Information ===\n";
echo 'Environment: '.config('app.env')."\n";
echo 'App Version: '.config('app.version')."\n";
echo 'Broadcast Driver: '.config('broadcasting.default')."\n";
echo 'Pusher Key: '.substr(config('broadcasting.connections.pusher.key') ?? '', 0, 8)."...\n";
echo 'Pusher App ID: '.config('broadcasting.connections.pusher.app_id')."\n";
echo 'Pusher Cluster: '.config('broadcasting.connections.pusher.options.cluster')."\n";

// Test channel authorization
echo "\n=== Testing Channel Authorization ===\n";

$socketId = 'test.socket.id';
$channelName = 'private-drawings.2';
$pusherKey = config('broadcasting.connections.pusher.key');
$pusherSecret = config('broadcasting.connections.pusher.secret');

if (! $pusherKey || ! $pusherSecret) {
    echo "ERROR: Pusher not configured\n";
    exit(1);
}

$stringToSign = $socketId.':'.$channelName;
$signature = hash_hmac('sha256', $stringToSign, $pusherSecret);
$authSignature = $pusherKey.':'.$signature;

$channelData = [
    'user_id' => 1,
    'user_info' => [
        'name' => 'test',
    ],
];

$response = [
    'auth' => $authSignature,
    'channel_data' => json_encode($channelData),
];

echo "Channel Name: $channelName\n";
echo "Socket ID: $socketId\n";
echo "String to Sign: $stringToSign\n";
echo "Generated Signature: $signature\n";
echo 'Auth Response: '.json_encode($response, JSON_PRETTY_PRINT)."\n";

// Test if this would be valid for Pusher
echo "\n=== Validation ===\n";
echo 'Channel data is JSON string: '.(is_string($response['channel_data']) ? 'YES' : 'NO')."\n";
echo 'Channel data valid JSON: '.(json_decode($response['channel_data']) !== null ? 'YES' : 'NO')."\n";

echo "\n=== Complete ===\n";
