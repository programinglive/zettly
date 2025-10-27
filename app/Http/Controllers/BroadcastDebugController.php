<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Broadcast;

class BroadcastDebugController extends Controller
{
    /**
     * Debug endpoint to test broadcasting configuration
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'timestamp' => now()->toISOString(),
            'app_version' => config('app.version', 'unknown'),
            'laravel_version' => app()->version(),
            'broadcast_driver' => config('broadcasting.default'),
            'pusher_configured' => !empty(config('broadcasting.connections.pusher.key')),
            'pusher_key' => config('broadcasting.connections.pusher.key') ? substr(config('broadcasting.connections.pusher.key'), 0, 8) . '...' : null,
            'pusher_app_id' => config('broadcasting.connections.pusher.app_id'),
            'pusher_cluster' => config('broadcasting.connections.pusher.options.cluster'),
            'broadcast_provider_registered' => class_exists(\App\Providers\BroadcastServiceProvider::class),
            'channels_file_exists' => file_exists(base_path('routes/channels.php')),
            'user_authenticated' => Auth::check(),
            'user_id' => Auth::id(),
            'session_driver' => config('session.driver'),
            'csrf_token_configured' => config('session.encrypt') === true || config('app.env') === 'production',
        ]);
    }

    /**
     * Debug endpoint to check broadcast authentication status
     */
    public function debug(Request $request): JsonResponse
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

    /**
     * Test the actual broadcasting auth flow
     */
    public function testAuth(Request $request): JsonResponse
    {
        $channelName = $request->input('channel_name', 'private-drawings.1');
        $socketId = $request->input('socket_id', 'test.socket.id');
        
        Log::info('Broadcast debug test auth', [
            'channel_name' => $channelName,
            'socket_id' => $socketId,
            'user_authenticated' => Auth::check(),
            'user_id' => Auth::id(),
            'request_headers' => $request->headers->all(),
            'request_ip' => $request->ip(),
        ]);

        if (!Auth::check()) {
            return response()->json([
                'error' => 'User not authenticated',
                'auth' => false,
                'debug' => [
                    'user_authenticated' => false,
                    'session_id' => session()->getId(),
                    'csrf_token' => $request->header('X-CSRF-TOKEN') ? 'present' : 'missing',
                ]
            ], 401);
        }

        try {
            // Test channel authorization
            $cleanChannelName = str_replace('private-', '', $channelName);
            
            // Check if it's a drawings channel
            if (str_starts_with($cleanChannelName, 'drawings.')) {
                $drawingId = substr($cleanChannelName, 9);
                $drawing = \App\Models\Drawing::find($drawingId);
                
                if (!$drawing) {
                    return response()->json([
                        'error' => 'Drawing not found',
                        'auth' => false,
                        'debug' => [
                            'drawing_id' => $drawingId,
                            'drawing_exists' => false,
                        ]
                    ], 404);
                }
                
                if ($drawing->user_id !== Auth::id()) {
                    return response()->json([
                        'error' => 'Access denied - drawing belongs to different user',
                        'auth' => false,
                        'debug' => [
                            'drawing_id' => $drawingId,
                            'drawing_user_id' => $drawing->user_id,
                            'current_user_id' => Auth::id(),
                        ]
                    ], 403);
                }
            }

            // Generate proper Pusher auth response
            $pusherKey = config('broadcasting.connections.pusher.key');
            $pusherSecret = config('broadcasting.connections.pusher.secret');
            
            if (!$pusherKey || !$pusherSecret) {
                return response()->json([
                    'error' => 'Pusher not configured',
                    'auth' => false,
                    'debug' => [
                        'pusher_key' => $pusherKey ? 'configured' : 'missing',
                        'pusher_secret' => $pusherSecret ? 'configured' : 'missing',
                    ]
                ], 500);
            }

            $stringToSign = $socketId . ':' . $channelName;
            $signature = hash_hmac('sha256', $stringToSign, $pusherSecret);
            $authSignature = $pusherKey . ':' . $signature;

            return response()->json([
                'auth' => $authSignature,
                'channel_data' => [
                    'user_id' => Auth::id(),
                    'user_info' => [
                        'name' => Auth::user()->name,
                    ]
                ],
                'debug' => [
                    'channel_name' => $channelName,
                    'socket_id' => $socketId,
                    'string_to_sign' => $stringToSign,
                    'signature_generated' => true,
                    'user_authenticated' => true,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Broadcast debug auth error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'channel_name' => $channelName,
            ]);

            return response()->json([
                'error' => 'Authorization failed: ' . $e->getMessage(),
                'auth' => false,
                'debug' => [
                    'exception_type' => get_class($e),
                    'error_message' => $e->getMessage(),
                ]
            ], 500);
        }
    }

    /**
     * Simulate the exact same request as the frontend
     */
    public function simulateAuth(Request $request): JsonResponse
    {
        Log::info('Broadcast simulate auth request', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'headers' => $request->headers->all(),
            'input' => $request->all(),
            'user_authenticated' => Auth::check(),
            'user_id' => Auth::id(),
        ]);

        // This should work exactly like the real broadcasting auth
        return $this->testAuth($request);
    }
}
