<?php

namespace Tests\Feature\Console;

use App\Models\AgentEvent;
use App\Models\AgentSession;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImportLegacyJournalTest extends TestCase
{
    use RefreshDatabase;

    private string $root;

    protected function setUp(): void
    {
        parent::setUp();

        $this->root = sys_get_temp_dir().'/journal-import-'.uniqid();
        mkdir($this->root.'/daily/2026/10', 0777, true);

        file_put_contents($this->root.'/ACTIVE.md', <<<'MD'
        | ID | Goal | Project / location | Branch | Status | Next action | Updated (WIB) |
        |---|---|---|---|---|---|---|
        | ACT-20261025-001 | Document the Codex setup | docs/SETUP.md | main | done | Guide published | 2026-10-25 06:41 |
        | ACT-20261019-004 | Finish Checkout printing | D:\code\clinic | fix/receipt | in_progress | Inspect printer | 2026-10-20 |
        | ACT-20261021-002 | Respond to backdoor | bw-server | - | blocked | Await access | 2026-10-24 |
        MD);

        file_put_contents(
            $this->root.'/daily/2026/10/2026-10-24.md',
            "# 2026-10-24\n\nWorked on the printer.\n"
        );

        $pdo = new \PDO('sqlite:'.$this->root.'/events.sqlite3');
        $pdo->exec("CREATE TABLE tasks(id TEXT PRIMARY KEY,session TEXT UNIQUE,project TEXT,title TEXT,category TEXT,status TEXT,start TEXT,last TEXT,completed TEXT,seconds INTEGER DEFAULT 0,files TEXT DEFAULT '[]',errors TEXT DEFAULT '[]',outcome TEXT DEFAULT '',machine TEXT NOT NULL DEFAULT 'unknown')");
        $pdo->exec("CREATE TABLE events(key TEXT PRIMARY KEY,task TEXT,kind TEXT,at TEXT,detail TEXT)");
        $pdo->exec("CREATE TABLE reports(key TEXT PRIMARY KEY,content TEXT,at TEXT)");
        $pdo->exec("INSERT INTO tasks VALUES('ACT-20261024-001','sess-a','clinic','Fix printer','Bug Fixing','completed','2026-10-24T01:00:00+00:00','2026-10-24T02:00:00+00:00','2026-10-24T02:00:00+00:00',3600,'[\"app/Foo.php\"]','[]','printed ok','MMCH')");
        $pdo->exec("INSERT INTO events VALUES('key-1','ACT-20261024-001','prompt','2026-10-24T01:00:00+00:00','submitted')");
        $pdo->exec("INSERT INTO reports VALUES('daily:2026-10-24:2026-10-24','# Daily Activity Summary','2026-10-24T16:55:00+00:00')");
    }

    protected function tearDown(): void
    {
        foreach (new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($this->root, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        ) as $file) {
            $file->isDir() ? rmdir($file->getPathname()) : unlink($file->getPathname());
        }
        rmdir($this->root);

        parent::tearDown();
    }

    private function runImport(): void
    {
        $this->artisan('journal:import-legacy', [
            '--db' => $this->root.'/events.sqlite3',
            '--journal-root' => $this->root,
        ])->assertSuccessful();
    }

    public function test_it_imports_sessions_events_and_reports(): void
    {
        $owner = User::factory()->create();
        $this->runImport();

        $session = AgentSession::firstOrFail();
        $this->assertSame($owner->id, $session->user_id);
        $this->assertSame('sess-a', $session->session_id);
        $this->assertSame(3600, $session->duration_seconds);
        $this->assertSame(['app/Foo.php'], $session->files_changed);
        $this->assertSame('MMCH', $session->machine);

        $this->assertSame(1, AgentEvent::where('event_key', 'key-1')->count());
        $this->assertSame('daily:2026-10-24:2026-10-24', Report::firstOrFail()->report_key);
    }

    public function test_it_imports_active_md_rows_as_journal_todos(): void
    {
        User::factory()->create();
        $this->runImport();

        $done = Todo::where('title', 'Document the Codex setup')->firstOrFail();
        $this->assertTrue($done->is_completed);
        $this->assertSame('Guide published', $done->description);
        $this->assertTrue($done->tags()->where('name', '@journal')->exists());
        $this->assertTrue($done->tags()->where('name', 'main')->exists());

        $blocked = Todo::where('title', 'Respond to backdoor')->firstOrFail();
        $this->assertFalse($blocked->is_completed);
        $this->assertSame('urgent', $blocked->priority);
        $this->assertSame('important', $blocked->importance);

        $this->assertSame(3, Todo::count());
    }

    public function test_it_imports_daily_markdown_as_journal_entries(): void
    {
        User::factory()->create();
        $this->runImport();

        $entry = JournalEntry::firstOrFail();
        $this->assertSame('2026-10-24', $entry->entry_date->toDateString());
        $this->assertSame('legacy-markdown', $entry->source);
        $this->assertStringContainsString('Worked on the printer.', $entry->content);
    }

    public function test_running_the_import_twice_does_not_duplicate_anything(): void
    {
        $user = User::factory()->create();
        $this->runImport();
        $this->runImport();

        $this->assertSame(1, AgentSession::count());
        $this->assertSame(1, AgentEvent::count());
        $this->assertSame(1, Report::count());
        $this->assertSame(1, JournalEntry::where('user_id', $user->id)->count());
        $this->assertSame(3, Todo::where('user_id', $user->id)->count());
    }

    public function test_dry_run_writes_nothing(): void
    {
        User::factory()->create();

        $this->artisan('journal:import-legacy', [
            '--db' => $this->root.'/events.sqlite3',
            '--journal-root' => $this->root,
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->assertSame(0, AgentSession::count());
        $this->assertSame(0, Todo::count());
    }
}
