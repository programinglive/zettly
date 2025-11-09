# Database Resiliency

**Introduced in:** v0.10.16 (2025-11-09)

## Overview

Hardened database connection handling with PDO timeout options, graceful 503 responses during shutdown, and cache fallbacks to avoid Sentry outages.

## Problem

The application was experiencing database connection errors during shutdown or when the database became temporarily unavailable:
- `PDOException: connection to server failed`
- `QueryException: There is already an active transaction`
- Cache operations failing when the database was unreachable

These errors were being captured in Sentry as TODOAPP-2Q, TODOAPP-2R, and TODOAPP-2S.

## Solution

### 1. PostgreSQL Connection Configuration

Added PDO options to `config/database.php` for better timeout and error handling:

```php
'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', '5432'),
    'database' => env('DB_DATABASE', 'forge'),
    'username' => env('DB_USERNAME', 'forge'),
    'password' => env('DB_PASSWORD', ''),
    'charset' => 'utf8',
    'prefix' => '',
    'schema' => 'public',
    'sslmode' => 'prefer',
    'options' => [
        PDO::ATTR_TIMEOUT => env('DB_TIMEOUT', 30),
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ],
],
```

### 2. Exception Renderers

Added graceful exception handling in `bootstrap/app.php`:

```php
$exceptions->render(function (PDOException $e, Request $request) {
    if ($request->expectsJson()) {
        return response()->json([
            'message' => 'Database connection error. Please try again later.',
            'error' => 'database_unavailable',
        ], 503);
    }
    return response()->view('errors.503', [], 503);
});

$exceptions->render(function (QueryException $e, Request $request) {
    if (str_contains($e->getMessage(), 'FATAL') || str_contains($e->getMessage(), 'connection')) {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Database connection error. Please try again later.',
                'error' => 'database_unavailable',
            ], 503);
        }
        return response()->view('errors.503', [], 503);
    }
});
```

### 3. Resilient Cache Store

Created `app/Support/ResilientDatabaseStore.php` to provide automatic fallback to array cache when database is unavailable:

```php
class ResilientDatabaseStore extends DatabaseStore
{
    private ArrayStore $fallback;

    public static function withArrayFallback(Connection $connection, $table, $prefix): self
    {
        $store = new self($connection, $table, $prefix);
        $store->fallback = new ArrayStore();
        return $store;
    }

    public function get($key)
    {
        try {
            return parent::get($key);
        } catch (PDOException|QueryException $e) {
            return $this->fallback->get($key);
        }
    }

    public function put($key, $value, $seconds = null)
    {
        try {
            return parent::put($key, $value, $seconds);
        } catch (PDOException|QueryException $e) {
            return $this->fallback->put($key, $value, $seconds);
        }
    }
}
```

### 4. Service Provider Registration

Updated `app/Providers/AppServiceProvider.php` to extend the database cache driver:

```php
private function registerResilientDatabaseCache(): void
{
    Cache::extend('database', function ($app) {
        $config = $app['config']->get('cache.stores.database', []);
        $connectionName = $config['connection'] ?? null;
        $connection = $app['db']->connection($connectionName);
        $table = $config['table'] ?? 'cache';
        $prefix = $config['prefix'] ?? Str::slug((string) $app['config']->get('app.name', 'laravel')).'-cache-';

        $store = ResilientDatabaseStore::withArrayFallback($connection, $table, $prefix);
        $repository = new Repository($store);
        $repository->setEventDispatcher($app['events']);

        return $repository;
    });
}
```

## Impact

- **Graceful Degradation:** Database connection failures no longer crash the application
- **Cache Resilience:** Cache operations continue using in-memory fallback during database outages
- **Better Error Messages:** Users see 503 Service Unavailable instead of 500 errors
- **Sentry Noise Reduction:** Temporary database issues are handled gracefully without error reporting

## Files Modified

- `config/database.php` — Added PDO timeout options
- `bootstrap/app.php` — Added exception renderers
- `app/Support/ResilientDatabaseStore.php` — New resilient cache store
- `app/Providers/AppServiceProvider.php` — Cache driver registration
- `tests/Feature/DatabaseConnectionErrorTest.php` — Test coverage

## Testing

Run tests to verify database resilience:

```bash
php artisan test --no-coverage
```

Key test cases:
- PDOException handling with graceful 503 response
- QueryException handling during transactions
- Cache fallback to array store on connection failure
- Normal database operations when connection is available

## Related Issues

- TODOAPP-2Q: PDOException: connection to server failed
- TODOAPP-2R: QueryException on cache query
- TODOAPP-2S: PDOException: There is already an active transaction
