<?php

namespace App\Services;

use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

class ReportDeliveryService
{
    /**
     * Build a bounded chat digest; full journal and session details stay in the report.
     */
    public static function summary(string $content, int $limit = 1800): string
    {
        $lines = [];
        $actions = [];
        $section = '';
        $hasTitle = false;
        foreach (preg_split('/\R/u', $content) as $line) {
            if (str_starts_with($line, '# ')) {
                if (! $hasTitle && $section === '') {
                    $lines[] = NotificationText::line(substr($line, 2), 140);
                    $hasTitle = true;
                }

                continue;
            }
            if (preg_match('/^#{2,3} /', $line)) {
                $section = trim($line);

                continue;
            }
            if ($section === '' && preg_match('/^- (Machines|Projects|Tasks completed|Tasks in progress or blocked|Observed active-turn time|Journal entries recorded): /', $line)) {
                $lines[] = NotificationText::line($line, 160);
            }
            if ($section === '## Outstanding work' && str_starts_with($line, '- ')
                && $line !== '- None recorded.') {
                $actions[] = $line;
            }
        }

        if ($actions !== []) {
            // Stable sorting keeps the original order within each urgency group.
            $actions = collect($actions)->sortBy(fn ($line) => str_contains($line, '(blocked)') ? 0 : (str_contains($line, '(urgent)') ? 1 : 2))->values();
            $lines[] = '';
            $lines[] = __('Needs attention');
            foreach ($actions->take(3) as $action) {
                $lines[] = NotificationText::line($action, 150);
            }
            if ($actions->count() > 3) {
                $lines[] = __('+ :count more in the full report.', ['count' => $actions->count() - 3]);
            }
        }

        return NotificationText::truncate(implode("\n", $lines), max(0, $limit));
    }

    /**
     * Create one pending delivery per enabled channel. Returns the count created.
     */
    public function enqueue(User $user, Report $report): int
    {
        return $this->enqueueForReports($user, collect([$report]))->count();
    }

    /**
     * Create the missing delivery rows for many reports in one pass.
     *
     * Enqueuing report by report meant a fresh reportChannels() query for every
     * report, an exists() per channel, and a lookup for the created row: measured
     * at 9 queries for 2 reports and 85 for 22 - O(reports x channels).
     *
     * Loading the channels once and the existing (report, channel) pairs once
     * collapses that to a constant number of queries regardless of history length.
     *
     * @param  Collection<int, Report>  $reports
     * @return Collection<int, ReportDelivery> rows actually created
     */
    public function enqueueForReports(User $user, Collection $reports): Collection
    {
        if ($reports->isEmpty()) {
            return collect();
        }

        $channels = $user->reportChannels()->enabled()->get();

        if ($channels->isEmpty()) {
            return collect();
        }

        $existing = ReportDelivery::whereIn('report_id', $reports->pluck('id'))
            ->get(['report_id', 'channel'])
            ->mapWithKeys(fn (ReportDelivery $delivery) => [
                $delivery->report_id.'|'.$delivery->channel => true,
            ]);

        $created = collect();

        foreach ($reports as $report) {
            foreach ($channels as $channel) {
                if ($existing->has($report->id.'|'.$channel->channel)) {
                    continue;
                }

                $created->push(ReportDelivery::create([
                    'user_id' => $user->id,
                    'report_id' => $report->id,
                    'channel' => $channel->channel,
                ]));
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
        $payload = self::chatPayload($delivery->channel, $report->content, route('reports.show', $report), $channel->chat_id);

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

    /** Render without sending so the CLI and tests use the delivery formatter. */
    public static function chatPayload(string $channel, string $content, string $detailsUrl, ?string $chatId = null): array
    {
        $details = __('View full report').': '.$detailsUrl;
        $summary = self::summary($content, max(0, 1800 - NotificationText::units($details) - 2))."\n\n".$details;

        return match ($channel) {
            UserReportChannel::CHANNEL_DISCORD => ['content' => $summary, 'allowed_mentions' => ['parse' => []], 'flags' => 4],
            UserReportChannel::CHANNEL_TELEGRAM => [
                'chat_id' => $chatId,
                'text' => $summary,
                'link_preview_options' => ['is_disabled' => true],
            ],
            default => throw new \InvalidArgumentException('Unsupported delivery channel: '.$channel),
        };
    }
}
