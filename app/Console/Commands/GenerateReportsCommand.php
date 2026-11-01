<?php

namespace App\Console\Commands;

use App\Jobs\DispatchReportGeneration;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class GenerateReportsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'journal:generate-reports
        {--user= : Only generate for a specific user id}
        {--backfill : Also emit every past period (use once, after an import)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Queue report-generation jobs for users with enabled report channels';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $userId = $this->option('user');
        $backfill = (bool) $this->option('backfill');

        $query = User::query()->with('reportChannels');

        if ($userId) {
            $query->where('id', (int) $userId);
        } else {
            $query->whereHas('reportChannels', fn ($q) => $q->enabled());
        }

        $count = 0;
        $query->chunkById(100, function ($users) use (&$count, $backfill) {
            foreach ($users as $user) {
                DispatchReportGeneration::dispatch($user->id, $backfill);
                $count++;
            }
        });

        $this->info("Queued report generation for {$count} user(s)".($backfill ? ' (backfill: all past periods)' : ' (current period only)').'.');

        return self::SUCCESS;
    }
}
