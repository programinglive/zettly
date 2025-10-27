<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

class BroadcastServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register custom broadcast authentication route with web middleware
        Route::post('/broadcasting/auth', function (Request $request) {
            $channelName = $request->input('channel_name');
            $socketId = $request->input('socket_id');
            
            // Use Laravel's built-in broadcast authentication
            return Broadcast::auth($request);
        })->middleware(['web']);

        require base_path('routes/channels.php');
    }
}
