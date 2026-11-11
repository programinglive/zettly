<?php

namespace App\Jobs;

use App\Models\AgentSession;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\User;
use App\Services\ReportDeliveryService;
use App\Services\ReportGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class DispatchReportGeneration implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $userId,
        public bool $backfill = false,
        public bool $deliver = true,
    ) {
    }

    /**
     * @param  \Carbon\CarbonInterface|null  $now  Injectable moment for tests; defaults to now.
     *
     * `$now` is deliberately untyped. A class-typed parameter is treated as a
     * container dependency even when it has a default, so
     * `?Carbon\CarbonInterface $now = null` made the queue worker fail with
     * "Target [Carbon\CarbonInterface] is not instantiable" (Sentry TODOAPP-6F)
     * and no nightly report was ever generated. Keep it untyped; the value is
     * normalised to CarbonImmutable below.
     */
    public function handle(ReportGenerator $generator, ReportDeliveryService $delivery, $now = null): void
    {
        $user = User::find($this->userId);
        if (! $user) {
            return;
        }

        $now = $now ? CarbonImmutable::instance($now) : CarbonImmutable::now();

        // The nightly run reports the period closing tonight, plus a write-only
        // catch-up of any periods that closed on nights the host missed.
        // generateDue() emits every period since the first record — after an
        // import that is dozens of Discord messages in one night — so the
        // full backfill stays an explicit choice.
        if ($this->backfill) {
            // An explicit --backfill --deliver asks for every past period to
            // be pushed; the command only offers that pairing with an explicit
            // flag, so honour it.
            $generated = $generator->generateDue($user, $now);
        } else {
            // The gap must be measured before tonight's reports are written,
            // otherwise max(period_end) sees them and the gap looks closed.
            $this->catchUpMissedPeriods($user, $generator, $now);

            // generateCurrent() emits only the periods closing tonight; every
            // report it returns keeps its delivery row, while the missed
            // periods written above stay out of the delivery queue on purpose.
            $generated = $generator->generateCurrent($user, $now);
        }

        if (! $this->deliver) {
            return;
        }

        foreach ($generated as $report) {
            $delivery->enqueue($user, $report);
        }
    }

    /**
     * Write the periods that closed on nights without a run: daily reports for
     * each missed day, plus any weekly / monthly / yearly period that closed
     * inside the gap. Nothing is enqueued for delivery here — the gap is
     * bounded by the host's downtime, so resending it into Discord would flood
     * the channel with stale messages. The reports stay in the database where
     * the owner can read them in the Reports workspace.
     */
    private function catchUpMissedPeriods(User $user, ReportGenerator $generator, CarbonImmutable $now): void
    {
        $cutoffDay = ReportGenerator::cutoff($now);

        $lastEnd = Report::where('user_id', $user->id)->max('period_end');

        if ($lastEnd !== null) {
            // max() returns the raw date string; parse it into WIB for the gap.
            $gapStart = CarbonImmutable::parse($lastEnd)->setTimezone('Asia/Jakarta')->startOfDay()->addDay();
        } else {
            // No report yet: close the gap from the earliest recorded activity,
            // matching the reference point generateDue() uses.
            $candidates = array_filter([
                AgentSession::where('user_id', $user->id)->min('started_at'),
                JournalEntry::where('user_id', $user->id)->min('entry_date'),
            ]);

            if ($candidates === []) {
                return;
            }

            $gapStart = CarbonImmutable::parse(min($candidates))->setTimezone('Asia/Jakarta')->startOfDay();
        }

        $gapStart = $gapStart->setTimezone('Asia/Jakarta')->startOfDay();

        if ($gapStart->greaterThanOrEqualTo($cutoffDay)) {
            return;
        }

        foreach (ReportGenerator::duePeriods($gapStart, $now) as [$kind, $start, $end]) {
            // Only periods that closed strictly before tonight's day; the
            // periods closing tonight were just generated above and keep their
            // delivery rows.
            if ($end->setTimezone('Asia/Jakarta')->startOfDay()->lessThan($cutoffDay)) {
                $generator->generate($user, $kind, $start, $end);
            }
        }
    }
}
