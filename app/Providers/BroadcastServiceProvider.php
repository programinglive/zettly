<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Log;

class BroadcastServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        try {
            // Don't register Laravel's default broadcast routes
            // We use custom routes in test-broadcasting.php
            // Broadcast::routes(['middleware' => ['web', 'auth']]);

            require base_path('routes/channels.php');
            
            Log::info('BroadcastServiceProvider loaded successfully (custom routes only)');
        } catch (\Exception $e) {
            Log::error('BroadcastServiceProvider failed to load', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}
