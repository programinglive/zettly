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
            // Use Laravel's default broadcast routes with web and auth middleware
            Broadcast::routes(['middleware' => ['web', 'auth']]);

            require base_path('routes/channels.php');
            
            Log::info('BroadcastServiceProvider loaded successfully');
        } catch (\Exception $e) {
            Log::error('BroadcastServiceProvider failed to load', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Fallback: try without auth middleware for debugging
            try {
                Broadcast::routes(['middleware' => ['web']]);
                require base_path('routes/channels.php');
                Log::warning('BroadcastServiceProvider loaded with web middleware only');
            } catch (\Exception $e2) {
                Log::error('BroadcastServiceProvider fallback also failed', [
                    'error' => $e2->getMessage(),
                    'trace' => $e2->getTraceAsString()
                ]);
            }
        }
    }
}
