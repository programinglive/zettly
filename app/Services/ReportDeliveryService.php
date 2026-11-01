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
     * Condense a full report into its headline lines only, redacted.
     */
    public static function summary(string $content, int $limit = 1800): string
    {
        $headlineLines = array_values(array_filter(
            preg_split('/\n/', $content),
            fn (string $line) =>
                str_starts_with($line, '# ') ||
                str_starts_with($line, '- Machines:') ||
                str_starts_with($line, '- Projects:') ||
                str_starts_with($line, '- Tasks ') ||
                str_starts_with($line, '- Observed active-turn time:') ||
                str_starts_with($line, '### ')
        ));

        return AgentSessionIngestor::redact(implode("\n", $headlineLines), $limit);
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
