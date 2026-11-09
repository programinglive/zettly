<?php

namespace App\Services;

use App\Models\AgentSession;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\Todo;
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
     * The start and end dates that a period kind covers, given one date inside it.
     *
     * Daily covers that day; weekly covers the Monday..Sunday week containing it;
     * monthly and yearly cover their full calendar period. The API needs this:
     * passing a single date as both bounds silently collapsed every kind to one
     * day.
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    public static function periodFor(string $kind, CarbonImmutable $date): array
    {
        $day = $date->setTimezone('Asia/Jakarta')->startOfDay();

        return match ($kind) {
            Report::KIND_WEEKLY => [$day->startOfWeek(CarbonImmutable::MONDAY), $day->endOfWeek(CarbonImmutable::SUNDAY)->startOfDay()],
            Report::KIND_MONTHLY => [$day->startOfMonth(), $day->endOfMonth()->startOfDay()],
            Report::KIND_YEARLY => [$day->startOfYear(), $day->endOfYear()->startOfDay()],
            default => [$day, $day],
        };
    }

    /**
     * Render a report body for a period, reproducing the section order of the Python version.
     *
     * Sessions are the primary signal. Journal entries and todos are the
     * historical record: the legacy import wrote 19 dated entries and 36 todos
     * but produced no agent sessions, so a session-only report rendered those
     * days as empty. They are summarised here rather than dropped.
     *
     * @param  Collection  $journalEntries  JournalEntry rows whose entry_date falls in the period
     * @param  Collection  $todos  Todos completed in the period, or still open
     * @param  int  $undatedCompletions  Tasks marked done with no completion date
     */
    public function render(
        string $periodKind,
        CarbonImmutable $start,
        CarbonImmutable $end,
        Collection $sessions,
        Collection $journalEntries = new Collection,
        Collection $todos = new Collection,
        int $undatedCompletions = 0
    ): string
    {
        $wibStart = $start->setTimezone('Asia/Jakarta')->startOfDay();
        $wibEnd = $end->setTimezone('Asia/Jakarta')->startOfDay();

        $projects = $sessions->map->project->filter()->unique()->sort()->values();

        $completed = $sessions
            ->filter(fn (AgentSession $session) => $session->status === AgentSession::STATUS_COMPLETED
                && $session->completed_at
                && $session->completed_at->setTimezone('Asia/Jakarta')->startOfDay()->between($wibStart, $wibEnd))
            ->count();

        // Sessions recorded as completed before the hook started sending
        // completed_at have no timestamp. Counting them as zero made finished
        // work invisible; fall back to the session's own activity window.
        $completedWithoutTimestamp = $sessions
            ->filter(fn (AgentSession $session) => $session->status === AgentSession::STATUS_COMPLETED
                && ! $session->completed_at
                && $session->last_activity_at
                && $session->last_activity_at->setTimezone('Asia/Jakarta')->startOfDay()->between($wibStart, $wibEnd))
            ->values();

        $completed += $completedWithoutTimestamp->count();

        $pending = $sessions
            ->filter(fn (AgentSession $session) => in_array(
                $session->status,
                [AgentSession::STATUS_IN_PROGRESS, AgentSession::STATUS_BLOCKED],
                true
            ))
            ->count();

        $seconds = (int) $sessions->sum(fn (AgentSession $session) => (int) $session->duration_seconds);

        // A legacy day has journal activity instead of sessions; count it as work
        // so the headline numbers are not misleadingly zero.
        $journalDays = $journalEntries->count();
        $todosCompleted = $todos->filter(fn (Todo $todo) => (bool) $todo->is_completed)->count();

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
            sprintf('- Tasks completed: %d', $completed + $todosCompleted),
            sprintf('- Tasks in progress or blocked: %d', $pending),
            sprintf('- Observed active-turn time: %d minutes (not total working time)', intdiv($seconds, 60)),
        ];

        if ($journalEntries->isNotEmpty()) {
            $lines[] = sprintf('- Journal entries recorded: %d', $journalDays);
        }

        // The legacy import only knows a status, never a date, so these tasks have
        // no completion date and cannot belong to any period. They used to be
        // dropped by the query entirely - neither "completed in this period" nor
        // "still open" - so the report and the dashboard disagreed. Say so instead
        // of guessing a date: created_at on those rows is the import timestamp.
        if ($undatedCompletions > 0) {
            $lines[] = sprintf(
                '- Undated completions: %d (marked done without a recorded date; counted in no period)',
                $undatedCompletions
            );
        }

        $completedSessions = $completedWithoutTimestamp->merge(
            $sessions->filter(fn (AgentSession $session) => $session->status === AgentSession::STATUS_COMPLETED
                && $session->completed_at
                && $session->completed_at->setTimezone('Asia/Jakarta')->startOfDay()->between($wibStart, $wibEnd))
        )->values();

        $openTodos = $todos->reject(fn (Todo $todo) => (bool) $todo->is_completed)->values();

        // A short human-readable recap, built from the same numbers as the
        // headline bullets. It sits after the bullets so that shape-based
        // consumers (Discord embed, CLI formatter, redacted page) keep
        // reading the fixed machine format below; the prose stays bounded.
        $lines[] = '';
        $lines[] = '## Summary';
        $lines[] = '';
        $lines[] = $this->summarize(
            $sessions,
            $machines,
            $projects->count(),
            $completedSessions,
            $todosCompleted,
            $pending,
            intdiv($seconds, 60),
            $journalDays,
            $openTodos->count(),
        );

        $lines[] = '';
        $lines[] = '## Work by project';
        $lines[] = '';

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
            ))
            ->values()
            ->all();

        // Open todos are outstanding work too. Capped, and labelled as current:
        // a full backlog repeated under every past day would misrepresent what
        // was actually open on that date.
        foreach ($openTodos->take(10) as $todo) {
            $outstanding[] = sprintf(
                '- %s%s',
                AgentSessionIngestor::redact((string) $todo->title, 140),
                $todo->priority === Todo::PRIORITY_URGENT ? ' (urgent)' : ''
            );
        }

        $lines = array_merge($lines, $outstanding !== [] ? $outstanding : ['- None recorded.']);

        if ($openTodos->count() > 10) {
            $lines[] = sprintf('- … and %d more open todos (current backlog).', $openTodos->count() - 10);
        }

        if ($journalEntries->isNotEmpty()) {
            $lines[] = '';
            $lines[] = '## Journal entries';
            $lines[] = '';

            foreach ($journalEntries->take(10) as $entry) {
                $body = trim(preg_replace('/\s+/', ' ', (string) $entry->content));
                $lines[] = sprintf(
                    '- **%s** (%s): %s',
                    $entry->entry_date?->toDateString() ?? 'undated',
                    $entry->kind,
                    AgentSessionIngestor::redact($body, 200)
                );
            }

            if ($journalEntries->count() > 10) {
                $lines[] = sprintf('- … and %d more entries in this period.', $journalEntries->count() - 10);
            }
        }

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
     * The 2-4 sentence human recap that leads the report body.
     *
     * Templated from the same data as the headline bullets (deterministic, no
     * LLM) and kept short on purpose: it is also the first line delivered to
     * Discord and the digest line on report cards.
     */
    private function summarize(
        Collection $sessions,
        Collection $machines,
        int $projectCount,
        Collection $completedSessions,
        int $todosCompleted,
        int $pending,
        int $minutes,
        int $journalDays,
        int $openTodos
    ): string
    {
        $quiet = $sessions->isEmpty() && $journalDays === 0 && $completedSessions->isEmpty() && $todosCompleted === 0;

        if ($quiet) {
            return $openTodos > 0
                ? "No recorded activity in this period, but {$openTodos} ".($openTodos === 1 ? 'todo is still open' : "todos are still open").'.'
                : 'No recorded activity in this period.';
        }

        $sentences = [];

        if ($journalDays > 0 && $minutes === 0 && $sessions->isEmpty()) {
            $sentences[] = sprintf('You recorded %d journal entr%s.', $journalDays, $journalDays === 1 ? 'y' : 'ies');
        } else {
            $phrase = "You logged {$minutes} minute".($minutes === 1 ? '' : 's').' of active agent work';

            if ($machines->isNotEmpty()) {
                if ($machines->count() === 1) {
                    $phrase .= ' on '.$machines->first();
                } elseif ($machines->count() === 2) {
                    $phrase .= ' on '.$machines->first().' and '.$machines->last();
                } else {
                    $phrase .= ' on '.$machines->first().' and '.$machines->second()
                        .' plus '.($machines->count() - 2).' more machines';
                }
            }

            if ($projectCount === 1) {
                $phrase .= ' in 1 project';
            } elseif ($projectCount > 1) {
                $phrase .= " across {$projectCount} projects";
            }

            $sentences[] = $phrase.'.';
        }

        if ($completedSessions->isNotEmpty()) {
            $first = $completedSessions->first();
            $count = $completedSessions->count();

            $done = sprintf(
                'You completed %d %s, including "%s" in %s%s',
                $count,
                $count === 1 ? 'task' : 'tasks',
                AgentSessionIngestor::redact((string) $first->title, 60),
                $first->project,
                $todosCompleted > 0
                    ? ', and marked '.$todosCompleted.' todo'.($todosCompleted === 1 ? '' : 's').' done'
                    : ''
            );

            $sentences[] = $done.'.';
        } elseif ($todosCompleted > 0) {
            $sentences[] = sprintf('You marked %d todo%s done.', $todosCompleted, $todosCompleted === 1 ? '' : 's');
        }

        if ($pending > 0 && $openTodos > 0) {
            $sentences[] = "{$pending} task".($pending === 1 ? ' remains' : 's remain')." in progress or blocked, and {$openTodos} todo".($openTodos === 1 ? ' is' : 's are')." still open.";
        } elseif ($pending > 0) {
            $sentences[] = "{$pending} task".($pending === 1 ? ' remains' : 's remain')." in progress or blocked.";
        } elseif ($openTodos > 0) {
            $sentences[] = "{$openTodos} todo".($openTodos === 1 ? ' is' : 's are')." still open.";
        }

        return implode(' ', $sentences) ?: 'No recorded activity in this period.';
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

        // Historical record. entry_date is a plain date, so it compares directly
        // against the WIB calendar days the report is labelled with.
        $journalEntries = JournalEntry::where('user_id', $user->id)
            ->whereDate('entry_date', '>=', $wibStart->toDateString())
            ->whereDate('entry_date', '<=', $wibEnd->toDateString())
            ->orderBy('entry_date')
            ->get();

        // Todos completed inside the period, plus everything still open (a
        // legacy import has no completion date for work that never finished).
        $todos = Todo::where('user_id', $user->id)
            ->where(function ($query) use ($wibStart, $wibEnd) {
                $query->where(function ($completed) use ($wibStart, $wibEnd) {
                    $completed->where('is_completed', true)
                        ->whereBetween('completed_at', [$wibStart->format('Y-m-d H:i:s'), $wibEnd->format('Y-m-d H:i:s')]);
                })->orWhere('is_completed', false);
            })
            ->orderByDesc('is_completed')
            ->limit(200)
            ->get();

        // Marked done but with no completion date, so they belong to no period. The
        // import wrote null on purpose (ACTIVE.md carries a status, not dates), and
        // created_at on those rows is the import timestamp - attributing them would
        // invent a date. Counted so the report can say they exist.
        $undatedCompletions = Todo::where('user_id', $user->id)
            ->where('is_completed', true)
            ->whereNull('completed_at')
            ->where('archived', false)
            ->count();

        $content = $this->render($periodKind, $start, $end, $sessions, $journalEntries, $todos, $undatedCompletions);

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

        // Start from the earliest record of *any* activity, not just agent
        // sessions: an imported legacy day has journal entries and todos but no
        // sessions, and returning early left those periods unreported.
        $candidates = array_filter([
            AgentSession::where('user_id', $user->id)->min('started_at'),
            JournalEntry::where('user_id', $user->id)->min('entry_date'),
        ]);

        if ($candidates === []) {
            return collect();
        }

        $first = CarbonImmutable::parse(min($candidates))->setTimezone('Asia/Jakarta')->startOfDay();
        $reports = collect();

        foreach (self::duePeriods($first, $now) as [$kind, $start, $end]) {
            $reports->push($this->generate($user, $kind, $start, $end));
        }

        return $reports;
    }

    /**
     * The periods that belong to "now" only: today's daily, plus a weekly /
     * monthly / yearly roll-up when today is its boundary day.
     *
     * This is what the nightly schedule must use. generateDue() is the explicit
     * backfill path — calling it on a timer turns an import into a burst of
     * Discord messages.
     */
    public function generateCurrent(User $user, ?CarbonInterface $now = null): Collection
    {
        $now = $now ? CarbonImmutable::instance($now) : CarbonImmutable::now();
        $day = self::cutoff($now)->setTimezone('Asia/Jakarta')->startOfDay();

        $current = array_values(array_filter(
            self::duePeriods($day, $now),
            fn (array $period) => $period[2]->setTimezone('Asia/Jakarta')->startOfDay()->equalTo($day)
        ));

        $reports = collect();

        foreach ($current as [$kind, $start, $end]) {
            $reports->push($this->generate($user, $kind, $start, $end));
        }

        return $reports;
    }
}
