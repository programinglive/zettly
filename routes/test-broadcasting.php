<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\BroadcastDebugController;

Route::get('/test-broadcasting', [BroadcastDebugController::class, 'index']);

Route::post('/test-broadcasting-auth', [BroadcastDebugController::class, 'testAuth'])->middleware(['web', 'auth']);

Route::post('/test-broadcasting-debug', [BroadcastDebugController::class, 'debug'])->middleware(['web']);

Route::post('/test-broadcasting-simulate', [BroadcastDebugController::class, 'simulateAuth'])->middleware(['web', 'auth']);

// Custom broadcasting auth route as backup
Route::post('/broadcasting/auth', function (Request $request) {
    \Log::info('Custom broadcasting auth called', [
        'channel_name' => $request->input('channel_name'),
        'socket_id' => $request->input('socket_id'),
        'user_authenticated' => auth()->check(),
        'user_id' => auth()->id(),
    ]);

    if (!auth()->check()) {
        \Log::warning('Broadcast auth: User not authenticated');
        return response()->json(['error' => 'Unauthenticated'], 401);
    }

    $channelName = $request->input('channel_name');
    $socketId = $request->input('socket_id');

    // Validate required fields
    if (!$channelName || !$socketId) {
        \Log::error('Broadcast auth: Missing required fields', [
            'channel_name' => $channelName,
            'socket_id' => $socketId,
        ]);
        return response()->json(['error' => 'Missing required fields'], 400);
    }

    try {
        // Check if it's a private channel
        if (!str_starts_with($channelName, 'private-')) {
            \Log::error('Broadcast auth: Not a private channel', ['channel_name' => $channelName]);
            return response()->json(['error' => 'Invalid channel type'], 400);
        }

        // Remove 'private-' prefix for authorization
        $cleanChannelName = substr($channelName, 8);

        // Check if it's a drawings channel
        if (str_starts_with($cleanChannelName, 'drawings.')) {
            $drawingId = substr($cleanChannelName, 9);
            $drawing = \App\Models\Drawing::find($drawingId);
            
            if (!$drawing) {
                \Log::error('Broadcast auth: Drawing not found', ['drawing_id' => $drawingId]);
                return response()->json(['error' => 'Drawing not found'], 404);
            }
            
            if ($drawing->user_id !== auth()->id()) {
                \Log::error('Broadcast auth: Access denied', [
                    'drawing_id' => $drawingId,
                    'drawing_user_id' => $drawing->user_id,
                    'current_user_id' => auth()->id(),
                ]);
                return response()->json(['error' => 'Access denied'], 403);
            }
        }

        // Generate proper Pusher auth response
        $pusherKey = config('broadcasting.connections.pusher.key');
        $pusherSecret = config('broadcasting.connections.pusher.secret');
        
        if (!$pusherKey || !$pusherSecret) {
            \Log::error('Broadcast auth: Pusher not configured');
            return response()->json(['error' => 'Pusher not configured'], 500);
        }

        $stringToSign = $socketId . ':' . $channelName;
        $signature = hash_hmac('sha256', $stringToSign, $pusherSecret);
        $authSignature = $pusherKey . ':' . $signature;

        $response = [
            'auth' => $authSignature,
            'channel_data' => [
                'user_id' => auth()->id(),
                'user_info' => [
                    'name' => auth()->user()->name,
                ]
            ]
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
