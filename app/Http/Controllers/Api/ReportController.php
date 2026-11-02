<?php

namespace App\Http\Controllers\Api;

use App\Jobs\DeliverReport;
use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\UserReportChannel;
use App\Services\ReportDeliveryService;
use App\Services\ReportGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\Rule;

class ReportController
{
    private const KINDS = [
        Report::KIND_DAILY,
        Report::KIND_WEEKLY,
        Report::KIND_MONTHLY,
        Report::KIND_YEARLY,
    ];

    /**
     * Generate a report for a period, then dispatch delivery jobs.
     */
    public function generate(Request $request, ReportGenerator $generator, ReportDeliveryService $delivery): JsonResponse
    {
        $payload = $request->validate([
            'period_kind' => ['sometimes', Rule::in(self::KINDS)],
            'date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ]);

        $kind = $payload['period_kind'] ?? Report::KIND_DAILY;
        $date = CarbonImmutable::parse($payload['date'] ?? today('Asia/Jakarta'), 'Asia/Jakarta')->startOfDay();

        // The period must match the requested kind. Passing $date as both start
        // and end collapsed a weekly or monthly request into a single day, so the
        // API produced "weekly:2026-11-02:2026-11-02" and only ever counted one
        // day of work.
        [$start, $end] = ReportGenerator::periodFor($kind, $date);

        $report = $generator->generate(Auth::user(), $kind, $start, $end);
        $created = $this->deliverReport($report, $delivery)->enqueued;

        return response()->json([
            'success' => true,
            'data' => $report,
            'enqueued' => $created,
        ]);
    }

    /**
     * Enqueue delivery jobs for a pending report (by key, or all not-yet-delivered).
     */
    public function deliver(Request $request, ReportDeliveryService $delivery): JsonResponse
    {
        $reportKey = $request->input('report_key');

        if ($reportKey) {
            $report = Report::where('user_id', Auth::id())->where('report_key', $reportKey)->firstOrFail();
            $enqueued = $this->deliverReport($report, $delivery)->enqueued;

            return response()->json(['success' => true, 'enqueued' => $enqueued]);
        }

        $enqueued = $delivery->enqueueForReports(Auth::user(), Report::where('user_id', Auth::id())->get());

        // One job per delivery row: the previous loop dispatched a single job per
        // report, so any channel beyond the first waited for the 15-minute sweep.
        $enqueued->each(fn (ReportDelivery $row) => DeliverReport::dispatch($row->id));

        return response()->json(['success' => true, 'enqueued' => $enqueued->count()]);
    }

    private function deliverReport(Report $report, ReportDeliveryService $delivery): \stdClass
    {
        $created = $delivery->enqueueForReports(Auth::user(), collect([$report]));

        $created->each(fn (ReportDelivery $row) => DeliverReport::dispatch($row->id));

        return (object) ['enqueued' => $created->count()];
    }

    /**
     * List the caller's reports, optionally filtered.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Report::where('user_id', Auth::id());

        if ($request->query('period_kind')) {
            $query->where('period_kind', $request->query('period_kind'));
        }
        if ($request->query('from')) {
            $query->whereDate('period_end', '>=', $request->query('from'));
        }
        if ($request->query('to')) {
            $query->whereDate('period_start', '<=', $request->query('to'));
        }

        $reports = $query->orderByDesc('period_end')->get();

        return response()->json(['success' => true, 'data' => $reports]);
    }

    /**
     * List the caller's report channels without leaking the webhook URL.
     */
    public function channels(Request $request): JsonResponse
    {
        $channels = UserReportChannel::where('user_id', Auth::id())
            ->get()
            ->map(fn (UserReportChannel $channel) => [
                'id' => $channel->id,
                'channel' => $channel->channel,
                'chat_id' => $channel->chat_id,
                'enabled' => $channel->enabled,
                'updated_at' => $channel->updated_at,
                'webhook_url_set' => $channel->webhook_url !== null,
            ]);

        return response()->json(['success' => true, 'data' => $channels]);
    }

    /**
     * Create or update a report channel (upsert per user+channel).
     */
    public function storeChannel(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'channel' => ['required', Rule::in([UserReportChannel::CHANNEL_DISCORD, UserReportChannel::CHANNEL_TELEGRAM])],
            'webhook_url' => ['required', 'url', 'starts_with:https://'],
            'chat_id' => ['sometimes', 'nullable', 'string', 'max:64'],
            'enabled' => ['sometimes', 'boolean'],
        ]);

        $channel = UserReportChannel::updateOrCreate(
            ['user_id' => Auth::id(), 'channel' => $payload['channel']],
            [
                'webhook_url' => $payload['webhook_url'],
                'chat_id' => $payload['chat_id'] ?? null,
                'enabled' => $payload['enabled'] ?? true,
            ]
        );

        return response()->json(['success' => true, 'data' => [
            'id' => $channel->id,
            'channel' => $channel->channel,
            'chat_id' => $channel->chat_id,
            'enabled' => $channel->enabled,
            'updated_at' => $channel->updated_at,
            'webhook_url_set' => true,
        ]], 201);
    }

    /**
     * Remove a channel for the caller.
     */
    public function destroyChannel(Request $request, string $channel): JsonResponse
    {
        UserReportChannel::where('user_id', Auth::id())
            ->where('channel', $channel)
            ->delete();

        return response()->json(['success' => true]);
    }
}
