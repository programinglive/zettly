<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\WorkspaceSummaryService;
use Illuminate\Console\Command;

class WorkspaceSummaryCommand extends Command
{
    protected $signature = 'zettly:summary
                            {--days=30 : Lookback window in days (7, 30, or 90)}
                            {--user= : User ID (defaults to first user)}
                            {--json : Output JSON payload}';

    protected $description = 'Generate an executive workspace summary with project breakdown, completion trend, and KPIs';

    public function handle(WorkspaceSummaryService $service): int
    {
        $days = (int) $this->option('days');
        if (! in_array($days, [7, 30, 90], true)) {
            $this->error("Invalid --days value '{$days}'. Allowed values: 7, 30, 90.");

            return self::FAILURE;
        }

        $userId = $this->option('user');
        $user = $userId ? User::find((int) $userId) : User::orderBy('id')->first();

        if (! $user) {
            $this->error('No user found for summary generation.');

            return self::FAILURE;
        }

        $summary = $service->build($user, $days);

        if ($this->option('json')) {
            $this->line(json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        $this->info("Workspace Summary ({$summary['range_label']})");
        $this->line($summary['takeaway']);
        $this->newLine();
        $this->comment('Projects:');
        foreach ($summary['projects'] as $project) {
            $this->line(sprintf('  - %s: %d%% (%d done, %d open)', $project['label'], $project['share_pct'], $project['completed'], $project['open']));
        }

        return self::SUCCESS;
    }
}
