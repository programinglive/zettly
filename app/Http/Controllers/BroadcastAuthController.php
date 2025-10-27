<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Broadcast;

class BroadcastAuthController extends Controller
{
    /**
     * Authenticate the request for channel access.
     */
    public function authenticate(Request $request): JsonResponse
    {
        // Log the request for debugging
        \Log::info('Broadcast auth request', [
            'channel_name' => $request->input('channel_name'),
            'socket_id' => $request->input('socket_id'),
            'user_authenticated' => Auth::check(),
            'user_id' => Auth::id(),
        ]);

        // Check if user is authenticated
        if (!Auth::check()) {
            \Log::warning('Broadcast auth failed: User not authenticated');
            return response()->json([
                'error' => 'User not authenticated',
                'auth' => false
            ], 401);
        }

        try {
            // Use Laravel's built-in broadcasting authorization
            $channelName = $request->input('channel_name');
            $socketId = $request->input('socket_id');

            // Check if this is a private channel
            if (str_starts_with($channelName, 'private-')) {
                $cleanChannelName = str_replace('private-', '', $channelName);
                
                // Use the channel authorization from routes/channels.php
                $result = Broadcast::channel($cleanChannelName, function ($user) use ($request) {
                    // This will call the appropriate channel callback
                    return true; // We'll handle this differently
                });
                
                // For private channels, we need to check the channel authorization
                $isAuthorized = $this->authorizeChannel(Auth::user(), $cleanChannelName, $request);
                
                if (!$isAuthorized) {
                    \Log::warning('Broadcast auth failed: Channel access denied', [
                        'channel_name' => $channelName,
                        'user_id' => Auth::id(),
                    ]);
                    
                    return response()->json([
                        'error' => 'Channel access denied',
                        'auth' => false
                    ], 403);
                }
            }

            \Log::info('Broadcast auth successful', [
                'channel_name' => $channelName,
                'user_id' => Auth::id(),
            ]);

            // Return the standard Pusher auth response format
            return response()->json([
                'auth' => $this->generatePusherAuth($request->input('channel_name'), $request->input('socket_id')),
                'channel_data' => [
                    'user_id' => Auth::id(),
                    'user_info' => [
                        'name' => Auth::user()->name,
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Broadcast auth error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'channel_name' => $request->input('channel_name'),
            ]);
            
            return response()->json([
                'error' => 'Authorization failed: ' . $e->getMessage(),
                'auth' => false
            ], 500);
        }
    }

    /**
     * Authorize channel access using the channel callbacks
     */
    private function authorizeChannel($user, $channelName, $request): bool
    {
        // Handle specific channel types
        if (str_starts_with($channelName, 'drawings.')) {
            $drawingId = substr($channelName, 9);
            $drawing = \App\Models\Drawing::find($drawingId);
            return $drawing && $drawing->user_id === $user->id;
        }
        
        if (str_starts_with($channelName, 'tldraw-')) {
            $drawingId = substr($channelName, 7);
            if (str_contains($drawingId, '-presence')) {
                $drawingId = str_replace('-presence', '', $drawingId);
            }
            $drawing = \App\Models\Drawing::find($drawingId);
            return $drawing && $drawing->user_id === $user->id;
        }

        return false;
    }

    /**
     * Generate Pusher authentication signature
     */
    private function generatePusherAuth($channelName, $socketId): string
    {
        $pusherKey = config('broadcasting.connections.pusher.key');
        $pusherSecret = config('broadcasting.connections.pusher.secret');
        $pusherAppId = config('broadcasting.connections.pusher.app_id');

        $stringToSign = $socketId . ':' . $channelName;
        $signature = hash_hmac('sha256', $stringToSign, $pusherSecret);

        return $pusherKey . ':' . $signature;
    }
}
