<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

class BroadcastServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Don't register Laravel's default broadcast routes.
        // (routes/test-broadcasting.php dihapus 29 Okt 2026: rute debug
        //  broadcasting tanpa auth. Lihat docs/SECURITY-DEBUG-ROUTES.)
        // Broadcast::routes(['middleware' => ['web', 'auth']]);

        require base_path('routes/channels.php');
    }
}
