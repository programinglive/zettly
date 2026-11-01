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

    public function handle(ReportDeliveryService $service): void
    {
        $delivery = ReportDelivery::find($this->deliveryId);

        if (! $delivery || $delivery->status === ReportDelivery::STATUS_DELIVERED) {
            return;
        }

        try {
            $service->send($delivery);
        } catch (\Throwable $e) {
            Log::warning('Report delivery failed, will retry.', [
                'delivery_id' => $delivery->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
