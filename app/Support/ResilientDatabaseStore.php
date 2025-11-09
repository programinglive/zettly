<?php

namespace App\Support;

use Illuminate\Cache\ArrayStore;
use Illuminate\Cache\DatabaseStore;
use Illuminate\Contracts\Cache\Store;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use PDOException;

class ResilientDatabaseStore extends DatabaseStore
{
    public function __construct(
        ConnectionInterface $connection,
        string $table,
        string $prefix = '',
        private readonly Store $fallback
    ) {
        parent::__construct($connection, $table, $prefix);
    }

    public static function withArrayFallback(
        ConnectionInterface $connection,
        string $table,
        string $prefix = ''
    ): self {
        $fallback = new ArrayStore($prefix);

        return new self($connection, $table, $prefix, $fallback);
    }

    public function get($key)
    {
        return $this->callWithFallback(fn () => parent::get($key), fn () => $this->fallback->get($key));
    }

    public function many(array $keys)
    {
        return $this->callWithFallback(fn () => parent::many($keys), fn () => $this->fallback->many($keys));
    }

    public function put($key, $value, $seconds)
    {
        return $this->callWithFallback(fn () => parent::put($key, $value, $seconds), fn () => $this->fallback->put($key, $value, $seconds));
    }

    public function putMany(array $values, $seconds)
    {
        return $this->callWithFallback(fn () => parent::putMany($values, $seconds), fn () => $this->fallback->putMany($values, $seconds));
    }

    public function forever($key, $value)
    {
        return $this->callWithFallback(fn () => parent::forever($key, $value), fn () => $this->fallback->forever($key, $value));
    }

    public function pull($key)
    {
        return $this->callWithFallback(fn () => parent::pull($key), fn () => $this->fallback->pull($key));
    }

    public function increment($key, $value = 1)
    {
        return $this->callWithFallback(fn () => parent::increment($key, $value), fn () => $this->fallback->increment($key, $value));
    }

    public function decrement($key, $value = 1)
    {
        return $this->callWithFallback(fn () => parent::decrement($key, $value), fn () => $this->fallback->decrement($key, $value));
    }

    public function forget($key)
    {
        return $this->callWithFallback(fn () => parent::forget($key), fn () => $this->fallback->forget($key));
    }

    public function flush()
    {
        return $this->callWithFallback(fn () => parent::flush(), fn () => $this->fallback->flush());
    }

    public function lock($name, $seconds = 0, $owner = null)
    {
        return $this->callWithFallback(
            fn () => parent::lock($name, $seconds, $owner),
            fn () => $this->fallback->lock($name, $seconds, $owner)
        );
    }

    public function restoreLock($name, $owner)
    {
        return $this->callWithFallback(
            fn () => parent::restoreLock($name, $owner),
            fn () => $this->fallback->restoreLock($name, $owner)
        );
    }

    public function getFallbackStore(): Store
    {
        return $this->fallback;
    }

    /**
     * Execute the given callback and fall back when a database connection error occurs.
     */
    private function callWithFallback(callable $callback, callable $fallback)
    {
        try {
            return $callback();
        } catch (PDOException|QueryException $exception) {
            if ($this->isConnectionFailure($exception)) {
                return $fallback();
            }

            throw $exception;
        }
    }

    private function isConnectionFailure(PDOException|QueryException $exception): bool
    {
        $message = Str::lower($exception->getMessage() ?? '');

        return str_contains($message, 'connection') || str_contains($message, 'fatal');
    }
}
