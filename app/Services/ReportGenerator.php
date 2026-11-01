<?php

namespace App\Services;

use App\Models\AgentSession;
use App\Models\Report;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class ReportGenerator
{
    /**
     * The reporting date for a moment in WIB.
     *
     * Between 23:00 and 23:54 WIB the day is still "open" and the report
     * belongs to the previous date; at/after 23:55 the day has closed and
     * the report belongs to the current date. All other times belong to the
     * current date.
     */
    public static function cutoff(CarbonImmutable $now): CarbonImmutable
    {
        $wib = $now->setTimezone('Asia/Jakarta');
        $time = $wib->format('H:i');

        return ($time >= '23:00' && $time < '23:55')
            ? $wib->startOfDay()->subDay()
            : $wib->startOfDay();
    }

    /**
     * Every report period that is due between the first session date and now.
     *
     * @return array<int, array{0: string, 1: CarbonImmutable, 2: CarbonImmutable}>
     */
    public static function duePeriods(CarbonImmutable $firstSessionDate, CarbonImmutable $now): array
    {
        $end = self::cutoff($now)->startOfDay();
        $day = $firstSessionDate->setTimezone('Asia/Jakarta')->startOfDay();
        $out = [];

        // Iterate day-by-day, matching the Python loop. A period is only emitted
        // if its "end" day has closed by the cutoff time.
        $cursor = $day;
        while ($cursor->lessThanOrEqualTo($end)) {
            $out[] = ['daily', $cursor->copy(), $cursor->copy()];
            if ($cursor->isSunday()) {
                $out[] = ['weekly', $cursor->copy()->subDays(6), $cursor->copy()];
            }
            if ($cursor->copy()->addDay()->month !== $cursor->month) {
                $out[] = ['monthly', $cursor->copy()->startOfMonth(), $cursor->copy()];
            }
            if ($cursor->month === 12 && $cursor->day === 31) {
                $out[] = ['yearly', $cursor->copy()->startOfYear(), $cursor->copy()];
            }
            $cursor = $cursor->addDay()->setTimezone('Asia/Jakarta')->startOfDay();
        }

        return $out;
    }

    /**
     * Render a report body for a period, reproducing the section order of the Python version.
     */
    public function render(string $periodKind, CarbonImmutable $start, CarbonImmutable $end, Collection $sessions): string
    {
        $wibStart = $start->setTimezone('Asia/Jakarta')->startOfDay();
        $wibEnd = $end->setTimezone('Asia/Jakarta')->startOfDay();

        $projects = $sessions->map->project->filter()->unique()->sort()->values();

        $completed = $sessions
            ->filter(fn (AgentSession $session) => $session->status === AgentSession::STATUS_COMPLETED
                && $session->completed_at
                && $session->completed_at->setTimezone('Asia/Jakarta')->startOfDay()->between($wibStart, $wibEnd))
            ->count();

        $pending = $sessions
            ->filter(fn (AgentSession $session) => in_array(
                $session->status,
                [AgentSession::STATUS_IN_PROGRESS, AgentSession::STATUS_BLOCKED],
                true
            ))
            ->count();

        $seconds = (int) $sessions->sum(fn (AgentSession $session) => (int) $session->duration_seconds);

        $machines = $sessions
            ->map(fn (AgentSession $session) => $session->machine ?: 'unknown')
            ->filter()
            ->unique()
            ->sort()
            ->values();

        $heading = match ($periodKind) {
            'daily' => 'Daily Activity Summary',
            'weekly' => 'Weekly Productivity Report',
            'monthly' => 'Monthly Performance Report',
            'yearly' => 'Yearly Activity Review',
            default => 'Activity Summary',
        };

        $lines = [
            sprintf('# %s: %s - %s', $heading, $wibStart->toDateString(), $wibEnd->toDateString()),
            '',
            sprintf('- Machines: %s', $machines->isNotEmpty() ? $machines->implode(', ') : 'Unavailable'),
            sprintf('- Projects: %d', $projects->count()),
            sprintf('- Tasks completed: %d', $completed),
            sprintf('- Tasks in progress or blocked: %d', $pending),
            sprintf('- Observed active-turn time: %d minutes (not total working time)', intdiv($seconds, 60)),
            '',
            '## Work by project',
            '',
        ];

        foreach ($projects as $project) {
            $lines[] = sprintf('### %s', $project);
            $lines[] = '';

            foreach ($sessions as $session) {
                if ($session->project !== $project) {
                    continue;
                }

                $lines[] = sprintf('- **%s** — %s (%s)', $session->title, $session->status, $session->category);

                $files = (array) ($session->files_changed ?? []);
                if ($files !== []) {
                    $lines[] = '  - Modified files: '.implode(', ', array_slice($files, 0, 20));
                }

                $errors = (array) ($session->errors ?? []);
                if ($errors !== []) {
                    $lines[] = '  - Observed issues: '.implode('; ', array_slice($errors, 0, 5));
                }

                if (! empty($session->outcome)) {
                    $lines[] = '  - Outcome: '.AgentSessionIngestor::redact((string) $session->outcome, 250);
                }

                $lines[] = '';
            }
        }

        $lines[] = '## Outstanding work';
        $lines[] = '';

        $outstanding = $sessions
            ->filter(fn (AgentSession $session) => in_array(
                $session->status,
                [AgentSession::STATUS_IN_PROGRESS, AgentSession::STATUS_BLOCKED],
                true
            ))
            ->map(fn (AgentSession $session) => sprintf(
                '- %s: %s (%s)',
                $session->project,
                $session->title,
                $session->status
            ));

        $lines = array_merge($lines, $outstanding->isNotEmpty() ? $outstanding->all() : ['- None recorded.']);

        $lines[] = '';
        $lines[] = '## Next actions';
        $lines[] = '';
        $lines[] = '- Continue from activity/ACTIVE.md.';
        $lines[] = '';
        $lines[] = '## Historical comparison';
        $lines[] = '';
        $lines[] = '- Unavailable until automated records exist for both periods.';
        $lines[] = '';

        return implode("\n", $lines);
    }

    /**
     * Generate (or refresh) a single period report. Idempotent on report_key.
     */
    public function generate(User $user, string $periodKind, CarbonImmutable $start, CarbonImmutable $end): Report
    {
        $reportKey = sprintf('%s:%s:%s', $periodKind, $start->toDateString(), $end->toDateString());

        // Boundaries are expressed in WIB (the zone reports are labelled in), then
        // converted to UTC before binding. The timestamp columns are
        // `timestamp without time zone` holding UTC, so binding the WIB wall
        // clock cost 7 hours of offset and pushed early-morning sessions out of
        // the window entirely (a 08:34 WIB session matched nothing).
        $wibStart = $start->setTimezone('Asia/Jakarta')->startOfDay();
        $wibEnd = $end->setTimezone('Asia/Jakarta')->endOfDay();
        $utcStart = $wibStart->setTimezone('UTC')->format('Y-m-d H:i:s');
        $utcEnd = $wibEnd->setTimezone('UTC')->format('Y-m-d H:i:s');

        $sessions = AgentSession::where('user_id', $user->id)
            ->where('started_at', '<=', $utcEnd)
            ->where(function ($query) use ($utcStart) {
                $query->where('last_activity_at', '>=', $utcStart)
                    ->orWhere('started_at', '>=', $utcStart);
            })
            ->orderBy('project')
            ->orderBy('title')
            ->get();

        $content = $this->render($periodKind, $start, $end, $sessions);

        return Report::updateOrCreate(
            [
                'user_id' => $user->id,
                'report_key' => $reportKey,
            ],
            [
                'period_kind' => $periodKind,
                'period_start' => $start->toDateString(),
                'period_end' => $end->toDateString(),
                'content' => $content,
                'generated_at' => now(),
            ]
        );
    }

    /**
     * Generate every period that is due for a user as of $now.
     *
     * @return Collection<int, Report>
     */
    public function generateDue(User $user, ?CarbonInterface $now = null): Collection
    {
        $now = $now ? CarbonImmutable::instance($now) : CarbonImmutable::now();

        $earliest = AgentSession::where('user_id', $user->id)->min('started_at');
        if (! $earliest) {
            return collect();
        }

        $first = CarbonImmutable::parse($earliest)->setTimezone('Asia/Jakarta')->startOfDay();
        $reports = collect();

        foreach (self::duePeriods($first, $now) as [$kind, $start, $end]) {
            $reports->push($this->generate($user, $kind, $start, $end));
        }

        return $reports;
    }
}
