<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\BroadcastDebugController;

Route::get('/test-broadcasting', [BroadcastDebugController::class, 'index']);

Route::post('/test-broadcasting-auth', [BroadcastDebugController::class, 'testAuth'])->middleware(['web', 'auth']);

Route::post('/test-broadcasting-debug', [BroadcastDebugController::class, 'debug'])->middleware(['web']);

Route::post('/test-broadcasting-simulate', [BroadcastDebugController::class, 'simulateAuth'])->middleware(['web', 'auth']);

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
    
    // Simulate successful auth response
    return response()->json([
        'auth' => 'test-auth-signature',
        'channel_data' => [
            'user_id' => auth()->id(),
            'user_info' => [
                'name' => auth()->user()->name,
            ]
        ]
    ]);
})->middleware(['web', 'auth']);
