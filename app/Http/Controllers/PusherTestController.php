<?php

namespace App\Http\Controllers;

use App\Events\DrawingUpdated;
use App\Models\Drawing;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class PusherTestController extends Controller
{
    public function test(): JsonResponse
    {
        try {
            // Test if Pusher is configured
            $pusher = app('pusher');
            
            // Test a simple channel authentication
            $socket_id = request('socket_id');
            $channel_name = request('channel_name', 'private-test');
            
            if ($socket_id) {
                $auth = $pusher->socket_auth($channel_name, $socket_id);
                return response()->json([
                    'success' => true,
                    'message' => 'Pusher connection successful',
                    'auth' => json_decode($auth),
                ]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Pusher is configured and ready',
                'app_id' => config('broadcasting.connections.pusher.app_id'),
                'key' => config('broadcasting.connections.pusher.key'),
                'cluster' => config('broadcasting.connections.pusher.options.cluster'),
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pusher connection failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    
    public function testBroadcast(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }
            
            // Create a test drawing or use existing
            $drawing = Drawing::where('user_id', $user->id)->first();
            
            if (!$drawing) {
                $drawing = Drawing::create([
                    'user_id' => $user->id,
                    'title' => 'Test Drawing for Pusher',
                    'document' => ['test' => true, 'timestamp' => now()],
                ]);
            }
            
            // Broadcast the update
            broadcast(new DrawingUpdated($drawing));
            
            return response()->json([
                'success' => true,
                'message' => 'Test broadcast sent to channel: drawings.' . $drawing->id,
                'drawing_id' => $drawing->id,
                'channel' => 'drawings.' . $drawing->id,
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Broadcast failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
