<?php

use App\Http\Middleware\EnsureSuperAdmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;
use Sentry\Laravel\Integration;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        then: function () {
            Route::middleware('web')->group(base_path('routes/tldraw-sync.php'));
        },
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\CompressResponse::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'super-admin' => EnsureSuperAdmin::class,
        ]);

        // Exclude broadcast authentication from CSRF protection
        $middleware->validateCsrfTokens(except: [
            '/broadcasting/auth',
            'broadcasting/auth',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        Integration::handles($exceptions);

        // Handle database connection errors gracefully
        $exceptions->render(function (\PDOException $e) {
            // Log the error to Sentry but don't expose details to user
            if (str_contains($e->getMessage(), 'FATAL') || str_contains($e->getMessage(), 'connection')) {
                // Database is shutting down or unavailable - return 503 Service Unavailable
                return response()->json([
                    'message' => 'Database service temporarily unavailable. Please try again later.',
                ], 503);
            }

            // Re-throw for other PDO errors
            throw $e;
        });

        $exceptions->render(function (\Illuminate\Database\QueryException $e) {
            // Handle query exceptions from database connection failures
            if (str_contains($e->getMessage(), 'FATAL') || str_contains($e->getMessage(), 'connection')) {
                return response()->json([
                    'message' => 'Database service temporarily unavailable. Please try again later.',
                ], 503);
            }

            // Re-throw for other query errors
            throw $e;
        });
    })->create();
