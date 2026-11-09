<?php

namespace App\Http\Controllers;

use App\Jobs\DeliverReport;
use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\ReportSummary;
use App\Models\UserReportChannel;
use App\Services\ReportDeliveryService;
use App\Services\ReportGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReportsController extends Controller
{
    private const KINDS = [
        Report::KIND_DAILY,
        Report::KIND_WEEKLY,
        Report::KIND_MONTHLY,
        Report::KIND_YEARLY,
    ];

    /**
     * List the calling user's work recaps, optionally filtered by period kind.
     *
     * The full content only travels with the detail page; the list carries a
     * short headline summary so the PWA stays light with many reports.
     */
    public function index(Request $request): \Inertia\Response
    {
        $kind = $request->query('period_kind');
        $filter = in_array($kind, self::KINDS, true) ? $kind : null;

        $page = max(1, (int) $request->query('page', 1));
        $perPage = 30;

        $query = Report::where('user_id', Auth::id())
            ->when($filter, fn ($q) => $q->where('period_kind', $filter))
            ->orderByDesc('period_end')
            ->orderByDesc('generated_at');

        $hasMore = $query->count() > $page * $perPage;

        $rows = $query->forPage($page, $perPage)->get();

        // Structured recaps live in their own table; legacy reports without a
        // row fall back to parsing the raw content, so nothing is lost.
        $summaries = ReportSummary::whereIn('report_id', $rows->pluck('id'))->get()->keyBy('report_id');

        $reports = $rows
            ->map(function (Report $report) use ($summaries) {
                $digest = $summaries->get($report->id)?->digest;

                return [
                    'id' => $report->id,
                    'period_kind' => $report->period_kind,
                    'period_start' => $report->period_start->toDateString(),
                    'period_end' => $report->period_end->toDateString(),
                    'generated_at' => $report->generated_at?->toDateTimeString(),
                    'summary' => $digest !== null && $digest !== '' ? self::clip($digest) : self::summary($report->content),
                ];
            })
            ->values();

        $channels = Auth::user()->reportChannels()
            ->get()
            ->sortBy('channel')
            ->map(fn (UserReportChannel $channel) => [
                'channel' => $channel->channel,
                'enabled' => $channel->enabled,
            ])
            ->values()
            ->all();

        return inertia('Reports/Index', [
            'reports' => $reports,
            'channels' => $channels,
            'periodKind' => $filter,
            'kinds' => self::KINDS,
            'page' => $page,
            'has_more' => $hasMore,
        ]);
    }

    /**
     * Show one report's full content to its owner.
     */
    public function show(int $report): \Inertia\Response
    {
        $report = Report::where('user_id', Auth::id())->findOrFail($report);
        $summary = $report->summary()->first();

        // The comparison is computed at read time from report_summaries, so
        // legacy reports (whose content still carries the placeholder) gain
        // a live comparison without their raw content being rewritten.
        $comparison = ['lines' => [], 'previous_label' => null];
        if ($summary !== null) {
            $previous = ReportSummary::where('user_id', Auth::id())
                ->where('period_kind', $summary->period_kind)
                ->where('period_end', '<', $summary->period_end->toDateString())
                ->orderByDesc('period_end')
                ->first();

            $comparison = [
                'lines' => ReportGenerator::comparisonLines(
                    ReportGenerator::summaryAttributes($summary),
                    $previous !== null ? ReportGenerator::summaryAttributes($previous) : null
                ),
                'previous_label' => $previous !== null ? self::previousLabel($previous) : null,
            ];
        }

        return inertia('Reports/Show', [
            'report' => [
                'id' => $report->id,
                'period_kind' => $report->period_kind,
                'period_start' => $report->period_start->toDateString(),
                'period_end' => $report->period_end->toDateString(),
                'generated_at' => $report->generated_at?->toDateTimeString(),
                'content' => $report->content,
                'digest' => $summary?->digest !== null && $summary?->digest !== ''
                    ? $summary->digest
                    : self::summary($report->content),
                'visuals' => self::visuals($summary),
                'comparison' => $comparison,
            ],
        ]);
    }

    /**
     * How the "vs …" label of a previous period reads in the UI, in WIB.
     */
    private static function previousLabel(ReportSummary $previous): string
    {
        $start = CarbonImmutable::parse($previous->period_start->toDateString())->setTimezone('Asia/Jakarta');
        $end = CarbonImmutable::parse($previous->period_end->toDateString())->setTimezone('Asia/Jakarta');

        return match ($previous->period_kind) {
            Report::KIND_WEEKLY => $start->format('M j').' – '.$end->format('M j'),
            Report::KIND_MONTHLY => $start->format('F'),
            Report::KIND_YEARLY => $start->format('Y'),
            default => $start->equalTo($end) ? $start->format('M j') : $start->format('M j').' – '.$end->format('M j'),
        };
    }

    /**
     * The "At a glance" data for a report detail page: where the time went
     * (projects and categories, in minutes) and how the period's work was
     * tagged. Bar shapes, sorted by value descending (name ascending on
     * ties); missing structured data yields empty lists.
     */
    private static function visuals(?ReportSummary $summary): array
    {
        $minutesMap = static function (?array $map, string $valueKey): array {
            return collect($map ?? [])
                ->map(fn ($seconds, $name) => [
                    'name' => (string) $name,
                    $valueKey => intdiv((int) $seconds, 60),
                ])
                ->sort(fn ($a, $b) => $b[$valueKey] <=> $a[$valueKey] ?: strcmp($a['name'], $b['name']))
                ->values()
                ->all();
        };

        $tags = collect($summary?->tags ?? [])
            ->map(fn ($count, $name) => ['name' => (string) $name, 'count' => (int) $count])
            ->sort(fn ($a, $b) => $b['count'] <=> $a['count'] ?: strcasecmp($a['name'], $b['name']))
            ->values()
            ->all();

        return [
            'projects' => $minutesMap($summary?->projects_minutes, 'minutes'),
            'categories' => $minutesMap($summary?->categories, 'minutes'),
            'tags' => $tags,
        ];
    }

    /**
     * Generate (or refresh) today's daily recap on demand, queue delivery,
     * and send the owner straight to the fresh report.
     */
    public function generateNow(ReportGenerator $generator, ReportDeliveryService $delivery): RedirectResponse
    {
        $user = Auth::user();
        $day = ReportGenerator::cutoff(CarbonImmutable::now());
        [$start, $end] = ReportGenerator::periodFor(Report::KIND_DAILY, $day);

        $report = $generator->generate($user, Report::KIND_DAILY, $start, $end);
        $created = $delivery->enqueue($user, $report);

        if ($created > 0) {
            $deliveryRow = ReportDelivery::where('report_id', $report->id)->firstOrFail();
            DeliverReport::dispatch($deliveryRow->id);
        }

        return redirect()->route('reports.view', $report);
    }

    /**
     * The digest line for a report card.
     *
     * Prefers the first paragraph of the human "## Summary" section; legacy
     * reports (generated before the section existed) fall back to the
     * headline block, everything before the first section heading.
     */
    private static function summary(string $content, int $limit = 160): string
    {
        $lines = preg_split('/\n/', $content);
        $section = '';

        foreach ($lines as $line) {
            if (str_starts_with($line, '## ')) {
                $section = trim($line);
                continue;
            }

            if ($section === '## Summary') {
                if (trim($line) !== '') {
                    return self::clip(trim($line), $limit);
                }
                continue;
            }

            if ($section !== '') {
                break;
            }
        }

        // Legacy shape: the headline block, joined.
        $head = [];

        foreach ($lines as $line) {
            if (str_starts_with($line, '## ')) {
                break;
            }
            if (trim($line) === '') {
                continue;
            }
            $head[] = trim($line);
        }

        $text = implode(' | ', $head);

        return self::clip($text, $limit);
    }

    /**
     * Truncate a recap line for card display.
     */
    private static function clip(string $text, int $limit = 160): string
    {
        return mb_strlen($text) > $limit ? mb_substr($text, 0, $limit - 1).'…' : $text;
    }
}
