<?php

namespace App\Console\Commands;

use App\Jobs\DeliverReport;
use App\Models\ReportDelivery;
use Illuminate\Console\Command;

class DeliverReportsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'journal:deliver-reports {--limit=100 : Maximum pending deliveries to dispatch this run}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Queue delivery jobs for pending report deliveries';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $limit = (int) $this->option('limit');

        $deliveries = ReportDelivery::where('status', ReportDelivery::STATUS_PENDING)
            ->orderBy('id')
            ->limit($limit)
            ->get();

        foreach ($deliveries as $delivery) {
            DeliverReport::dispatch($delivery->id);
        }

        $this->info("Queued delivery for {$deliveries->count()} pending report(s).");

        return self::SUCCESS;
    }
}
