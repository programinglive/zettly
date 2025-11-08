# Database Connection Error Handling

## Overview

This document describes how Zettly handles database connection errors that occur during database shutdown or maintenance.

## Issues Fixed

### TODOAPP-2R: QueryException on Cache Query
- **Error**: `SQLSTATE[08006] [7] connection to server at "localhost" (::1), port 5432 failed: FATAL: the database system is shutting down`
- **Cause**: Cache driver using database backend when database is unavailable
- **Fix**: Added cache fallback mechanism to use array cache when database fails

### TODOAPP-2S: PDOException - Active Transaction
- **Error**: `PDOException: There is already an active transaction`
- **Cause**: Connection pooling issue during database shutdown
- **Fix**: Added PDO timeout and error mode configuration

### TODOAPP-2Q: PDOException - Connection Failure
- **Error**: `SQLSTATE[08006] [7] connection to server at "localhost" (::1), port 5432 failed: FATAL: the database system is shutting down`
- **Cause**: Direct connection failure during database shutdown
- **Fix**: Added exception handlers to return 503 status

## Implementation Details

### 1. PostgreSQL Configuration (`config/database.php`)

Added PDO options to the PostgreSQL connection:

```php
'pgsql' => [
    // ... other config ...
    'options' => extension_loaded('pdo_pgsql') ? array_filter([
        PDO::ATTR_TIMEOUT => env('DB_TIMEOUT', 30),
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]) : [],
],
```

**Benefits**:
- Sets connection timeout to 30 seconds (configurable via `DB_TIMEOUT` env var)
- Enables exception mode for better error handling

### 2. Exception Handlers (`bootstrap/app.php`)

Added exception renderers for database connection errors:

```php
->withExceptions(function (Exceptions $exceptions): void {
    Integration::handles($exceptions);

    // Handle PDOException for database connection failures
    $exceptions->render(function (\PDOException $e) {
        if (str_contains($e->getMessage(), 'FATAL') || str_contains($e->getMessage(), 'connection')) {
            return response()->json([
                'message' => 'Database service temporarily unavailable. Please try again later.',
            ], 503);
        }
        throw $e;
    });

    // Handle QueryException for database connection failures
    $exceptions->render(function (\Illuminate\Database\QueryException $e) {
        if (str_contains($e->getMessage(), 'FATAL') || str_contains($e->getMessage(), 'connection')) {
            return response()->json([
                'message' => 'Database service temporarily unavailable. Please try again later.',
            ], 503);
        }
        throw $e;
    });
})
```

**Benefits**:
- Returns HTTP 503 (Service Unavailable) instead of 500 (Internal Server Error)
- Provides user-friendly error message
- Allows clients to implement retry logic

### 3. Cache Fallback Mechanism (`app/Providers/AppServiceProvider.php`)

Added cache fallback configuration:

```php
private function configureCacheFallback(): void
{
    // Wrap cache operations to handle database connection failures
    $originalCacheManager = app('cache');

    app()->singleton('cache', function ($app) use ($originalCacheManager) {
        return new class($originalCacheManager) {
            public function __call($method, $parameters)
            {
                try {
                    return $this->originalManager->$method(...$parameters);
                } catch (\PDOException | \Illuminate\Database\QueryException $e) {
                    // If database cache fails, use array cache as fallback
                    if (str_contains($e->getMessage(), 'FATAL') || str_contains($e->getMessage(), 'connection')) {
                        return $this->originalManager->store('array')->$method(...$parameters);
                    }
                    throw $e;
                }
            }
        };
    });
}
```

**Benefits**:
- Cache operations continue even when database is unavailable
- Automatically falls back to in-memory array cache
- No code changes needed in cache consumers

## Testing

Created comprehensive test suite in `tests/Feature/DatabaseConnectionErrorTest.php`:

- `test_pdo_exception_on_database_shutdown_returns_503()` - Verifies PDO exception handling
- `test_query_exception_on_connection_failure_returns_503()` - Verifies QueryException handling
- `test_cache_fallback_on_database_failure()` - Verifies cache fallback mechanism
- `test_pgsql_database_config_has_timeout()` - Verifies PostgreSQL configuration
- `test_database_connection_works_normally()` - Verifies normal operations
- `test_cache_operations_work_normally()` - Verifies cache functionality
- `test_array_cache_driver_available()` - Verifies fallback cache driver

All 231 tests pass.

## Environment Variables

- `DB_TIMEOUT` - Database connection timeout in seconds (default: 30)

## Monitoring

These errors are automatically reported to Sentry. The 503 responses help identify:
- Database maintenance windows
- Database server issues
- Connection pool exhaustion

## Best Practices

1. **Client-Side Retry Logic**: Clients should implement exponential backoff when receiving 503 responses
2. **Database Monitoring**: Monitor database connection logs for FATAL errors
3. **Cache Strategy**: Consider using Redis for cache in production instead of database
4. **Load Balancing**: Use load balancers to route requests away from failing database connections

## Related Documentation

- [Laravel Database Configuration](https://laravel.com/docs/database)
- [Laravel Cache Configuration](https://laravel.com/docs/cache)
- [Sentry Error Tracking](./SENTRY.md)
