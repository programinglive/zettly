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
        $metrics = [];
        $actions = [];
        $human = '';
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
            if ($section === '## Summary') {
                if ($human === '' && trim($line) !== '') {
                    $human = NotificationText::line(trim($line), 280);
                }

                continue;
            }
            if ($section === '' && preg_match('/^- (Machines|Projects|Tasks completed|Tasks in progress or blocked|Observed active-turn time|Journal entries recorded): /', $line)) {
                $metrics[] = NotificationText::line($line, 160);
            }
            if ($section === '## Outstanding work' && str_starts_with($line, '- ')
                && $line !== '- None recorded.') {
                $actions[] = $line;
            }
        }

        // The human recap leads the digest; legacy reports without a
        // '## Summary' section fall back to the plain metric lines.
        $digest = array_merge($lines, $human !== '' ? [$human] : [], $metrics);

        if ($actions !== []) {
            // Stable sorting keeps the original order within each urgency group.
            $actions = collect($actions)->sortBy(fn ($line) => str_contains($line, '(blocked)') ? 0 : (str_contains($line, '(urgent)') ? 1 : 2))->values();
            $digest[] = '';
            $digest[] = __('Needs attention');
            foreach ($actions->take(3) as $action) {
                $digest[] = NotificationText::line($action, 150);
            }
            if ($actions->count() > 3) {
                $digest[] = __('+ :count more in the full report.', ['count' => $actions->count() - 3]);
            }
        }

        return NotificationText::truncate(implode("\n", $digest), max(0, $limit));
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
            UserReportChannel::CHANNEL_DISCORD => self::discordPayload($content, $detailsUrl),
            UserReportChannel::CHANNEL_TELEGRAM => [
                'chat_id' => $chatId,
                'text' => $summary,
                'link_preview_options' => ['is_disabled' => true],
            ],
            default => throw new \InvalidArgumentException('Unsupported delivery channel: '.$channel),
        };
    }

    /**
     * Build a clean, structured Discord Rich Embed payload.
     */
    public static function discordPayload(string $content, string $detailsUrl): array
    {
        $title = 'Activity Summary';
        $period = null;
        $metrics = [];
        $actions = [];
        $summaryText = '';
        $section = '';

        foreach (preg_split('/\R/u', $content) as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            if (str_starts_with($line, '# ')) {
                $rawTitle = NotificationText::line(substr($line, 2), 140);
                if (str_contains($rawTitle, ':')) {
                    [$t, $p] = explode(':', $rawTitle, 2);
                    $title = trim($t);
                    $period = trim($p);
                } else {
                    $title = $rawTitle;
                }
                continue;
            }

            if (preg_match('/^#{2,3} /', $line)) {
                $section = trim($line);
                continue;
            }

            if ($section === '## Summary') {
                if ($summaryText === '') {
                    $summaryText = NotificationText::line($line, 280);
                }
                continue;
            }

            if ($section === '' && preg_match('/^- (Machines|Projects|Tasks completed|Tasks in progress or blocked|Observed active-turn time|Journal entries recorded|Undated completions): (.*)$/', $line, $m)) {
                $label = $m[1];
                $val = NotificationText::line($m[2], 120);
                $metrics[] = "• **{$label}:** {$val}";
            }

            if ($section === '## Outstanding work' && str_starts_with($line, '- ') && $line !== '- None recorded.') {
                $actions[] = NotificationText::line($line, 150);
            }
        }

        $fields = [];

        if (! empty($metrics)) {
            $fields[] = [
                'name' => '📈 Overview',
                'value' => implode("\n", $metrics),
                'inline' => false,
            ];
        }

        $hasBlocked = false;
        $hasUrgent = false;

        if (! empty($actions)) {
            $sorted = collect($actions)->sortBy(function ($item) use (&$hasBlocked, &$hasUrgent) {
                if (str_contains($item, '(blocked)')) {
                    $hasBlocked = true;
                    return 0;
                }
                if (str_contains($item, '(urgent)')) {
                    $hasUrgent = true;
                    return 1;
                }
                return 2;
            })->values();

            $actionLines = [];
            foreach ($sorted->take(4) as $act) {
                $cleanAct = preg_replace('/^\s*-\s*/', '', $act);
                $actionLines[] = "• {$cleanAct}";
            }

            if ($sorted->count() > 4) {
                $remaining = $sorted->count() - 4;
                $actionLines[] = "*+ {$remaining} more in full report.*";
            }

            $fields[] = [
                'name' => '⚠️ Needs Attention',
                'value' => implode("\n", $actionLines),
                'inline' => false,
            ];
        }

        $color = 5793266; // Discord Blurple (0x5865F2)
        if ($hasBlocked) {
            $color = 15550277; // Red (0xED4245)
        } elseif ($hasUrgent) {
            $color = 16705372; // Gold/Yellow (0xFEE75C)
        }

        $description = $summaryText !== ''
            ? ($period !== null ? "**Period:** {$period}\n\n" : '').$summaryText."\n\n[🔗 View Full Report]({$detailsUrl})"
            : ($period ? "**Period:** {$period}\n[🔗 View Full Report]({$detailsUrl})" : "[🔗 View Full Report]({$detailsUrl})");

        $embed = [
            'title' => '📊 ' . $title,
            'url' => $detailsUrl,
            'description' => $description,
            'color' => $color,
            'fields' => $fields,
            'footer' => [
                'text' => 'Zettly Activity Reports',
            ],
            'timestamp' => now()->toIso8601String(),
        ];

        return [
            'embeds' => [$embed],
            'allowed_mentions' => ['parse' => []],
        ];
    }
}
