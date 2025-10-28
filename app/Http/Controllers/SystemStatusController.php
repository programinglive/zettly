<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class SystemStatusController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $broadcastDriver = config('broadcasting.default');
        $pusherConfig = config('broadcasting.connections.pusher', []);

        $pusherKey = data_get($pusherConfig, 'key');
        $pusherCluster = data_get($pusherConfig, 'options.cluster');

        return response()->json([
            'app_version' => config('app.version', 'unknown'),
            'laravel_version' => app()->version(),
            'environment' => config('app.env', 'unknown'),
            'debug_mode' => config('app.debug', false),
            'broadcast_driver' => $broadcastDriver,
            'pusher_configured' => ! empty($pusherKey),
            'pusher_key' => $pusherKey ? substr($pusherKey, 0, 8).'...' : null,
            'pusher_cluster' => $pusherCluster,
        ]);
    }
}
