<?php

namespace App\Console\Commands;

use App\Services\ReportDeliveryService;
use Illuminate\Console\Command;

class PreviewReportNotification extends Command
{
    protected $signature = 'journal:preview-report {--channel=discord : discord or telegram}';

    protected $description = 'Preview a synthetic report notification without reading user reports or sending messages';

    public function handle(): int
    {
        $channel = (string) $this->option('channel');
        if (! in_array($channel, ['discord', 'telegram'], true)) {
            $this->error('Choose discord or telegram. No message was sent.');

            return self::INVALID;
        }

        $content = implode("\n", [
            '# Daily Activity Summary: sample',
            '- Machines: Desktop, Laptop',
            '- Projects: 2',
            '- Tasks completed: 3',
            '- Tasks in progress or blocked: 2',
            '## Outstanding work',
            '- Review deployment verification (blocked)',
            '- Finish the regression check (in_progress)',
            '## Journal entries',
            '- Full journal details stay in the authenticated report.',
        ]);
        $payload = ReportDeliveryService::chatPayload($channel, $content, route('reports.show', 42), 'preview-only');
        $this->line(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return self::SUCCESS;
    }
}
