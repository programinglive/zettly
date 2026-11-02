<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pushes one graph event to the graph service, off the request path.
 *
 * TodoObserver used to POST synchronously with a 2 s timeout on every create,
 * update and delete, so a slow or dead graph service delayed every todo write -
 * link/unlink paid for two calls. The queue already exists and runs on the host.
 */
class SyncGraphEvent implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [5, 30, 120];

    public function __construct(public string $type, public array $data)
    {
    }

    public function handle(): void
    {
        $url = config('services.graph.url', 'http://localhost:3001');

        $response = Http::timeout(2)->post("{$url}/sync", [
            'type' => $this->type,
            'data' => $this->data,
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException("Graph service returned status {$response->status()}");
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::error('Failed to sync todo to graph service', [
            'type' => $this->type,
            'data' => $this->data,
            'error' => $e->getMessage(),
        ]);
    }
}