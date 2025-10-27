<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\BroadcastDebugController;

Route::get('/test-broadcasting', [BroadcastDebugController::class, 'index']);

Route::post('/test-broadcasting-auth', [BroadcastDebugController::class, 'testAuth'])->middleware(['web', 'auth']);

Route::post('/test-broadcasting-debug', [BroadcastDebugController::class, 'debug'])->middleware(['web']);

Route::post('/test-broadcasting-simulate', [BroadcastDebugController::class, 'simulateAuth'])->middleware(['web', 'auth']);

// Custom broadcasting auth route - properly configured
Route::post('/broadcasting/auth', function (Request $request) {
    $channelName = $request->input('channel_name');
    $socketId = $request->input('socket_id');
    
    \Log::info('Custom broadcasting auth called', [
        'channel_name' => $channelName,
        'socket_id' => $socketId,
        'user_authenticated' => auth()->check(),
        'user_id' => auth()->id(),
    ]);
    
    if (!$channelName || !$socketId) {
        \Log::error('Broadcast auth: Missing parameters', [
            'channel_name' => $channelName,
            'socket_id' => $socketId,
        ]);
        return response()->json(['error' => 'Missing channel_name or socket_id'], 400);
    }
    
    // Validate user is authenticated
    if (!auth()->check()) {
        \Log::error('Broadcast auth: User not authenticated');
        return response()->json(['error' => 'User not authenticated'], 403);
    }
    
    // Get Pusher configuration
    $pusherKey = config('broadcasting.connections.pusher.key');
    $pusherSecret = config('broadcasting.connections.pusher.secret');
    
    if (!$pusherKey || !$pusherSecret) {
        \Log::error('Broadcast auth: Pusher not configured');
        return response()->json(['error' => 'Pusher not configured'], 500);
    }

    try {
        // Validate channel authorization using Laravel's channel system
        $isAuthorized = authorizeChannel($channelName, auth()->user());
        
        if (!$isAuthorized) {
            \Log::error('Broadcast auth: Channel access denied', [
                'channel_name' => $channelName,
                'user_id' => auth()->id(),
            ]);
            return response()->json(['error' => 'Channel access denied'], 403);
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

        $response = [
            'auth' => $authSignature,
            'channel_data' => json_encode($channelData)
        ];

        \Log::info('Broadcast auth: Success', [
            'channel_name' => $channelName,
            'socket_id' => $socketId,
            'user_id' => auth()->id(),
        ]);

        return response()->json($response);

    } catch (\Exception $e) {
        \Log::error('Broadcast auth: Exception', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'channel_name' => $channelName,
            'socket_id' => $socketId,
        ]);

        return response()->json([
            'error' => 'Authorization failed: ' . $e->getMessage()
        ], 500);
    }
})->middleware(['web', 'auth']);

/**
 * Helper function to authorize channel access using Laravel's channel system
 */
function authorizeChannel($channelName, $user) {
    // Handle private-drawings.{id} channels
    if (preg_match('/^private-drawings\.(\d+)$/', $channelName, $matches)) {
        $drawingId = $matches[1];
        $drawing = \App\Models\Drawing::find($drawingId);
        
        if (!$drawing) {
            \Log::error('Drawing not found', ['drawing_id' => $drawingId]);
            return false;
        }
        
        return $drawing && $drawing->user_id === $user->id;
    }
    
    // Handle test channels
    if (preg_match('/^private-test\./', $channelName)) {
        return true; // Allow authenticated users to access test channels
    }
    
    \Log::warning('Unknown channel pattern', ['channel_name' => $channelName]);
    return false;
}

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
