<?php

namespace App\Console\Commands;

use App\Models\AgentEvent;
use App\Models\AgentSession;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\Tag;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class ImportLegacyJournalCommand extends Command
{
    protected $signature = 'journal:import-legacy
        {--db= : Path to the legacy events.sqlite3 (default: %LOCALAPPDATA%\DailyActivityJournal\events.sqlite3)}
        {--journal-root= : Path to the legacy journal activity root containing ACTIVE.md and daily/ (default: D:\works\mine\code\daily-activity-journal\activity)}
        {--user-id= : Import into this user; defaults to the lowest user id (the owner)}
        {--dry-run : Report what would be written without changing anything}';

    protected $description = 'Import legacy daily-activity-journal data (SQLite + Markdown) into Zettly';

    private const JOURNAL_TAG = '@journal';

    private array $counts = [
        'agent_sessions' => ['created' => 0, 'skipped' => 0],
        'agent_events' => ['created' => 0, 'skipped' => 0],
        'reports' => ['created' => 0, 'skipped' => 0],
        'todos' => ['created' => 0, 'skipped' => 0],
        'journal_entries' => ['created' => 0, 'skipped' => 0],
    ];

    public function handle(): int
    {
        $userId = (int) $this->option('user-id');
        if ($userId === 0) {
            $userId = (int) User::orderBy('id')->first()->id;
        }

        $user = User::findOrFail($userId);

        $dbPath = (string) ($this->option('db')
            ?: (getenv('LOCALAPPDATA').'\DailyActivityJournal\events.sqlite3'));
        $root = (string) ($this->option('journal-root')
            ?: 'D:\works\mine\code\daily-activity-journal\activity');

        $pdo = null;
        if (is_file($dbPath)) {
            try {
                $pdo = new \PDO('sqlite:'.$dbPath);
            } catch (\Throwable $e) {
                $this->warn('Could not open SQLite DB at '.$dbPath.': '.$e->getMessage());
                $pdo = null;
            }
        } else {
            $this->warn('Legacy SQLite database not found at '.$dbPath.' — skipping sessions, events, and reports.');
        }

        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            DB::beginTransaction();
        }

        try {
            if ($pdo !== null) {
                $this->importSessions($pdo, $user->id);
                $this->importEvents($pdo, $user->id);
                $this->importReports($pdo, $user->id);
            }

            $activePath = $root.DIRECTORY_SEPARATOR.'ACTIVE.md';
            if (is_file($activePath)) {
                $this->importActiveMd($activePath, $user->id);
            } else {
                $this->warn('ACTIVE.md not found at '.$activePath.' — skipping todo import.');
            }

            $this->importDailyMarkdown($root, $user->id);

            if ($dryRun) {
                DB::rollBack();
                $this->info('Dry run complete — nothing was written.');
            }
        } catch (\Throwable $e) {
            if ($dryRun) {
                DB::rollBack();
            }
            throw $e;
        }

        $this->table(
            ['Destination', 'Created', 'Skipped'],
            array_map(
                fn (string $key, array $row) => [$key, $row['created'], $row['skipped']],
                array_keys($this->counts),
                array_values($this->counts)
            )
        );

        return self::SUCCESS;
    }

    private function importSessions(\PDO $pdo, int $userId): void
    {
        $rows = $pdo->query("SELECT * FROM tasks")->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        foreach ($rows as $row) {
            $sessionId = (string) ($row['session'] ?? '');
            if ($sessionId === '') {
                $this->counts['agent_sessions']['skipped']++;
                continue;
            }

            $exists = AgentSession::where('user_id', $userId)
                ->where('session_id', $sessionId)
                ->exists();

            if ($exists) {
                $this->counts['agent_sessions']['skipped']++;
                continue;
            }

            AgentSession::create([
                'user_id' => $userId,
                'session_id' => $sessionId,
                'project' => (string) ($row['project'] ?? 'unknown'),
                'title' => (string) ($row['title'] ?? 'Legacy task'),
                'category' => (string) ($row['category'] ?? 'Development'),
                'status' => (string) ($row['status'] ?? AgentSession::STATUS_IN_PROGRESS),
                'started_at' => $row['start'] ?? null,
                'last_activity_at' => $row['last'] ?? null,
                'completed_at' => $row['completed'] ?? null,
                'duration_seconds' => (int) ($row['seconds'] ?? 0),
                'files_changed' => $this->decodeList($row['files'] ?? '[]'),
                'errors' => $this->decodeList($row['errors'] ?? '[]'),
                'outcome' => $row['outcome'] !== null && $row['outcome'] !== ''
                    ? (string) $row['outcome']
                    : null,
                'machine' => (string) ($row['machine'] ?? 'unknown'),
            ]);

            $this->counts['agent_sessions']['created']++;
        }
    }

    private function importEvents(\PDO $pdo, int $userId): void
    {
        // Build a task-id -> session-id map from the SQLite tasks table
        $taskToSession = [];
        $taskRows = $pdo->query("SELECT id, session FROM tasks")->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        foreach ($taskRows as $t) {
            $taskId = (string) ($t['id'] ?? '');
            $sessId = (string) ($t['session'] ?? '');
            if ($taskId !== '' && $sessId !== '') {
                $taskToSession[$taskId] = $sessId;
            }
        }

        $rows = $pdo->query("SELECT * FROM events")->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        foreach ($rows as $row) {
            $eventKey = (string) ($row['key'] ?? '');
            if ($eventKey === '') {
                $this->counts['agent_events']['skipped']++;
                continue;
            }

            $taskKey = (string) ($row['task'] ?? '');
            $sessionId = $taskToSession[$taskKey] ?? '';

            if ($sessionId === '') {
                $this->counts['agent_events']['skipped']++;
                continue;
            }

            $agentSessionId = AgentSession::where('user_id', $userId)
                ->where('session_id', $sessionId)
                ->value('id');

            if ($agentSessionId === null) {
                $this->counts['agent_events']['skipped']++;
                continue;
            }

            $exists = AgentEvent::where('event_key', $eventKey)->exists();

            if ($exists) {
                $this->counts['agent_events']['skipped']++;
                continue;
            }

            AgentEvent::create([
                'user_id' => $userId,
                'agent_session_id' => $agentSessionId,
                'event_key' => $eventKey,
                'kind' => (string) ($row['kind'] ?? 'unknown'),
                'occurred_at' => $row['at'] ?? null,
                'detail' => $row['detail'] ?? null,
            ]);

            $this->counts['agent_events']['created']++;
        }
    }

    private function importReports(\PDO $pdo, int $userId): void
    {
        $rows = $pdo->query("SELECT * FROM reports")->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        foreach ($rows as $row) {
            $key = (string) ($row['key'] ?? '');
            if ($key === '') {
                $this->counts['reports']['skipped']++;
                continue;
            }

            // key format: kind:start:end
            $parts = explode(':', $key, 3);
            if (count($parts) < 3) {
                $this->warn("Skipping report with malformed key: {$key}");
                $this->counts['reports']['skipped']++;
                continue;
            }

            [$periodKind, $periodStart, $periodEnd] = $parts;

            $exists = Report::where('user_id', $userId)
                ->where('report_key', $key)
                ->exists();

            if ($exists) {
                $this->counts['reports']['skipped']++;
                continue;
            }

            Report::create([
                'user_id' => $userId,
                'report_key' => $key,
                'period_kind' => $periodKind,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'content' => (string) ($row['content'] ?? ''),
                'generated_at' => $row['at'] ?? now(),
            ]);

            $this->counts['reports']['created']++;
        }
    }

    private function importActiveMd(string $path, int $userId): void
    {
        $content = File::get($path);
        $lines = explode("\n", $content);

        // Find the header row
        $headerIndex = null;
        $headerCols = [];
        foreach ($lines as $i => $line) {
            if (str_contains($line, '| ID |')) {
                $headerIndex = $i;
                $headerCols = array_map('trim', explode('|', $line));
                // Strip empty first/last from leading/trailing pipes
                if (isset($headerCols[0]) && $headerCols[0] === '') {
                    array_shift($headerCols);
                }
                if (isset($headerCols[array_key_last($headerCols)]) && end($headerCols) === '') {
                    array_pop($headerCols);
                }
                break;
            }
        }

        if ($headerIndex === null) {
            $this->warn('No ACTIVE.md table header found — skipping todo import.');
            return;
        }

        // Column positions (1-based index into headerCols after trimming)
        $colIndex = fn (string $col) => array_search($col, $headerCols, true);

        $goalIdx   = $colIndex('Goal');
        $branchIdx = $colIndex('Branch');
        $statusIdx = $colIndex('Status');
        $nextIdx   = $colIndex('Next action');

        foreach (array_slice($lines, $headerIndex + 1) as $line) {
            $line = trim($line);
            if ($line === '' || ! str_starts_with($line, '|')) {
                continue;
            }

            // Skip the markdown table separator row (|---|---|...)
            $withoutPipes = str_replace(['|', '-', ' '], '', $line);
            if ($withoutPipes === '' || str_contains($line, '---')) {
                continue;
            }

            $cells = explode('|', $line);
            // Remove leading/trailing empty cells from pipes
            if (isset($cells[0]) && trim($cells[0]) === '') {
                array_shift($cells);
            }
            if (count($cells) > 0 && trim(end($cells)) === '') {
                array_pop($cells);
            }
            $cells = array_map('trim', $cells);

            $title   = isset($cells[$goalIdx])   ? $cells[$goalIdx]   : '';
            $branch  = isset($cells[$branchIdx])  ? $cells[$branchIdx]  : '';
            $status  = isset($cells[$statusIdx])  ? strtolower($cells[$statusIdx])  : '';
            $next    = isset($cells[$nextIdx])    ? $cells[$nextIdx]    : '';

            if ($title === '') {
                continue;
            }

            // Dedup: skip if a todo with this title and @journal tag already exists
            $exists = Todo::where('user_id', $userId)
                ->where('title', $title)
                ->whereHas('tags', fn ($q) => $q->where('name', self::JOURNAL_TAG))
                ->exists();

            if ($exists) {
                $this->counts['todos']['skipped']++;
                continue;
            }

            $isCompleted = $status === 'done';
            $isBlocked   = $status === 'blocked';
            $isUrgent    = in_array($status, ['in_progress', 'blocked'], true);

            $todo = Todo::create([
                'user_id' => $userId,
                'type' => Todo::TYPE_TODO,
                'title' => $title,
                'description' => $next !== '' ? $next : null,
                'is_completed' => $isCompleted,
                // ACTIVE.md carries no completion date, only a status. Stamping
                // "now" made the import day look like the day 26 tasks were
                // finished, and every report covering it claimed them. Leave it
                // null: the generator treats undated completions as historical
                // and does not attribute them to a period.
                'completed_at' => null,
                'priority' => $isUrgent ? Todo::PRIORITY_URGENT : Todo::PRIORITY_NOT_URGENT,
                'importance' => $isBlocked ? Todo::IMPORTANCE_IMPORTANT : Todo::IMPORTANCE_NOT_IMPORTANT,
            ]);

            // Attach tags
            $this->attachTag($userId, $todo, self::JOURNAL_TAG);
            if ($branch !== '' && $branch !== '-') {
                $this->attachTag($userId, $todo, $branch);
            }

            $this->counts['todos']['created']++;
        }
    }

    private function importDailyMarkdown(string $root, int $userId): void
    {
        $dailyDir = $root.DIRECTORY_SEPARATOR.'daily';
        if (! is_dir($dailyDir)) {
            $this->info('No daily/ directory found — skipping journal entry import.');
            return;
        }

        $files = collect(File::allFiles($dailyDir))
            ->filter(fn ($file) => $file->getExtension() === 'md')
            ->filter(fn ($file) => (bool) preg_match('/^(\d{4}-\d{2}-\d{2})\.md$/', $file->getFilename()))
            ->values();

        foreach ($files as $file) {
            $date = (string) preg_replace('/^(\d{4}-\d{2}-\d{2})\.md$/', '$1', $file->getFilename());
            $body = $file->getContents();

            $exists = JournalEntry::where('user_id', $userId)
                ->whereDate('entry_date', '=', $date)
                ->where('kind', JournalEntry::KIND_ACTIVITY)
                ->where('source', 'legacy-markdown')
                ->exists();

            if ($exists) {
                $this->counts['journal_entries']['skipped']++;
                continue;
            }

            JournalEntry::create([
                'user_id' => $userId,
                'entry_date' => $date,
                'kind' => JournalEntry::KIND_ACTIVITY,
                'content' => $body,
                'source' => 'legacy-markdown',
            ]);

            $this->counts['journal_entries']['created']++;
        }
    }

    private function attachTag(int $userId, Todo $todo, string $name): void
    {
        $tag = Tag::firstOrCreate(
            ['user_id' => $userId, 'name' => $name],
            ['user_id' => $userId, 'name' => $name]
        );

        $todo->tags()->attach($tag->id);
    }

    /**
     * @return array<int, string>|null
     */
    private function decodeList(?string $json): ?array
    {
        if ($json === null || $json === '') {
            return null;
        }

        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : null;
    }
}
