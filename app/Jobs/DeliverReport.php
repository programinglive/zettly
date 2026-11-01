<?php

namespace App\Jobs;

use App\Models\ReportDelivery;
use App\Services\ReportDeliveryService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class DeliverReport implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [60, 300, 900];

    public function __construct(public int $deliveryId)
    {
    }

    public function handle(ReportDeliveryService $service, int $attempt = 1): void
    {
        $delivery = ReportDelivery::find($this->deliveryId);

        if (! $delivery || $delivery->status === ReportDelivery::STATUS_DELIVERED) {
            return;
        }

        try {
            $service->send($delivery);
        } catch (\Throwable $e) {
            // Final attempt: flip to failed so the scheduled sweep stops re-dispatching.
            if ($attempt >= $this->tries) {
                $delivery->update(['status' => ReportDelivery::STATUS_FAILED]);
            }

            Log::warning('Report delivery failed.', [
                'delivery_id' => $delivery->id,
                'attempt' => $attempt,
                'will_retry' => $attempt < $this->tries,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
