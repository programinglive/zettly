<?php

namespace App\Services;

use App\Models\AgentSession;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\ReportSummary;
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
        int $undatedCompletions = 0,
        ?array $previousSummary = null
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
            $this->topTags($todos, $journalEntries),
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

        $projectsMinutes = [];
        foreach ($sessions as $session) {
            $name = $session->project ?: 'unknown';
            $projectsMinutes[$name] = ($projectsMinutes[$name] ?? 0) + (int) $session->duration_seconds;
        }

        foreach (self::comparisonLines([
            'active_minutes' => intdiv($seconds, 60),
            'tasks_completed' => $completed + $todosCompleted,
            'projects_minutes' => $projectsMinutes,
            'tags' => $this->tagCountsFor($todos, $journalEntries),
        ], $previousSummary) as $comparisonLine) {
            $lines[] = '- '.$comparisonLine;
        }

        $lines[] = '';

        return implode("\n", $lines);
    }

    /**
     * The deterministic "## Historical comparison" lines.
     *
     * Both arguments are the flat metric shapes of a report_summaries row
     * (see summaryAttributes()). $previous is null when no earlier report of
     * the same kind exists - the honest placeholder stays; a quiet previous
     * period yields one explanation line instead of misleading zeros.
     *
     * @param array $current
     * @param array|null $previous
     * @return array<int, string>
     */
    public static function comparisonLines(array $current, ?array $previous): array
    {
        if ($previous === null) {
            return ['Unavailable until automated records exist for both periods.'];
        }

        $quiet = (int) ($previous['active_minutes'] ?? 0) === 0
            && (int) ($previous['tasks_completed'] ?? 0) === 0
            && empty($previous['projects_minutes'])
            && empty($previous['tags']);

        if ($quiet) {
            return ['No activity recorded in the previous period, so there is no baseline to compare yet.'];
        }

        $lines = [];

        $curMinutes = (int) ($current['active_minutes'] ?? 0);
        $prevMinutes = (int) ($previous['active_minutes'] ?? 0);
        $diff = $curMinutes - $prevMinutes;

        // Both sides zero means no active time was recorded at all: an
        // "0 vs 0" line carries no information, so it is suppressed and a
        // single honest hint is appended instead (see the bottom of the
        // method).
        $suppressActive = $curMinutes === 0 && $prevMinutes === 0;
        if (!$suppressActive) {
            $delta = $prevMinutes === 0
                ? 'no baseline yet'
                : ($diff === 0
                    ? '0%'
                    : ($diff > 0 ? '+' : '-').intdiv(abs($diff) * 100, $prevMinutes).'%');
            $lines[] = sprintf('Active time: %d min vs %d min (%s).', $curMinutes, $prevMinutes, $delta);
        }

        $lines[] = sprintf('Tasks completed: %d vs %d.', (int) ($current['tasks_completed'] ?? 0), (int) ($previous['tasks_completed'] ?? 0));

        $curProject = self::topEntry($current['projects_minutes'] ?? []);
        $prevProject = self::topEntry($previous['projects_minutes'] ?? []);
        // Sub-minute entries round to 0 and are treated as "not recorded",
        // same as the all-zero active time above.
        $suppressProject = ($curProject === null || $curProject[1] === 0)
            && ($prevProject === null || $prevProject[1] === 0);
        if (!$suppressProject) {
            if ($curProject !== null && $prevProject !== null) {
                $lines[] = sprintf('Top project: %s (%d min) vs %s (%d min).', $curProject[0], $curProject[1], $prevProject[0], $prevProject[1]);
            } elseif ($curProject !== null) {
                $lines[] = sprintf('Top project: %s (%d min); none in the previous period.', $curProject[0], $curProject[1]);
            } elseif ($prevProject !== null) {
                $lines[] = sprintf('Top project: none this period; %s (%d min) previously.', $prevProject[0], $prevProject[1]);
            }
        }

        $curTags = self::topNames($current['tags'] ?? []);
        $prevTags = self::topNames($previous['tags'] ?? []);
        if ($curTags !== [] && $prevTags !== []) {
            $lines[] = 'Top tags: '.implode(', ', $curTags).' vs '.implode(', ', $prevTags).'.';
        } elseif ($curTags !== []) {
            $lines[] = 'Top tags: '.implode(', ', $curTags).'; none in the previous period.';
        } elseif ($prevTags !== []) {
            $lines[] = 'Top tags: none this period; '.implode(', ', $prevTags).' previously.';
        }

        if ($suppressActive && $suppressProject) {
            $lines[] = 'No active-time baseline yet: agent sessions have not recorded time.';
        }

        return $lines;
    }

    /**
     * The flat metric shape of a report_summaries row, for comparisonLines().
     */
    public static function summaryAttributes(ReportSummary $summary): array
    {
        return [
            'active_minutes' => (int) $summary->active_minutes,
            'tasks_completed' => (int) $summary->tasks_completed,
            'tasks_open' => (int) $summary->tasks_open,
            'projects_minutes' => $summary->projects_minutes ?? [],
            'categories' => $summary->categories ?? [],
            'tags' => $summary->tags ?? [],
            'machines' => $summary->machines ?? [],
        ];
    }

    /**
     * The single largest entry of a name => seconds map, as [name, minutes];
     * ties broken by name ascending. Null when the map is empty.
     *
     * @return array{0: string, 1: int}|null
     */
    private static function topEntry(array $map): ?array
    {
        $best = null;

        foreach ($map as $name => $seconds) {
            $minutes = intdiv((int) $seconds, 60);
            if ($best === null || $minutes > $best[1] || ($minutes === $best[1] && strcasecmp((string) $name, $best[0]) < 0)) {
                $best = [(string) $name, $minutes];
            }
        }

        return $best;
    }

    /**
     * Up to three tag names, by count descending then name (case-insensitive).
     * @return array<int, string>
     */
    private static function topNames(array $map, int $limit = 3): array
    {
        $pairs = array_map(fn ($name, $count) => [(string) $name, (int) $count], array_keys($map), $map);
        usort($pairs, fn ($a, $b) => $b[1] <=> $a[1] ?: strcasecmp($a[0], $b[0]));

        return array_map(fn ($pair) => $pair[0], array_slice($pairs, 0, $limit));
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
        int $openTodos,
        array $topTags = []
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

        if ($topTags !== []) {
            $sentences[] = 'Top tags: '.implode(', ', $topTags).';';
        }

        return implode(' ', $sentences) ?: 'No recorded activity in this period.';
    }

    /**
     * The zettelkasten layer of the recap: how the period's todos (completed
     * in the period, or still open) plus the todos linked from journal
     * entries are tagged. Returns tag name => count, sorted by count then
     * name (ties broken alphabetically, case-insensitive).
     */
    private function tagCountsFor(Collection $todos, Collection $journalEntries): array
    {
        $linkedIds = $journalEntries
            ->map(fn (JournalEntry $entry) => $entry->todo_id)
            ->filter()
            ->unique()
            ->values();

        $pool = $todos;
        if ($linkedIds->isNotEmpty()) {
            $pool = $pool->concat(Todo::whereIn('id', $linkedIds)->get())->unique('id')->values();
        }

        $counts = [];

        foreach ($pool as $todo) {
            $todo->load('tags');
            foreach ($todo->tags as $tag) {
                $name = (string) $tag->name;
                $counts[$name] = ($counts[$name] ?? 0) + 1;
            }
        }

        // Count descending, name ascending on ties - stable and readable.
        $pairs = [];
        foreach ($counts as $name => $count) {
            $pairs[] = [$name, $count];
        }
        usort($pairs, fn ($a, $b) => $b[1] <=> $a[1] ?: strcasecmp($a[0], $b[0]));

        $sorted = [];
        foreach ($pairs as [$name, $count]) {
            $sorted[$name] = $count;
        }

        return $sorted;
    }

    /**
     * Up to three most-used tag names in a period, for the digest line.
     */
    private function topTags(Collection $todos, Collection $journalEntries, int $limit = 3): array
    {
        return array_slice(array_keys($this->tagCountsFor($todos, $journalEntries)), 0, $limit);
    }

    /**
     * Generate (or refresh) a single period report. Idempotent on report_key.
     */
    public function generate(User $user, string $periodKind, CarbonImmutable $start, CarbonImmutable $end): Report
    {
        $reportKey = sprintf('%s:%s:%s', $periodKind, $start->toDateString(), $end->toDateString());

        [$sessions, $journalEntries, $todos, $undatedCompletions] = $this->rawDataFor($user, $start, $end);

        // The comparison baseline: the latest earlier report of the same kind.
        // generateDue() runs chronologically, so that report already has its
        // summary row by the time its successor is generated.
        $previous = ReportSummary::where('user_id', $user->id)
            ->where('period_kind', $periodKind)
            ->where('period_end', '<', $start->toDateString())
            ->orderByDesc('period_end')
            ->first();

        $content = $this->render(
            $periodKind,
            $start,
            $end,
            $sessions,
            $journalEntries,
            $todos,
            $undatedCompletions,
            $previous !== null ? self::summaryAttributes($previous) : null
        );

        $report = Report::updateOrCreate(
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

        // The structured recap lives in its own table so the UI can read it
        // without ever re-parsing - or rewriting - the raw content column.
        ReportSummary::updateOrCreate(
            ['report_id' => $report->id],
            $this->recapAttributesFor($report, $start, $end, $sessions, $journalEntries, $todos)
        );

        return $report;
    }

    /**
     * The report_summaries attributes for one report, derived from the same
     * raw data that the content column was rendered from.
     */
    public function recapAttributesFor(
        Report $report,
        CarbonImmutable $start,
        CarbonImmutable $end,
        Collection $sessions,
        Collection $journalEntries,
        Collection $todos
    ): array {
        $projectsMinutes = $sessions
            ->groupBy(fn (AgentSession $session) => $session->project ?: 'unknown')
            ->map(fn ($group) => (int) $group->sum('duration_seconds'));

        $categories = $sessions
            ->groupBy(fn (AgentSession $session) => $session->category ?: 'uncategorized')
            ->map(fn ($group) => (int) $group->sum('duration_seconds'));

        $machines = $sessions
            ->map(fn (AgentSession $session) => $session->machine ?: 'unknown')
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        $metrics = $this->metricsFor($start, $end, $sessions, $journalEntries, $todos);

        return [
            'report_id' => $report->id,
            'user_id' => $report->user_id,
            'period_kind' => $report->period_kind,
            'period_start' => $start->toDateString(),
            'period_end' => $end->toDateString(),
            'digest' => $metrics['digest'],
            'active_minutes' => intdiv($metrics['seconds'], 60),
            'tasks_completed' => $metrics['completed'] + $metrics['todosCompleted'],
            'tasks_open' => $metrics['pending'] + $metrics['openTodosCount'],
            'projects_minutes' => $projectsMinutes->all(),
            'categories' => $categories->all(),
            'tags' => $metrics['tagCounts'],
            'machines' => $machines,
        ];
    }

    /**
     * Fill the structured recap of a report whose summary row is missing
     * (legacy reports from before report_summaries existed). Idempotent:
     * reports that already have a row are left untouched, and the raw
     * content column is never written.
     */
    public function backfillSummary(Report $report): ?ReportSummary
    {
        $existing = $report->summary()->first();

        if ($existing !== null) {
            return $existing;
        }

        $start = CarbonImmutable::parse($report->period_start);
        $end = CarbonImmutable::parse($report->period_end);

        [$sessions, $journalEntries, $todos] = $this->rawDataFor($report->user, $start, $end);

        return ReportSummary::create(
            $this->recapAttributesFor($report, $start, $end, $sessions, $journalEntries, $todos)
        );
    }

    /**
     * The raw records a report period is built from. Shared by generate()
     * and backfillSummary() so both read identical data.
     *
     * @return array{0: Collection, 1: Collection, 2: Collection, 3: int}
     */
    private function rawDataFor(User $user, CarbonImmutable $start, CarbonImmutable $end): array
    {
        // Boundaries are expressed in WIB (the zone reports are labelled in),
        // then converted to UTC before binding. The timestamp columns are
        // `timestamp without time zone` holding UTC, so binding the WIB wall
        // clock cost 7 hours of offset and pushed early-morning sessions out
        // of the window entirely (a 08:34 WIB session matched nothing).
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

        // Historical record. entry_date is a plain date, so it compares
        // directly against the WIB calendar days the report is labelled with.
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

        // Marked done but with no completion date, so they belong to no
        // period. Counted so the report can say they exist.
        $undatedCompletions = Todo::where('user_id', $user->id)
            ->where('is_completed', true)
            ->whereNull('completed_at')
            ->where('archived', false)
            ->count();

        return [$sessions, $journalEntries, $todos, $undatedCompletions];
    }

    /**
     * The headline numbers a report and its summary share.
     */
    private function metricsFor(
        CarbonImmutable $start,
        CarbonImmutable $end,
        Collection $sessions,
        Collection $journalEntries,
        Collection $todos
    ): array {
        $wibStart = $start->setTimezone('Asia/Jakarta')->startOfDay();
        $wibEnd = $end->setTimezone('Asia/Jakarta')->startOfDay();

        $completed = $sessions
            ->filter(fn (AgentSession $session) => $session->status === AgentSession::STATUS_COMPLETED
                && $session->completed_at
                && $session->completed_at->setTimezone('Asia/Jakarta')->startOfDay()->between($wibStart, $wibEnd))
            ->count();

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

        $journalDays = $journalEntries->count();
        $todosCompleted = $todos->filter(fn (Todo $todo) => (bool) $todo->is_completed)->count();

        $machines = $sessions
            ->map(fn (AgentSession $session) => $session->machine ?: 'unknown')
            ->filter()
            ->unique()
            ->sort()
            ->values();

        $projects = $sessions->map->project->filter()->unique()->sort()->values();

        $openTodos = $todos->reject(fn (Todo $todo) => (bool) $todo->is_completed)->values();

        $topTags = $this->topTags($todos, $journalEntries);

        return [
            'projects' => $projects,
            'completed' => $completed,
            'completedWithoutTimestamp' => $completedWithoutTimestamp,
            'pending' => $pending,
            'seconds' => $seconds,
            'journalDays' => $journalDays,
            'todosCompleted' => $todosCompleted,
            'machines' => $machines,
            'openTodos' => $openTodos,
            'openTodosCount' => $openTodos->count(),
            'topTags' => $topTags,
            'tagCounts' => $this->tagCountsFor($todos, $journalEntries),
            'digest' => $this->summarize(
                $sessions,
                $machines,
                $projects->count(),
                $completedWithoutTimestamp->merge(
                    $sessions->filter(fn (AgentSession $session) => $session->status === AgentSession::STATUS_COMPLETED
                        && $session->completed_at
                        && $session->completed_at->setTimezone('Asia/Jakarta')->startOfDay()->between($wibStart, $wibEnd))
                )->values(),
                $todosCompleted,
                $pending,
                intdiv($seconds, 60),
                $journalDays,
                $openTodos->count(),
                $topTags,
            ),
        ];
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
