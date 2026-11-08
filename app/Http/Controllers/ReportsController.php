<?php

namespace App\Http\Controllers;

use App\Jobs\DeliverReport;
use App\Models\Report;
use App\Models\ReportDelivery;
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

        $reports = Report::where('user_id', Auth::id())
            ->when($filter, fn ($query) => $query->where('period_kind', $filter))
            ->orderByDesc('period_end')
            ->orderByDesc('generated_at')
            ->get()
            ->map(fn (Report $report) => [
                'id' => $report->id,
                'period_kind' => $report->period_kind,
                'period_start' => $report->period_start->toDateString(),
                'period_end' => $report->period_end->toDateString(),
                'generated_at' => $report->generated_at?->toDateTimeString(),
                'summary' => self::summary($report->content),
            ])
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
        ]);
    }

    /**
     * Show one report's full content to its owner.
     */
    public function show(int $report): \Inertia\Response
    {
        $report = Report::where('user_id', Auth::id())->findOrFail($report);

        return inertia('Reports/Show', [
            'report' => [
                'id' => $report->id,
                'period_kind' => $report->period_kind,
                'period_start' => $report->period_start->toDateString(),
                'period_end' => $report->period_end->toDateString(),
                'generated_at' => $report->generated_at?->toDateTimeString(),
                'content' => $report->content,
            ],
        ]);
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

        return redirect()->route('reports.show', $report);
    }

    /**
     * The headline block of a report: everything before the first section.
     */
    private static function summary(string $content, int $limit = 320): string
    {
        $lines = [];

        foreach (preg_split('/\n/', $content) as $line) {
            if (str_starts_with($line, '## ')) {
                break;
            }
            if (trim($line) === '') {
                continue;
            }
            $lines[] = trim($line);
        }

        $text = implode(' | ', $lines);

        return mb_strlen($text) > $limit ? mb_substr($text, 0, $limit). '…' : $text;
    }
}
