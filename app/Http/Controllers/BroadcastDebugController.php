<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class BroadcastDebugController extends Controller
{
    /**
     * Debug endpoint to check broadcast authentication status
     */
    public function debug(Request $request)
    {
        $data = [
            'timestamp' => now()->toISOString(),
            'user_authenticated' => Auth::check(),
            'user_id' => Auth::id(),
            'user_email' => Auth::user()?->email,
            'session_id' => session()->getId(),
            'request_data' => $request->all(),
            'headers' => [
                'authorization' => $request->header('authorization'),
                'cookie' => $request->header('cookie') ? 'present' : 'missing',
                'x-csrf-token' => $request->header('x-csrf-token') ? 'present' : 'missing',
            ],
            'middleware_applied' => ['web'], // This should be applied
        ];

        // Try to simulate the actual broadcast authentication
        if ($request->has('channel_name') && $request->has('socket_id')) {
            try {
                $channelName = $request->input('channel_name');
                $socketId = $request->input('socket_id');
                
                // Check if this is a private channel
                if (str_starts_with($channelName, 'private-')) {
                    $channelName = substr($channelName, 8); // Remove 'private-' prefix
                    
                    // Parse channel name (e.g., 'drawings.2' -> drawing_id = 2)
                    if (str_starts_with($channelName, 'drawings.')) {
                        $drawingId = substr($channelName, 9); // Remove 'drawings.' prefix
                        
                        // Check if user owns the drawing
                        $user = Auth::user();
                        if ($user) {
                            try {
                                $drawing = \App\Models\Drawing::find($drawingId);
                                if ($drawing && $drawing->user_id === $user->id) {
                                    $data['channel_auth'] = 'authorized';
                                    $data['drawing_id'] = $drawingId;
                                    $data['drawing_owner_id'] = $drawing->user_id;
                                    $data['user_owns_drawing'] = true;
                                } else {
                                    $data['channel_auth'] = 'unauthorized';
                                    $data['drawing_id'] = $drawingId;
                                    $data['drawing_owner_id'] = $drawing?->user_id;
                                    $data['user_owns_drawing'] = false;
                                    $data['reason'] = $drawing ? 'User does not own this drawing' : 'Drawing not found';
                                }
                            } catch (\Exception $e) {
                                $data['channel_auth_error'] = $e->getMessage();
                            }
                        } else {
                            $data['channel_auth'] = 'unauthorized';
                            $data['reason'] = 'User not authenticated';
                        }
                    } else {
                        $data['channel_auth'] = 'unknown_channel_format';
                    }
                } else {
                    $data['channel_auth'] = 'not_private_channel';
                }
            } catch (\Exception $e) {
                $data['channel_auth_error'] = $e->getMessage();
            }
        }

        return response()->json($data);
    }
}
