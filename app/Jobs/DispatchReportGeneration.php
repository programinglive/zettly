<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\ReportGenerator;
use App\Services\ReportDeliveryService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class DispatchReportGeneration implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $userId)
    {
    }

    public function handle(ReportGenerator $generator, ReportDeliveryService $delivery): void
    {
        $user = User::find($this->userId);
        if (! $user) {
            return;
        }

        foreach ($generator->generateDue($user) as $report) {
            $delivery->enqueue($user, $report);
        }
    }
}
