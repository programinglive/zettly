<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class BroadcastServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Use custom broadcast auth route with proper middleware
        Route::post('/broadcasting/auth', [App\Http\Controllers\BroadcastAuthController::class, 'authenticate'])
            ->middleware(['web', 'auth']);

        require base_path('routes/channels.php');
    }
}
