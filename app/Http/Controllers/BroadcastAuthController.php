<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

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

        // Use Laravel's built-in broadcasting authorization
        $channelName = $request->input('channel_name');
        $socketId = $request->input('socket_id');

        // Get the channel authorization result
        $authData = app('Illuminate\Broadcasting\Broadcasters\Broadcaster')->isAuthorized(
            Auth::user(),
            $channelName,
            $request->all()
        );

        if (!$authData) {
            \Log::warning('Broadcast auth failed: Channel access denied', [
                'channel_name' => $channelName,
                'user_id' => Auth::id(),
            ]);
            
            return response()->json([
                'error' => 'Channel access denied',
                'auth' => false
            ], 403);
        }

        \Log::info('Broadcast auth successful', [
            'channel_name' => $channelName,
            'user_id' => Auth::id(),
        ]);

        return response()->json([
            'auth' => $authData,
            'channel_data' => [
                'user_id' => Auth::id(),
                'user_info' => [
                    'name' => Auth::user()->name,
                ]
            ]
        ]);
    }
}
