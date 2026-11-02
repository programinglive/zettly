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

    public function __construct(
        public int $userId,
        public bool $backfill = false,
        public bool $deliver = true,
    ) {
    }

    public function handle(ReportGenerator $generator, ReportDeliveryService $delivery): void
    {
        $user = User::find($this->userId);
        if (! $user) {
            return;
        }

        // The nightly run reports the current period only. generateDue() emits
        // every period since the first record, which after an import means
        // dozens of reports — and therefore dozens of Discord messages — in one
        // night. Backfill stays available as an explicit choice.
        $reports = $this->backfill
            ? $generator->generateDue($user)
            : $generator->generateCurrent($user);

        // Backfilling history must not push weeks of reports into a chat channel.
        // Deliveries are opt-in, so a backfill only writes the report rows.
        if (! $this->deliver) {
            return;
        }

        foreach ($reports as $report) {
            $delivery->enqueue($user, $report);
        }
    }
}
