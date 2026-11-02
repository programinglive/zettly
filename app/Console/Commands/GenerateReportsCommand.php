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
        {--backfill : Also emit every past period (use once, after an import)}
        {--no-deliver : Write the report rows without queueing any delivery}
        {--deliver : Explicitly allow delivery during a backfill}';

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
        $deliver = ! (bool) $this->option('no-deliver');

        if ($backfill && $deliver) {
            // Backfilling history and pushing it to chat in one step is almost
            // never what anyone wants: it floods the channel with weeks of old
            // reports. Require an explicit choice.
            $this->error('Refusing to backfill and deliver at the same time.');
            $this->line('Use --backfill --no-deliver to write history only,');
            $this->line('or --backfill --deliver to accept that every past period is pushed.');

            return self::FAILURE;
        }

        $query = User::query()->with('reportChannels');

        if ($userId) {
            $query->where('id', (int) $userId);
        } else {
            $query->whereHas('reportChannels', fn ($q) => $q->enabled());
        }

        $count = 0;
        $query->chunkById(100, function ($users) use (&$count, $backfill, $deliver) {
            foreach ($users as $user) {
                DispatchReportGeneration::dispatch($user->id, $backfill, $deliver);
                $count++;
            }
        });

        $mode = $backfill ? 'backfill: all past periods' : 'current period only';
        $mode .= $deliver ? ', with delivery' : ', reports only (nothing sent)';
        $this->info("Queued report generation for {$count} user(s) ({$mode}).");

        return self::SUCCESS;
    }
}
