<?php

use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\EnsureCodingAgentOwner;
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
            'coding-agent-owner' => EnsureCodingAgentOwner::class,
            'abilities' => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
        ]);

        // Exclude broadcast authentication from CSRF protection
        $middleware->validateCsrfTokens(except: [
            '/broadcasting/auth',
            'broadcasting/auth',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        Integration::handles($exceptions);

        // Handle database connection errors gracefully.
        //
        // These used to answer every failure with a JSON body, including ordinary
        // browser navigation: when the database went away, /dashboard returned
        // {"message":"Database service temporarily unavailable..."} instead of an
        // error page. Only do that when the caller asked for JSON; otherwise let
        // the framework render its 503 page.
        $exceptions->render(function (\PDOException $e, \Illuminate\Http\Request $request) {
            if (! str_contains($e->getMessage(), 'FATAL') && ! str_contains($e->getMessage(), 'connection')) {
                return null; // not ours; let the default handler deal with it
            }

            if (! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'message' => 'Database service temporarily unavailable. Please try again later.',
            ], 503);
        });

        $exceptions->render(function (\Illuminate\Database\QueryException $e, \Illuminate\Http\Request $request) {
            if (! str_contains($e->getMessage(), 'FATAL') && ! str_contains($e->getMessage(), 'connection')) {
                return null;
            }

            if (! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'message' => 'Database service temporarily unavailable. Please try again later.',
            ], 503);
        });
    })->create();
