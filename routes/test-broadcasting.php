<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\BroadcastDebugController;

Route::get('/test-broadcasting', [BroadcastDebugController::class, 'index']);

Route::post('/test-broadcasting-auth', [BroadcastDebugController::class, 'testAuth'])->middleware(['web', 'auth']);

Route::post('/test-broadcasting-debug', [BroadcastDebugController::class, 'debug'])->middleware(['web']);

Route::post('/test-broadcasting-simulate', [BroadcastDebugController::class, 'simulateAuth'])->middleware(['web', 'auth']);

// Simple test route for debugging auth responses (no conflicts with Laravel's default)
Route::post('/test-broadcasting-auth-simple', function (Request $request) {
    $channelName = $request->input('channel_name');
    $socketId = $request->input('socket_id');
    
    \Log::info('Test broadcast auth', [
        'channel_name' => $channelName,
        'socket_id' => $socketId,
        'user_authenticated' => auth()->check(),
        'user_id' => auth()->id(),
    ]);
    
    if (!auth()->check()) {
        return response()->json([
            'error' => 'User not authenticated',
            'auth' => false
        ], 401);
    }
    
    // Get Pusher configuration
    $pusherKey = config('broadcasting.connections.pusher.key');
    $pusherSecret = config('broadcasting.connections.pusher.secret');
    
    if (!$pusherKey || !$pusherSecret) {
        return response()->json(['error' => 'Pusher not configured'], 500);
    }

    $stringToSign = $socketId . ':' . $channelName;
    $signature = hash_hmac('sha256', $stringToSign, $pusherSecret);
    $authSignature = $pusherKey . ':' . $signature;

    $channelData = [
        'user_id' => auth()->id(),
        'user_info' => [
            'name' => auth()->user()->name,
        ]
    ];

    return response()->json([
        'auth' => $authSignature,
        'channel_data' => json_encode($channelData)
    ]);
})->middleware(['web', 'auth']);

// Original simple test routes
Route::get('/test-broadcasting-simple', function () {
    return response()->json([
        'broadcast_driver' => config('broadcasting.default'),
        'pusher_configured' => !empty(config('broadcasting.connections.pusher.key')),
        'pusher_key' => config('broadcasting.connections.pusher.key') ? substr(config('broadcasting.connections.pusher.key'), 0, 8) . '...' : null,
        'app_version' => config('app.version', 'unknown'),
        'laravel_version' => app()->version(),
    ]);
});
