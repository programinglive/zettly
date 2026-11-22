<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\HumanRetrospectiveService;
use Illuminate\Console\Command;

class HumanRetrospectiveCommand extends Command
{
    protected $signature = 'zettly:retrospective
                            {period=daily : Retrospective period (daily, weekly, monthly)}
                            {--user= : User ID (defaults to first user)}
                            {--json : Output JSON payload}';

    protected $description = 'Generate a human-readable Daily, Weekly, or Monthly workspace retrospective';

    public function handle(HumanRetrospectiveService $service): int
    {
        $period = strtolower((string) $this->argument('period'));
        if (! in_array($period, ['daily', 'weekly', 'monthly'], true)) {
            $this->error("Invalid period '{$period}'. Allowed values: daily, weekly, monthly.");

            return self::FAILURE;
        }

        $userId = $this->option('user');
        $user = $userId ? User::find((int) $userId) : User::orderBy('id')->first();

        if (! $user) {
            $this->error('No user found for retrospective generation.');

            return self::FAILURE;
        }

        $retro = $service->buildRetrospective($user, $period);

        if ($this->option('json')) {
            $this->line(json_encode($retro, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        $this->info("{$retro['label']} Retrospective ({$retro['range_label']})");
        $this->line($retro['summary']);

        if (! empty($retro['done_highlights'])) {
            $this->newLine();
            $this->comment('Done:');
            foreach ($retro['done_highlights'] as $item) {
                $this->line('  - '.$item['title']);
            }
        }

        if (! empty($retro['went_well'])) {
            $this->newLine();
            $this->comment('What went well:');
            foreach ($retro['went_well'] as $line) {
                $this->line('  + '.$line);
            }
        }

        if (! empty($retro['blockers'])) {
            $this->newLine();
            $this->comment('Blockers & waiting:');
            foreach ($retro['blockers'] as $line) {
                $this->line('  ! '.$line);
            }
        }

        if (! empty($retro['improvements'])) {
            $this->newLine();
            $this->comment('What to improve:');
            foreach ($retro['improvements'] as $line) {
                $this->line('  > '.$line);
            }
        }

        return self::SUCCESS;
    }
}
