<?php

namespace App\Console\Commands;

use App\Services\Npm\LegacyNpmUnpublishMonitorService;
use Illuminate\Console\Command;

/**
 * @zettly-code ZC-ZETTLY-NPM-UNPUBLISH-CMD-001
 *
 * @purpose Artisan CLI (zettly:verify-legacy-npm) that checks npm Support ticket #5040981 progress and writes the result as feedback on the tracking Todo (default #1100).
 *
 * @tests tests/Feature/LegacyNpmUnpublishMonitorTest.php
 */
class VerifyLegacyNpmCommand extends Command
{
    protected $signature = 'zettly:verify-legacy-npm
        {--todo=1100 : Tracking Todo ID that receives the feedback}
        {--json : Output machine-readable JSON}';

    protected $description = 'Check whether npm Support unpublished @programinglive/dev-workflow-mcp-server and record feedback on the tracking Todo.';

    public function handle(LegacyNpmUnpublishMonitorService $service): int
    {
        $result = $service->check((int) $this->option('todo'));

        if ($this->option('json')) {
            $this->line((string) json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        } else {
            $this->info(sprintf('Legacy npm monitor [todo #%d]: status=%s', $result['todo_id'], $result['status']));
            $this->line($result['message']);
        }

        return self::SUCCESS;
    }
}
