<?php

namespace App\Console\Commands;

use App\Services\Sentry\SentryP0AutoSyncService;
use Illuminate\Console\Command;

/**
 * @zettly-code ZC-ZETTLY-SENTRY-P0-CMD-001
 *
 * @purpose Artisan CLI command (zettly:sentry-p0-sync) to poll Sentry for unresolved erp.beautyworld.co.id issues and promote them to live P0 Todos committed to Today (#1 Priority).
 */
class SentryP0SyncCommand extends Command
{
    protected $signature = 'zettly:sentry-p0-sync
        {--user= : Target owner user ID}
        {--project=erp : Sentry project slug to enforce as P0 priority}
        {--json : Output machine-readable JSON}';

    protected $description = 'Automatically poll unresolved Sentry issues for erp.beautyworld.co.id (project:erp) and promote them to live P0 Todos committed to Today (#1 Priority).';

    public function handle(SentryP0AutoSyncService $service): int
    {
        $userId = $this->option('user') ? (int) $this->option('user') : null;
        $project = trim((string) ($this->option('project') ?: 'erp'));

        $result = $service->syncErpIssues($userId, $project);

        if ($this->option('json')) {
            $this->line((string) json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            $this->info(sprintf(
                'Sentry P0 Auto-Sync [%s]: status=%s issues_found=%d created=%d',
                $result['project'],
                $result['status'],
                $result['issues_found'],
                $result['created_count']
            ));
        }

        return self::SUCCESS;
    }
}
