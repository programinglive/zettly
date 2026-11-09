<?php

namespace App\Console\Commands;

use App\Models\Report;
use App\Services\ReportGenerator;
use Illuminate\Console\Command;

class BackfillReportSummariesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reports:backfill-summaries';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fill report_summaries rows for legacy reports from their raw data (idempotent; content is never touched)';

    /**
     * Execute the console command.
     */
    public function handle(ReportGenerator $generator): int
    {
        $missing = Report::whereDoesntHave('summary')->count();
        $created = 0;

        Report::whereDoesntHave('summary')
            ->with('user')
            ->chunkById(50, function ($reports) use (&$created, $generator) {
                foreach ($reports as $report) {
                    $generator->backfillSummary($report);
                    $created++;
                }
            });

        $this->info("Filled {$created} of {$missing} report summary row(s).");

        return self::SUCCESS;
    }
}
