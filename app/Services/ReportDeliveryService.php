<?php

namespace App\Services;

use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Support\Facades\Http;

class ReportDeliveryService
{
    /**
     * Condense a full report into a Discord-sized message, redacted.
     *
     * Keeps the headline block, the per-project sections and the journal
     * summary, because those are what make a historical day readable. Section
     * headings and the bullet under them travel together; a section is dropped
     * whole rather than leaving an empty heading behind.
     */
    public static function summary(string $content, int $limit = 1800): string
    {
        $kept = [];
        $inDropSection = false;

        foreach (preg_split('/\n/', $content) as $line) {
            $isSection = str_starts_with($line, '## ');
            $isHeadline = str_starts_with($line, '# ')
                || str_starts_with($line, '- Machines:')
                || str_starts_with($line, '- Projects:')
                || str_starts_with($line, '- Tasks ')
                || str_starts_with($line, '- Observed active-turn time:')
                || str_starts_with($line, '- Journal entries recorded:')
                || str_starts_with($line, '### ');

            if ($isSection) {
                $heading = trim($line);

                // Sections that add nothing to a chat message.
                $inDropSection = in_array($heading, [
                    '## Next actions',
                    '## Historical comparison',
                ], true);

                // Heading-only removal: the project and session lines under it
                // are the substance of the report, so keep them and skip the
                // heading.
                if ($heading === '## Work by project') {
                    continue;
                }

                if (! $inDropSection) {
                    $kept[] = $line;
                }

                continue;
            }

            if ($inDropSection) {
                continue;
            }

            if ($isHeadline || str_starts_with($line, '- ') || str_starts_with($line, '  - ')) {
                $kept[] = $line;
            }
        }

        return AgentSessionIngestor::redact(implode("\n", $kept), $limit);
    }

    /**
     * Create one pending delivery per enabled channel. Returns the count created.
     */
    public function enqueue(User $user, Report $report): int
    {
        $created = 0;

        foreach ($user->reportChannels()->enabled()->get() as $channel) {
            $exists = ReportDelivery::where('report_id', $report->id)
                ->where('channel', $channel->channel)
                ->exists();

            if (! $exists) {
                ReportDelivery::create([
                    'user_id' => $user->id,
                    'report_id' => $report->id,
                    'channel' => $channel->channel,
                ]);
                $created++;
            }
        }

        return $created;
    }

    /**
     * Attempt to deliver a single delivery row.
     *
     * Success: sets status=delivered + delivered_at.
     * Failure: increments attempts, records last_error, leaves status=pending
     * and rethrows so the queue can retry.
     */
    public function send(ReportDelivery $delivery): void
    {
        $channel = $delivery->user?->reportChannels()
            ->where('channel', $delivery->channel)
            ->first();

        if (! $channel) {
            throw new \RuntimeException('No configured report channel for delivery #'.$delivery->id);
        }

        $report = $delivery->report;
        $summary = self::summary($report->content);

        $payload = match ($delivery->channel) {
            UserReportChannel::CHANNEL_DISCORD => ['content' => $summary],
            UserReportChannel::CHANNEL_TELEGRAM => [
                'chat_id' => $channel->chat_id,
                'text' => $summary,
            ],
            default => throw new \RuntimeException('Unsupported delivery channel: '.$delivery->channel),
        };

        $response = Http::post($channel->webhook_url, $payload);

        if ($response->successful()) {
            $delivery->update([
                'status' => ReportDelivery::STATUS_DELIVERED,
                'attempts' => $delivery->attempts + 1,
                'delivered_at' => now(),
            ]);
            return;
        }

        $delivery->update([
            'status' => ReportDelivery::STATUS_PENDING,
            'attempts' => $delivery->attempts + 1,
            'last_error' => 'HTTP '.($response->status() ?? '?'),
        ]);

        throw new \RuntimeException('Delivery to '.$delivery->channel.' failed with HTTP '.($response->status() ?? '?'));
    }
}
