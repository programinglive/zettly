# Journal-into-Zettly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Zettly the single store for daily activity, AI/Codex agent sessions, and generated reports, replacing the parallel Markdown repo + local SQLite + Python report pipeline of `daily-activity-journal`.

**Architecture:** Additive Laravel surface on Zettly — six new tables (`agent_sessions`, `agent_events`, `journal_entries`, `reports`, `report_deliveries`, `user_report_channels`), a small service layer (ingest, render, deliver), Sanctum-CLI-authenticated `/api/v1` endpoints, two scheduled console commands, and one legacy-import command. The Codex hook keeps its local state machine but swaps its SQLite write for an HTTP POST plus an offline outbox.

**Tech Stack:** Laravel 12 / PHP 8.2+, Sanctum 4 (`abilities:zettly:cli`), `database` queue driver, PHPUnit 11 (`RefreshDatabase`), Python 3 + `pytest` for the hook.

**Spec:** `docs/superpowers/specs/2026-11-01-journal-into-zettly-design.md`

## Global Constraints

- PHP `^8.2`; Laravel `^12.0`; Sanctum `^4.2`. No new Composer or npm dependencies.
- Every new table and model is scoped by `user_id` (`foreignId('user_id')->constrained()->cascadeOnDelete()`), matching `todos` / `tags`.
- New HTTP routes go inside the existing `Route::prefix('v1')->middleware(['auth:sanctum', 'abilities:zettly:cli'])` group in `routes/api.php` (starts at line 75). Do not add a new top-level group.
- All API responses use the existing envelope: `{"success": bool, "data": ...}` for success, `{"message": ...}` with a 4xx status for failure.
- `QUEUE_CONNECTION=database` in production (`.env.example:38`); `sync` in `.env.testing`. Jobs must therefore work under both drivers.
- Secrets must never be stored raw. The redaction regex from `scripts/codex_journal.py:10` is the canonical list and must be ported verbatim into PHP.
- Session status vocabulary is exactly `in_progress`, `completed`, `blocked`. Report period kinds are exactly `daily`, `weekly`, `monthly`, `yearly`.
- Report period boundaries use WIB (`Asia/Jakarta`, UTC+7). The day "closes" at 23:55 WIB, ported from `cutoff()` in `codex_journal.py:68`.
- Do not modify `factory/`, `zettly-editor/`, or delete `daily-activity-journal/`. The journal repo becomes read-only after the import.

## Review Focus

Input classes and failure modes the spec implies but no single task's happy-path test covers. Each line has a test pinned in the task named in brackets.

1. **A hook event replayed twice** (network retry, Codex re-dispatch) must not duplicate a session, an event, or a report delivery. Dedup is by `(user_id, session_id)` and `event_key`. [Tasks 4, 7]
2. **A credential pasted into a prompt or tool output** (Discord webhook URL, `Bearer …`, `api_key=…`, `password: …`) must be redacted before it reaches the database *and* before it reaches a webhook payload. [Tasks 3, 7]
3. **A period with zero sessions** must still produce a valid, non-crashing report that says `- None recorded.` rather than omitting the section. [Task 6]
4. **A session that starts 23:50 WIB and ends 00:10 WIB** must land in the earlier WIB day for the daily report, because the day closes at 23:55 WIB. [Task 6]
5. **Re-running the legacy import** (or running it after new live data exists) must not duplicate todos, sessions, events, or reports. [Task 10]

---

### Task 1: Schema for agent sessions, journal entries, and reports

**Files:**
- Create: `database/migrations/2026_11_01_000001_create_agent_sessions_table.php`
- Create: `database/migrations/2026_11_01_000002_create_agent_events_table.php`
- Create: `database/migrations/2026_11_01_000003_create_journal_entries_table.php`
- Create: `database/migrations/2026_11_01_000004_create_reports_table.php`
- Create: `database/migrations/2026_11_01_000005_create_report_deliveries_table.php`
- Create: `database/migrations/2026_11_01_000006_create_user_report_channels_table.php`
- Test: `tests/Feature/Console/JournalSchemaTest.php`

**Interfaces:**
- Consumes: nothing.
- Produces: tables `agent_sessions`, `agent_events`, `journal_entries`, `reports`, `report_deliveries`, `user_report_channels` with the columns listed below. Later tasks address these columns by name, so the names are fixed here.

Column contract (names are exact):

`agent_sessions`: `id`, `user_id`, `session_id` string(191), `project` string(80), `title` string(180), `category` string(40) default `Development`, `status` string(20) default `in_progress`, `started_at` timestamp, `last_activity_at` timestamp, `completed_at` timestamp nullable, `duration_seconds` unsignedInteger default 0, `files_changed` json nullable, `errors` json nullable, `outcome` text nullable, `machine` string(80) default `unknown`, `timestamps`. Unique `(user_id, session_id)`. Index `(user_id, started_at)`.

`agent_events`: `id`, `user_id`, `agent_session_id`, `event_key` string(64), `kind` string(40), `occurred_at` timestamp, `detail` text nullable, `timestamps`. Unique `event_key`. Index `(agent_session_id, occurred_at)`.

`journal_entries`: `id`, `user_id`, `entry_date` date, `kind` string(20), `content` text, `source` string(20) default `manual`, `todo_id` nullable FK → `todos` `nullOnDelete`, `timestamps`. Index `(user_id, entry_date)`.

`reports`: `id`, `user_id`, `period_kind` string(10), `period_start` date, `period_end` date, `report_key` string(40), `content` text, `generated_at` timestamp, `timestamps`. Unique `(user_id, report_key)`.

`report_deliveries`: `id`, `user_id`, `report_id`, `channel` string(20), `status` string(20) default `pending`, `attempts` unsignedInteger default 0, `last_error` text nullable, `delivered_at` timestamp nullable, `timestamps`. Unique `(report_id, channel)`.

`user_report_channels`: `id`, `user_id`, `channel` string(20), `webhook_url` text, `chat_id` string(64) nullable, `enabled` boolean default true, `timestamps`. Unique `(user_id, channel)`.

- [ ] **Step 1: Write the six migration files**

Follow the existing style in `database/migrations/2025_10_05_145121_create_todo_tag_table.php` (anonymous class, `up()` / `down()`, `Schema::create` / `Schema::dropIfExists`). `webhook_url` is `text` because the model casts it to `encrypted`, and encrypted payloads exceed a `varchar(255)`. Create `agent_events` before anything that references it; `report_deliveries` must be created after `reports`.

- [ ] **Step 2: Write the failing test**

```php
<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class JournalSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_journal_tables_exist(): void
    {
        foreach ([
            'agent_sessions', 'agent_events', 'journal_entries',
            'reports', 'report_deliveries', 'user_report_channels',
        ] as $table) {
            $this->assertTrue(Schema::hasTable($table), "Missing table: {$table}");
        }
    }

    public function test_agent_sessions_has_the_required_columns(): void
    {
        foreach ([
            'user_id', 'session_id', 'project', 'title', 'category', 'status',
            'started_at', 'last_activity_at', 'completed_at', 'duration_seconds',
            'files_changed', 'errors', 'outcome', 'machine',
        ] as $column) {
            $this->assertTrue(Schema::hasColumn('agent_sessions', $column), "Missing column: {$column}");
        }
    }

    public function test_report_deliveries_is_unique_per_report_and_channel(): void
    {
        $indexes = collect(Schema::getIndexes('report_deliveries'))
            ->firstWhere('unique', true);

        $this->assertNotNull($indexes, 'Expected a unique index on report_deliveries.');
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `php artisan test --filter=JournalSchemaTest`
Expected: FAIL — `Missing table: agent_sessions`.

- [ ] **Step 4: Run the migrations**

Run: `php artisan migrate`
Expected: six `DONE` lines, ending with `2026_11_01_000006_create_user_report_channels_table`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `php artisan test --filter=JournalSchemaTest`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add database/migrations/2026_11_01_0000*.php tests/Feature/Console/JournalSchemaTest.php
git commit -m "feat(journal): add agent session, journal entry, and report tables"
```

---

### Task 2: Eloquent models and factories

**Files:**
- Create: `app/Models/AgentSession.php`, `app/Models/AgentEvent.php`, `app/Models/JournalEntry.php`, `app/Models/Report.php`, `app/Models/ReportDelivery.php`, `app/Models/UserReportChannel.php`
- Create: `database/factories/AgentSessionFactory.php`, `AgentEventFactory.php`, `JournalEntryFactory.php`, `ReportFactory.php`, `ReportDeliveryFactory.php`, `UserReportChannelFactory.php`
- Modify: `app/Models/User.php` (add the six `hasMany` relations)
- Test: `tests/Feature/Models/JournalModelsTest.php`

**Interfaces:**
- Consumes: the tables from Task 1.
- Produces, used by Tasks 3–10:
  - `AgentSession`: constants `STATUS_IN_PROGRESS='in_progress'`, `STATUS_COMPLETED='completed'`, `STATUS_BLOCKED='blocked'`; relations `user(): BelongsTo`, `events(): HasMany`; scopes `forUser(int $userId)`, `between(Carbon $from, Carbon $to)`.
  - `AgentEvent`: relation `session(): BelongsTo` (foreign key `agent_session_id`).
  - `JournalEntry`: constants `KIND_ACTIVITY`, `KIND_DECISION`, `KIND_BLOCKER`, `KIND_OUTCOME`, `KIND_HANDOFF`; relations `user()`, `todo(): BelongsTo`.
  - `Report`: constants `KIND_DAILY='daily'`, `KIND_WEEKLY='weekly'`, `KIND_MONTHLY='monthly'`, `KIND_YEARLY='yearly'`; relations `user()`, `deliveries(): HasMany`.
  - `ReportDelivery`: constants `STATUS_PENDING='pending'`, `STATUS_DELIVERED='delivered'`, `STATUS_FAILED='failed'`; relations `user()`, `report(): BelongsTo`.
  - `UserReportChannel`: constants `CHANNEL_DISCORD='discord'`, `CHANNEL_TELEGRAM='telegram'`; relation `user()`; scope `enabled()`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Models;

use App\Models\AgentEvent;
use App\Models\AgentSession;
use App\Models\JournalEntry;
use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class JournalModelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_json_columns_cast_to_arrays(): void
    {
        $session = AgentSession::factory()->create([
            'files_changed' => ['app/Foo.php'],
            'errors' => ['Observed tool failure: bash'],
        ]);

        $this->assertSame(['app/Foo.php'], $session->fresh()->files_changed);
        $this->assertSame(['Observed tool failure: bash'], $session->fresh()->errors);
    }

    public function test_session_has_many_events(): void
    {
        $session = AgentSession::factory()->create();
        AgentEvent::factory()->count(2)->create([
            'user_id' => $session->user_id,
            'agent_session_id' => $session->id,
        ]);

        $this->assertCount(2, $session->fresh()->events);
    }

    public function test_webhook_url_is_encrypted_at_rest(): void
    {
        $user = User::factory()->create();
        UserReportChannel::create([
            'user_id' => $user->id,
            'channel' => UserReportChannel::CHANNEL_DISCORD,
            'webhook_url' => 'https://discord.com/api/webhooks/123/abc',
        ]);

        $raw = DB::table('user_report_channels')->value('webhook_url');

        $this->assertNotSame('https://discord.com/api/webhooks/123/abc', $raw);
        $this->assertSame(
            'https://discord.com/api/webhooks/123/abc',
            UserReportChannel::first()->webhook_url
        );
    }

    public function test_report_has_many_deliveries(): void
    {
        $report = Report::factory()->create();
        ReportDelivery::factory()->create([
            'user_id' => $report->user_id,
            'report_id' => $report->id,
            'channel' => 'discord',
        ]);

        $this->assertCount(1, $report->fresh()->deliveries);
    }

    public function test_journal_entry_belongs_to_todo(): void
    {
        $entry = JournalEntry::factory()->create();

        $this->assertNull($entry->todo);
        $this->assertNotNull($entry->user);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=JournalModelsTest`
Expected: FAIL — class `App\Models\AgentSession` not found.

- [ ] **Step 3: Implement the six models**

Mirror `app/Models/Todo.php` conventions: `HasFactory`, explicit `$fillable`, `$casts`, typed relation return types, `const` vocabularies. Casts to set: `AgentSession` → `files_changed`/`errors` as `array`, the three timestamps as `datetime`; `JournalEntry` → `entry_date` as `date`; `Report` → `period_start`/`period_end` as `date`, `generated_at` as `datetime`; `ReportDelivery` → `delivered_at` as `datetime`; `UserReportChannel` → `webhook_url` as `encrypted`, `enabled` as `boolean`. Add `HasMany` relations to `app/Models/User.php` for all six models (`agentSessions`, `agentEvents`, `journalEntries`, `reports`, `reportDeliveries`, `reportChannels`).

- [ ] **Step 4: Implement the six factories**

Mirror `database/factories/TodoFactory.php`. `AgentSessionFactory` default: `user_id => User::factory()`, `session_id => fake()->uuid()`, `project => 'zettly'`, `title => fake()->sentence(6)`, `category => 'Development'`, `status => 'in_progress'`, `started_at => now()->subHour()`, `last_activity_at => now()`, `duration_seconds => 600`, `machine => 'TEST'`. `AgentEventFactory`: `event_key => hash('sha256', fake()->uuid())`. `ReportFactory`: `period_kind => 'daily'`, `period_start`/`period_end => today()`, `report_key => 'daily:'.today()->toDateString().':'.today()->toDateString()`, `content => '# Daily Activity Summary'`, `generated_at => now()`. `UserReportChannelFactory`: `channel => 'discord'`, `webhook_url => 'https://discord.com/api/webhooks/1/x'`, `enabled => true`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `php artisan test --filter=JournalModelsTest`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add app/Models app/Models/User.php database/factories tests/Feature/Models/JournalModelsTest.php
git commit -m "feat(journal): add journal models, relations, and factories"
```

---

### Task 3: Ingest service (redaction, categorisation, upsert)

**Files:**
- Create: `app/Services/AgentSessionIngestor.php`
- Test: `tests/Unit/AgentSessionIngestorTest.php`

**Interfaces:**
- Consumes: `AgentSession`, `AgentEvent` from Task 2.
- Produces:
  - `AgentSessionIngestor::redact(string $value, int $limit = 300): string` — **static**, pure.
  - `AgentSessionIngestor::categorize(string $text): string` — **static**, pure.
  - `AgentSessionIngestor::CATEGORIES` (public const array of `[name, regex]` pairs)
  - `AgentSessionIngestor->upsertSession(User $user, array $attributes): AgentSession` — **instance**, resolve with `app(AgentSessionIngestor::class)`.
  - `AgentSessionIngestor->appendEvent(User $user, AgentSession $session, array $attributes): ?AgentEvent` — **instance**.

Pure string helpers are static because they have no dependencies; anything that touches the database is an instance method resolved from the container, matching the existing `WebPushService` / `GraphSyncService` convention.

The split of responsibility is deliberate and must not be "improved" mid-build: **the client owns the state machine** (status transitions, duration accumulation, changed-file collection, outcome detection — it has the local git checkout and the assistant text). **The server owns redaction and categorisation**, so that any future client (web form, another agent) gets the same treatment and a leaked credential never reaches the database.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\AgentEvent;
use App\Models\AgentSession;
use App\Models\User;
use App\Services\AgentSessionIngestor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentSessionIngestorTest extends TestCase
{
    use RefreshDatabase;

    public function test_redact_removes_discord_webhook_urls(): void
    {
        $dirty = 'hook https://discord.com/api/webhooks/123/abcdef failed';

        $this->assertSame('hook [redacted] failed', AgentSessionIngestor::redact($dirty));
    }

    public function test_redact_removes_bearer_tokens_and_key_value_secrets(): void
    {
        $this->assertStringNotContainsString('abc123', AgentSessionIngestor::redact('Authorization: Bearer abc123'));
        $this->assertStringNotContainsString('s3cr3t', AgentSessionIngestor::redact('api_key=s3cr3t'));
        $this->assertStringNotContainsString('hunter2', AgentSessionIngestor::redact('password: hunter2'));
    }

    public function test_redact_collapses_whitespace_and_truncates(): void
    {
        $this->assertSame('a b', AgentSessionIngestor::redact("a\n\tb"));
        $this->assertSame(10, mb_strlen(AgentSessionIngestor::redact(str_repeat('x', 50), 10)));
    }

    public function test_categorize_matches_the_ported_regex_list(): void
    {
        $this->assertSame('Bug Fixing', AgentSessionIngestor::categorize('fix the regression in checkout'));
        $this->assertSame('Testing', AgentSessionIngestor::categorize('add validation tests'));
        $this->assertSame('Documentation', AgentSessionIngestor::categorize('update the README guide'));
        $this->assertSame('Development', AgentSessionIngestor::categorize('implement a widget'));
    }

    public function test_upsert_session_is_idempotent_on_session_id(): void
    {
        $user = User::factory()->create();
        $payload = [
            'session_id' => 'sess-1',
            'project' => 'zettly',
            'title' => 'Fix the printer offline bug',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:30:00+07:00',
            'duration_seconds' => 1800,
            'machine' => 'MMCH',
        ];

        app(AgentSessionIngestor::class)->upsertSession($user, $payload);
        $second = app(AgentSessionIngestor::class)->upsertSession($user, array_merge($payload, [
            'status' => 'completed',
            'duration_seconds' => 2400,
        ]));

        $this->assertSame(1, AgentSession::count());
        $this->assertSame('completed', $second->status);
        $this->assertSame(2400, $second->duration_seconds);
        $this->assertSame('Fix the printer offline bug', $second->title);
        $this->assertSame('Bug Fixing', $second->category);
    }

    public function test_upsert_session_redacts_every_string_field(): void
    {
        $user = User::factory()->create();

        $session = app(AgentSessionIngestor::class)->upsertSession($user, [
            'session_id' => 'sess-2',
            'project' => 'zettly',
            'title' => 'debug Bearer leak-abc123',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:00:00+07:00',
            'outcome' => 'token=topsecretvalue',
            'machine' => 'MMCH',
        ]);

        $this->assertStringNotContainsString('leak-abc123', $session->title);
        $this->assertStringNotContainsString('topsecretvalue', $session->outcome);
    }

    public function test_append_event_dedups_by_event_key(): void
    {
        $user = User::factory()->create();
        $session = app(AgentSessionIngestor::class)->upsertSession($user, [
            'session_id' => 'sess-3',
            'project' => 'zettly',
            'title' => 'work',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:00:00+07:00',
        ]);

        $payload = [
            'event_key' => str_repeat('a', 64),
            'kind' => 'prompt',
            'occurred_at' => '2026-11-01T10:00:00+07:00',
            'detail' => 'submitted',
        ];

        $first = app(AgentSessionIngestor::class)->appendEvent($user, $session, $payload);
        $second = app(AgentSessionIngestor::class)->appendEvent($user, $session, $payload);

        $this->assertNotNull($first);
        $this->assertNull($second);
        $this->assertSame(1, AgentEvent::count());
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=AgentSessionIngestorTest`
Expected: FAIL — class `App\Services\AgentSessionIngestor` not found.

- [ ] **Step 3: Implement `app/Services/AgentSessionIngestor.php`**

Port the two regexes verbatim from `scripts/codex_journal.py:10` and `:14`. `redact()` must: apply the secret regex with `[redacted]`, collapse `\r\n\t` runs into a single space, trim, and `mb_substr` to `$limit`. `categorize()` returns the first `CATEGORIES` name whose regex matches, else `'Development'`. `upsertSession()` redacts `project`/`title`/`outcome`/`machine` and each `files_changed`/`errors` element, derives `category` from the title only when the caller did not supply one, and uses `AgentSession::updateOrCreate(['user_id' => ..., 'session_id' => ...], $attributes)` so the first `title` wins. `appendEvent()` returns `null` when `event_key` already exists for that session, otherwise creates it. Both write methods accept an optional trailing `?CarbonInterface $now = null` defaulting to `now()` so tests can pin time.

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --filter=AgentSessionIngestorTest`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add app/Services/AgentSessionIngestor.php tests/Unit/AgentSessionIngestorTest.php
git commit -m "feat(journal): add agent session ingest service with redaction and categorisation"
```

---

### Task 4: Agent session API endpoints

**Files:**
- Create: `app/Http/Controllers/Api/AgentController.php`
- Modify: `routes/api.php` (add routes inside the `v1` CLI group, after line 137)
- Test: `tests/Feature/Api/AgentApiTest.php`

**Interfaces:**
- Consumes: `AgentSessionIngestor` (Task 3), `AgentSession`, `AgentEvent` (Task 2).
- Produces routes used by the Python hook in Task 11:
  - `POST /api/v1/agent/sessions` → `201` on create, `200` on update; body keys `session_id, project, title, status, started_at, last_activity_at, completed_at?, duration_seconds?, files_changed?, errors?, outcome?, machine?, category?`; response `{"success":true,"data":<session>}`.
  - `POST /api/v1/agent/sessions/{sessionId}/events` → `200`; body `event_key, kind, occurred_at, detail?`; response `{"success":true,"created":bool}`; `404` when the session does not belong to the caller.
  - `GET /api/v1/agent/sessions?since=&project=&status=&limit=` → `{"success":true,"data":[...]}` ordered by `last_activity_at` desc, default limit 50, max 200.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\AgentEvent;
use App\Models\AgentSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AgentApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsCliUser(): User
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        return $user;
    }

    public function test_it_creates_a_session(): void
    {
        $user = $this->actingAsCliUser();

        $this->postJson('/api/v1/agent/sessions', [
            'session_id' => 'sess-1',
            'project' => 'zettly',
            'title' => 'Fix the printer offline bug',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:30:00+07:00',
            'duration_seconds' => 1800,
            'machine' => 'MMCH',
        ])->assertCreated()->assertJsonPath('success', true);

        $this->assertDatabaseHas('agent_sessions', [
            'user_id' => $user->id,
            'session_id' => 'sess-1',
            'category' => 'Bug Fixing',
        ]);
    }

    public function test_replaying_the_same_session_does_not_duplicate_it(): void
    {
        $this->actingAsCliUser();
        $payload = [
            'session_id' => 'sess-1',
            'project' => 'zettly',
            'title' => 'Fix the printer offline bug',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:30:00+07:00',
        ];

        $this->postJson('/api/v1/agent/sessions', $payload)->assertCreated();
        $this->postJson('/api/v1/agent/sessions', $payload)->assertOk();

        $this->assertSame(1, AgentSession::count());
    }

    public function test_it_rejects_an_unknown_status(): void
    {
        $this->actingAsCliUser();

        $this->postJson('/api/v1/agent/sessions', [
            'session_id' => 'sess-1',
            'project' => 'zettly',
            'title' => 'work',
            'status' => 'paused',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:00:00+07:00',
        ])->assertStatus(422);
    }

    public function test_appending_the_same_event_twice_creates_one_row(): void
    {
        $this->actingAsCliUser();
        $this->postJson('/api/v1/agent/sessions', [
            'session_id' => 'sess-1',
            'project' => 'zettly',
            'title' => 'work',
            'status' => 'in_progress',
            'started_at' => '2026-11-01T10:00:00+07:00',
            'last_activity_at' => '2026-11-01T10:00:00+07:00',
        ])->assertCreated();

        $event = [
            'event_key' => str_repeat('b', 64),
            'kind' => 'prompt',
            'occurred_at' => '2026-11-01T10:00:00+07:00',
            'detail' => 'submitted',
        ];

        $this->postJson('/api/v1/agent/sessions/sess-1/events', $event)
            ->assertOk()->assertJsonPath('created', true);
        $this->postJson('/api/v1/agent/sessions/sess-1/events', $event)
            ->assertOk()->assertJsonPath('created', false);

        $this->assertSame(1, AgentEvent::count());
    }

    public function test_events_for_another_users_session_return_404(): void
    {
        $this->actingAsCliUser();
        $other = User::factory()->create();
        AgentSession::factory()->create(['user_id' => $other->id, 'session_id' => 'sess-other']);

        $this->postJson('/api/v1/agent/sessions/sess-other/events', [
            'event_key' => str_repeat('c', 64),
            'kind' => 'prompt',
            'occurred_at' => '2026-11-01T10:00:00+07:00',
        ])->assertNotFound();
    }

    public function test_it_requires_the_cli_ability(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['other:ability']);

        $this->getJson('/api/v1/agent/sessions')->assertForbidden();
    }

    public function test_it_lists_sessions_newest_first_with_a_since_filter(): void
    {
        $user = $this->actingAsCliUser();
        AgentSession::factory()->create([
            'user_id' => $user->id, 'session_id' => 'old',
            'last_activity_at' => '2026-10-01 00:00:00',
        ]);
        AgentSession::factory()->create([
            'user_id' => $user->id, 'session_id' => 'new',
            'last_activity_at' => '2026-11-01 00:00:00',
        ]);

        $response = $this->getJson('/api/v1/agent/sessions?since=2026-10-15T00:00:00%2B07:00');

        $response->assertOk();
        $this->assertSame(['new'], array_column($response->json('data'), 'session_id'));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=AgentApiTest`
Expected: FAIL — 404 on `POST /api/v1/agent/sessions`.

- [ ] **Step 3: Add the routes**

Inside the `v1` CLI group in `routes/api.php`, after the push-subscription routes (line 137), add three routes named `api.v1.agent.sessions.store`, `api.v1.agent.sessions.events.store`, `api.v1.agent.sessions.index`. Import `App\Http\Controllers\Api\AgentController` at the top.

- [ ] **Step 4: Implement `app/Http/Controllers/Api/AgentController.php`**

Follow `TodoController`'s shape: `Request $request` injection, `$request->validate([...])` with explicit `Rule::in([...])` on `status` and `kind`, `Auth::id()` for the owner, and the `{"success": true, "data": ...}` envelope. `store()` returns `201` when `wasRecentlyCreated` is true and `200` otherwise. `appendEvent()` resolves the session with `AgentSession::where('user_id', Auth::id())->where('session_id', $sessionId)->firstOrFail()` so a foreign session yields `404` rather than `403`. `index()` caps `limit` at 200.

- [ ] **Step 5: Run the test to verify it passes**

Run: `php artisan test --filter=AgentApiTest`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/AgentController.php routes/api.php tests/Feature/Api/AgentApiTest.php
git commit -m "feat(journal): expose agent session ingest API"
```

---

### Task 5: Journal entry API

**Files:**
- Create: `app/Http/Controllers/Api/JournalController.php`
- Modify: `routes/api.php` (same `v1` CLI group)
- Test: `tests/Feature/Api/JournalApiTest.php`

**Interfaces:**
- Consumes: `JournalEntry` (Task 2), `AgentSessionIngestor::redact()` (Task 3).
- Produces:
  - `POST /api/v1/journal/entries` → `201`; body `entry_date` (`Y-m-d`), `kind`, `content`, `source?`, `todo_id?`; response `{"success":true,"data":<entry>}`.
  - `GET /api/v1/journal/entries?date=|from=|to=|kind=` → `{"success":true,"data":[...]}` ordered by `entry_date` desc then `id` desc.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\JournalEntry;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class JournalApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_journal_entry_and_redacts_secrets(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        $this->postJson('/api/v1/journal/entries', [
            'entry_date' => '2026-11-01',
            'kind' => 'activity',
            'content' => 'Rotated the webhook: https://discord.com/api/webhooks/1/secret',
            'source' => 'codex',
        ])->assertCreated();

        $entry = JournalEntry::firstOrFail();
        $this->assertSame($user->id, $entry->user_id);
        $this->assertStringNotContainsString('secret', $entry->content);
    }

    public function test_it_rejects_an_unknown_kind(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['zettly:cli']);

        $this->postJson('/api/v1/journal/entries', [
            'entry_date' => '2026-11-01',
            'kind' => 'gossip',
            'content' => 'x',
        ])->assertStatus(422);
    }

    public function test_it_rejects_a_todo_owned_by_another_user(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        $foreignTodo = Todo::factory()->asTask()->create();

        $this->postJson('/api/v1/journal/entries', [
            'entry_date' => '2026-11-01',
            'kind' => 'handoff',
            'content' => 'x',
            'todo_id' => $foreignTodo->id,
        ])->assertStatus(422);
    }

    public function test_it_filters_by_date(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        JournalEntry::factory()->create(['user_id' => $user->id, 'entry_date' => '2026-10-31']);
        JournalEntry::factory()->create(['user_id' => $user->id, 'entry_date' => '2026-11-01']);

        $response = $this->getJson('/api/v1/journal/entries?date=2026-11-01');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=JournalApiTest`
Expected: FAIL — 404.

- [ ] **Step 3: Add the routes and implement the controller**

Two routes in the `v1` CLI group: `api.v1.journal.entries.store`, `api.v1.journal.entries.index`. Validate `todo_id` with `Rule::exists('todos', 'id')->where('user_id', Auth::id())` so a foreign todo is a `422` validation error rather than a `403`. Apply `AgentSessionIngestor::redact($content, 20000)` before saving.

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --filter=JournalApiTest`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/Api/JournalController.php routes/api.php tests/Feature/Api/JournalApiTest.php
git commit -m "feat(journal): add journal entry API"
```

---

### Task 6: Report generator service

**Files:**
- Create: `app/Services/ReportGenerator.php`
- Test: `tests/Unit/ReportGeneratorTest.php`

**Interfaces:**
- Consumes: `Report`, `AgentSession` (Task 2).
- Produces:
  - `ReportGenerator::cutoff(CarbonImmutable $now): CarbonImmutable` — **static**, pure. WIB date; same day if time ≥ 23:55, else previous day.
  - `ReportGenerator::duePeriods(CarbonImmutable $firstSessionDate, CarbonImmutable $now): array` — **static**, pure. List of `['daily'|'weekly'|'monthly'|'yearly', CarbonImmutable $start, CarbonImmutable $end]`.
  - `ReportGenerator->render(string $periodKind, CarbonImmutable $start, CarbonImmutable $end, Collection $sessions): string` — **instance**.
  - `ReportGenerator->generate(User $user, string $periodKind, CarbonImmutable $start, CarbonImmutable $end): Report` — **instance**, resolve with `app(ReportGenerator::class)`.
  - `ReportGenerator->generateDue(User $user, ?CarbonImmutable $now = null): array` — **instance**. Returns the `Report` rows created or refreshed.

Report key format is fixed: `"{$periodKind}:{$start->toDateString()}:{$end->toDateString()}"`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\AgentSession;
use App\Models\Report;
use App\Models\User;
use App\Services\ReportGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportGeneratorTest extends TestCase
{
    use RefreshDatabase;

    private function wib(string $value): CarbonImmutable
    {
        return CarbonImmutable::parse($value, 'Asia/Jakarta');
    }

    public function test_cutoff_rolls_back_before_2355_wib(): void
    {
        $this->assertSame(
            '2026-11-01',
            ReportGenerator::cutoff($this->wib('2026-11-01 12:00:00'))->toDateString()
        );
        $this->assertSame(
            '2026-10-31',
            ReportGenerator::cutoff($this->wib('2026-11-01 23:00:00'))->toDateString()
        );
        $this->assertSame(
            '2026-11-01',
            ReportGenerator::cutoff($this->wib('2026-11-01 23:55:00'))->toDateString()
        );
    }

    public function test_a_session_just_before_midnight_wib_lands_in_the_earlier_day(): void
    {
        $user = User::factory()->create();
        AgentSession::factory()->create([
            'user_id' => $user->id,
            'title' => 'late night fix',
            'started_at' => $this->wib('2026-11-01 23:50:00'),
            'last_activity_at' => $this->wib('2026-11-02 00:10:00'),
        ]);

        $report = app(ReportGenerator::class)->generate(
            $user, 'daily',
            $this->wib('2026-11-01 00:00:00'),
            $this->wib('2026-11-01 00:00:00')
        );

        $this->assertStringContainsString('late night fix', $report->content);
        $this->assertSame('daily:2026-11-01:2026-11-01', $report->report_key);
    }

    public function test_a_day_with_no_sessions_still_renders_a_valid_report(): void
    {
        $user = User::factory()->create();

        $report = app(ReportGenerator::class)->generate(
            $user, 'daily',
            $this->wib('2026-11-01 00:00:00'),
            $this->wib('2026-11-01 00:00:00')
        );

        $this->assertStringContainsString('# Daily Activity Summary: 2026-11-01 - 2026-11-01', $report->content);
        $this->assertStringContainsString('- Tasks completed: 0', $report->content);
        $this->assertStringContainsString('- None recorded.', $report->content);
    }

    public function test_render_groups_work_by_project_and_counts_completions(): void
    {
        $user = User::factory()->create();
        AgentSession::factory()->create([
            'user_id' => $user->id, 'project' => 'zettly', 'title' => 'ship it',
            'status' => 'completed', 'completed_at' => $this->wib('2026-11-01 09:00:00'),
            'started_at' => $this->wib('2026-11-01 08:00:00'),
            'last_activity_at' => $this->wib('2026-11-01 09:00:00'),
            'duration_seconds' => 3600, 'machine' => 'MMCH',
            'files_changed' => ['app/Foo.php'], 'errors' => [],
        ]);

        $report = app(ReportGenerator::class)->generate(
            $user, 'daily',
            $this->wib('2026-11-01 00:00:00'),
            $this->wib('2026-11-01 00:00:00')
        );

        $this->assertStringContainsString('- Machines: MMCH', $report->content);
        $this->assertStringContainsString('### zettly', $report->content);
        $this->assertStringContainsString('**ship it** — completed', $report->content);
        $this->assertStringContainsString('Modified files: app/Foo.php', $report->content);
        $this->assertStringContainsString('60 minutes', $report->content);
    }

    public function test_generate_is_idempotent_per_report_key(): void
    {
        $user = User::factory()->create();
        $start = $this->wib('2026-11-01 00:00:00');

        app(ReportGenerator::class)->generate($user, 'daily', $start, $start);
        app(ReportGenerator::class)->generate($user, 'daily', $start, $start);

        $this->assertSame(1, Report::count());
    }

    public function test_due_periods_emit_weekly_on_sunday_and_monthly_on_month_end(): void
    {
        $periods = ReportGenerator::duePeriods(
            $this->wib('2026-11-01 00:00:00'),
            $this->wib('2026-11-01 12:00:00')
        );

        $this->assertContains('daily', array_column($periods, 0));
        $this->assertContains('weekly', array_column($periods, 0));
        $this->assertNotContains('monthly', array_column($periods, 0));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=ReportGeneratorTest`
Expected: FAIL — class `App\Services\ReportGenerator` not found.

- [ ] **Step 3: Implement `app/Services/ReportGenerator.php`**

Port `cutoff()`, `due()`, `render()`, and `report_path()`'s key idea from `scripts/codex_journal.py:68-119`. Use `CarbonImmutable` with `->setTimezone('Asia/Jakarta')` for every boundary comparison; store timestamps as UTC. `generate()` selects sessions with `started_at < $end+1day AND (last_activity_at >= $start OR started_at >= $start)`, renders, and `updateOrCreate`s on `['user_id', 'report_key']`. `render()` reproduces the exact section order and literal labels of the Python version: heading, `- Machines:`, `- Projects:`, `- Tasks completed:`, `- Tasks in progress or blocked:`, `- Observed active-turn time: N minutes (not total working time)`, `## Work by project`, `## Outstanding work`, `## Next actions`, `## Historical comparison`. When there are no outstanding sessions, emit `- None recorded.` (this is Review Focus 3).

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --filter=ReportGeneratorTest`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/Services/ReportGenerator.php tests/Unit/ReportGeneratorTest.php
git commit -m "feat(journal): add server-side report generator with WIB period boundaries"
```

---

### Task 7: Delivery service and queue jobs

**Files:**
- Create: `app/Services/ReportDeliveryService.php`
- Create: `app/Jobs/DispatchReportGeneration.php`
- Create: `app/Jobs/DeliverReport.php`
- Test: `tests/Feature/Jobs/ReportDeliveryTest.php`

**Interfaces:**
- Consumes: `ReportGenerator` (Task 6), `Report`, `ReportDelivery`, `UserReportChannel` (Task 2).
- Produces:
  - `ReportDeliveryService::summary(string $content, int $limit = 1800): string` — **static**, pure.
  - `ReportDeliveryService->enqueue(User $user, Report $report): int` — **instance**, resolve with `app(ReportDeliveryService::class)`. Creates one pending `report_deliveries` row per enabled channel, returns the number created.
  - `ReportDeliveryService->send(ReportDelivery $delivery): void` — **instance**. Performs the HTTP POST, then sets `delivered` + `delivered_at`, or increments `attempts` and stores `last_error`.
  - `DispatchReportGeneration implements ShouldQueue` — constructor `(public int $userId)`; `handle(ReportGenerator $generator)`.
  - `DeliverReport implements ShouldQueue` — constructor `(public int $deliveryId)`; `handle(ReportDeliveryService $service)`; `$tries = 3`, `backoff = [60, 300, 900]`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Jobs;

use App\Jobs\DeliverReport;
use App\Jobs\DispatchReportGeneration;
use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\User;
use App\Models\UserReportChannel;
use App\Services\ReportDeliveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReportDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_keeps_only_the_headline_lines_and_truncates(): void
    {
        $content = implode("\n", [
            '# Daily Activity Summary: 2026-11-01 - 2026-11-01',
            '',
            '- Machines: MMCH',
            '- Projects: 1',
            '- Tasks completed: 2',
            '- Tasks in progress or blocked: 0',
            '- Observed active-turn time: 30 minutes (not total working time)',
            '',
            '### zettly',
            '- **ship it** — completed (Bug Fixing)',
            '  - Modified files: app/Foo.php',
        ]);

        $summary = ReportDeliveryService::summary($content);

        $this->assertStringContainsString('# Daily Activity Summary', $summary);
        $this->assertStringContainsString('### zettly', $summary);
        $this->assertStringNotContainsString('Modified files', $summary);
    }

    public function test_enqueue_creates_one_delivery_per_enabled_channel(): void
    {
        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'telegram', 'enabled' => false]);

        $created = app(ReportDeliveryService::class)->enqueue($user, $report);

        $this->assertSame(1, $created);
        $this->assertSame(1, ReportDelivery::count());
    }

    public function test_enqueue_is_idempotent(): void
    {
        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        app(ReportDeliveryService::class)->enqueue($user, $report);
        app(ReportDeliveryService::class)->enqueue($user, $report);

        $this->assertSame(1, ReportDelivery::count());
    }

    public function test_send_posts_to_the_webhook_and_marks_delivered(): void
    {
        Http::fake(['discord.com/*' => Http::response(['id' => '1'], 204)]);

        $user = User::factory()->create();
        $report = Report::factory()->create([
            'user_id' => $user->id,
            'content' => "# Daily Activity Summary\n\n- Machines: MMCH",
        ]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        $delivery = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'discord',
        ]);

        app(ReportDeliveryService::class)->send($delivery);

        Http::assertSent(fn ($request) => str_contains($request['content'], '- Machines: MMCH'));
        $this->assertSame('delivered', $delivery->fresh()->status);
        $this->assertNotNull($delivery->fresh()->delivered_at);
    }

    public function test_send_redacts_secrets_before_posting(): void
    {
        Http::fake(['discord.com/*' => Http::response([], 204)]);

        $user = User::factory()->create();
        $report = Report::factory()->create([
            'user_id' => $user->id,
            'content' => "# Summary\n\n- Machines: leak Bearer abc123secret",
        ]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        $delivery = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'discord',
        ]);

        app(ReportDeliveryService::class)->send($delivery);

        Http::assertNotSent(fn ($request) => str_contains($request['content'], 'abc123secret'));
    }

    public function test_send_records_a_failure_and_retries(): void
    {
        Http::fake(['discord.com/*' => Http::response('nope', 500)]);

        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        $delivery = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'discord',
        ]);

        try {
            app(ReportDeliveryService::class)->send($delivery);
        } catch (\Throwable $e) {
            // the job retries; the service records the attempt either way
        }

        $delivery->refresh();
        $this->assertSame('pending', $delivery->status);
        $this->assertSame(1, $delivery->attempts);
        $this->assertNotNull($delivery->last_error);
    }

    public function test_dispatch_job_generates_reports_for_a_user(): void
    {
        $user = User::factory()->create();
        \App\Models\AgentSession::factory()->create([
            'user_id' => $user->id,
            'started_at' => now()->subDay(),
            'last_activity_at' => now()->subDay(),
        ]);

        (new DispatchReportGeneration($user->id))->handle(app(\App\Services\ReportGenerator::class));

        $this->assertGreaterThanOrEqual(1, Report::where('user_id', $user->id)->count());
    }

    public function test_deliver_job_sends_a_pending_delivery(): void
    {
        Http::fake(['discord.com/*' => Http::response([], 204)]);

        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);
        $delivery = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'discord',
        ]);

        (new DeliverReport($delivery->id))->handle(app(ReportDeliveryService::class));

        $this->assertSame('delivered', $delivery->fresh()->status);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=ReportDeliveryTest`
Expected: FAIL — class `App\Services\ReportDeliveryService` not found.

- [ ] **Step 3: Implement `ReportDeliveryService`**

Use `Illuminate\Support\Facades\Http` (not raw curl) so tests can fake it. Discord payload: `['content' => summary]`. Telegram payload: `['chat_id' => $channel->chat_id, 'text' => summary]` posted to the stored `webhook_url`. Treat any non-2xx as a failure. `summary()` keeps only lines starting with `# `, `- Machines:`, `- Projects:`, `- Tasks `, `- Observed active-turn time:`, or `### `, then applies `AgentSessionIngestor::redact($text, $limit)` — this is Review Focus 2 for the delivery path.

- [ ] **Step 4: Implement the two jobs**

Both `implements ShouldQueue`, both with a plain `handle()` type-hinted on the service. `DispatchReportGeneration::handle()` loads the user (`User::find($this->userId)`, return early when gone), calls `generateDue()`, and calls `app(ReportDeliveryService::class)->enqueue()` for each report. `DeliverReport::handle()` loads the delivery, returns early when already `delivered`, and calls `send()`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `php artisan test --filter=ReportDeliveryTest`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add app/Services/ReportDeliveryService.php app/Jobs tests/Feature/Jobs/ReportDeliveryTest.php
git commit -m "feat(journal): add report delivery service and queued jobs"
```

---

### Task 8: Report and channel API

**Files:**
- Create: `app/Http/Controllers/Api/ReportController.php`
- Modify: `routes/api.php` (same `v1` CLI group)
- Test: `tests/Feature/Api/ReportApiTest.php`

**Interfaces:**
- Consumes: `ReportGenerator` (Task 6), `ReportDeliveryService` (Task 7), `Report`, `UserReportChannel` (Task 2).
- Produces:
  - `POST /api/v1/reports/generate` body `{period_kind?, date?}` → `{"success":true,"data":[<report>...]}`
  - `POST /api/v1/reports/deliver` body `{report_key?}` → `{"success":true,"enqueued":N}`
  - `GET /api/v1/reports?period_kind=&from=&to=` → `{"success":true,"data":[...]}`
  - `GET /api/v1/report-channels` → `{"success":true,"data":[...]}` (never returns `webhook_url` in plaintext — return `webhook_url_set: bool` instead)
  - `POST /api/v1/report-channels` body `{channel, webhook_url, chat_id?, enabled?}` → `201`, upsert per `(user_id, channel)`
  - `DELETE /api/v1/report-channels/{channel}` → `{"success":true}`

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Report;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_generates_a_daily_report_on_demand(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        $response = $this->postJson('/api/v1/reports/generate', [
            'period_kind' => 'daily',
            'date' => '2026-11-01',
        ]);

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertSame('daily:2026-11-01:2026-11-01', Report::firstOrFail()->report_key);
    }

    public function test_it_enqueues_delivery_jobs(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        $report = Report::factory()->create(['user_id' => $user->id]);
        UserReportChannel::factory()->create(['user_id' => $user->id, 'channel' => 'discord']);

        $this->postJson('/api/v1/reports/deliver', ['report_key' => $report->report_key])
            ->assertOk()->assertJsonPath('enqueued', 1);

        Queue::assertPushed(\App\Jobs\DeliverReport::class);
    }

    public function test_channel_listing_never_leaks_the_webhook_url(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);
        UserReportChannel::factory()->create([
            'user_id' => $user->id,
            'channel' => 'discord',
            'webhook_url' => 'https://discord.com/api/webhooks/999/topsecret',
        ]);

        $response = $this->getJson('/api/v1/report-channels');

        $response->assertOk();
        $this->assertStringNotContainsString('topsecret', $response->getContent());
        $this->assertTrue($response->json('data.0.webhook_url_set'));
    }

    public function test_it_upserts_a_channel(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['zettly:cli']);

        $this->postJson('/api/v1/report-channels', [
            'channel' => 'telegram',
            'webhook_url' => 'https://api.telegram.org/bot123/sendMessage',
            'chat_id' => '-100123',
        ])->assertCreated();

        $this->postJson('/api/v1/report-channels', [
            'channel' => 'telegram',
            'webhook_url' => 'https://api.telegram.org/bot456/sendMessage',
            'chat_id' => '-100456',
        ])->assertCreated();

        $this->assertSame(1, UserReportChannel::count());
        $this->assertSame('-100456', UserReportChannel::first()->chat_id);
    }

    public function test_it_rejects_a_non_https_webhook(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['zettly:cli']);

        $this->postJson('/api/v1/report-channels', [
            'channel' => 'discord',
            'webhook_url' => 'http://insecure.example.com/hook',
        ])->assertStatus(422);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=ReportApiTest`
Expected: FAIL — 404.

- [ ] **Step 3: Add the routes and implement the controller**

Register the six routes in the `v1` CLI group. `webhook_url` validation is `['required', 'url', 'starts_with:https://']`. `generate` with no `date` uses `today('Asia/Jakarta')`. `deliver` with no `report_key` delivers every not-yet-delivered report for the user. Serialise `UserReportChannel` with `only(['id', 'channel', 'chat_id', 'enabled', 'updated_at'])` plus the computed `webhook_url_set`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --filter=ReportApiTest`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/Api/ReportController.php routes/api.php tests/Feature/Api/ReportApiTest.php
git commit -m "feat(journal): add report generation and channel management API"
```

---

### Task 9: Console commands and scheduler wiring

**Files:**
- Create: `app/Console/Commands/GenerateReportsCommand.php` (signature `journal:generate-reports`)
- Create: `app/Console/Commands/DeliverReportsCommand.php` (signature `journal:deliver-reports`)
- Modify: `routes/console.php`
- Test: `tests/Feature/Console/JournalScheduleTest.php`

**Interfaces:**
- Consumes: `DispatchReportGeneration`, `DeliverReport` (Task 7), `ReportDelivery` (Task 2).
- Produces: two artisan commands and two `Schedule` entries. `journal:generate-reports` accepts `--user=` (id) and defaults to every user that has at least one enabled report channel. `journal:deliver-reports` accepts `--limit=` (default 100) and dispatches `DeliverReport` for `status = 'pending'` rows.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Console;

use App\Models\Report;
use App\Models\ReportDelivery;
use App\Models\User;
use App\Models\UserReportChannel;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class JournalScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_generation_is_scheduled_daily_at_2355_jakarta(): void
    {
        $events = collect(app(Schedule::class)->events());
        $event = $events->first(fn ($e) => str_contains((string) $e->command, 'journal:generate-reports'));

        $this->assertNotNull($event, 'journal:generate-reports is not scheduled');
        $this->assertSame('55 23 * * *', $event->expression);
        $this->assertSame('Asia/Jakarta', $event->timezone);
    }

    public function test_report_delivery_is_scheduled_every_fifteen_minutes(): void
    {
        $events = collect(app(Schedule::class)->events());
        $event = $events->first(fn ($e) => str_contains((string) $e->command, 'journal:deliver-reports'));

        $this->assertNotNull($event, 'journal:deliver-reports is not scheduled');
        $this->assertSame('*/15 * * * *', $event->expression);
    }

    public function test_generate_command_targets_users_with_channels(): void
    {
        Queue::fake();
        $withChannel = User::factory()->create();
        UserReportChannel::factory()->create(['user_id' => $withChannel->id, 'channel' => 'discord']);
        $withoutChannel = User::factory()->create();

        $this->artisan('journal:generate-reports')->assertSuccessful();

        Queue::assertPushed(
            \App\Jobs\DispatchReportGeneration::class,
            fn ($job) => $job->userId === $withChannel->id
        );
        Queue::assertNotPushed(
            \App\Jobs\DispatchReportGeneration::class,
            fn ($job) => $job->userId === $withoutChannel->id
        );
    }

    public function test_deliver_command_dispatches_pending_deliveries_only(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $report = Report::factory()->create(['user_id' => $user->id]);
        $pending = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report->id, 'channel' => 'discord',
        ]);
        $report2 = Report::factory()->create([
            'user_id' => $user->id,
            'report_key' => 'daily:2026-10-31:2026-10-31',
        ]);
        $done = ReportDelivery::factory()->create([
            'user_id' => $user->id, 'report_id' => $report2->id, 'channel' => 'discord',
            'status' => 'delivered', 'delivered_at' => now(),
        ]);

        $this->artisan('journal:deliver-reports')->assertSuccessful();

        Queue::assertPushed(\App\Jobs\DeliverReport::class, fn ($job) => $job->deliveryId === $pending->id);
        Queue::assertNotPushed(\App\Jobs\DeliverReport::class, fn ($job) => $job->deliveryId === $done->id);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=JournalScheduleTest`
Expected: FAIL — command `journal:generate-reports` is not defined.

- [ ] **Step 3: Implement the two commands**

Extend `Illuminate\Console\Command`, follow the existing style in `app/Console/Commands/SyncTodoPrioritiesWithEisenhower.php`, declare `$signature` and `$description`, return `self::SUCCESS`. Dispatch jobs with `DispatchReportGeneration::dispatch($user->id)` and `DeliverReport::dispatch($delivery->id)`.

- [ ] **Step 4: Wire the schedule**

In `routes/console.php`, import `Illuminate\Support\Facades\Schedule` and add:

```php
Schedule::command('journal:generate-reports')->dailyAt('23:55')->timezone('Asia/Jakarta');
Schedule::command('journal:deliver-reports')->everyFifteenMinutes();
```

Keep the existing `inspire` command untouched.

- [ ] **Step 5: Document the deployment cron**

Add a `## Journal reports` section to `README.md` stating that the host must run `php artisan schedule:run` every minute (standard Laravel cron entry) for daily reports to fire, and that `php artisan queue:work` must be running for `DeliverReport` to execute under the `database` queue driver.

- [ ] **Step 6: Run the test to verify it passes**

Run: `php artisan test --filter=JournalScheduleTest`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add app/Console/Commands/GenerateReportsCommand.php app/Console/Commands/DeliverReportsCommand.php routes/console.php README.md tests/Feature/Console/JournalScheduleTest.php
git commit -m "feat(journal): schedule daily report generation and delivery"
```

---

### Task 10: Legacy journal import command

**Files:**
- Create: `app/Console/Commands/ImportLegacyJournalCommand.php` (signature `journal:import-legacy`)
- Test: `tests/Feature/Console/ImportLegacyJournalTest.php`

**Interfaces:**
- Consumes: `AgentSession`, `AgentEvent`, `JournalEntry`, `Report`, `Todo`, `Tag`, `AgentSessionIngestor` (Tasks 2, 3), `ReportGenerator` key format (Task 6).
- Produces: `journal:import-legacy {--db=} {--journal-root=} {--user-id=} {--dry-run}`. Defaults: `--db` = `%LOCALAPPDATA%\DailyActivityJournal\events.sqlite3`, `--journal-root` = `D:\works\mine\code\daily-activity-journal\activity`, `--user-id` = the lowest `users.id` (the owner).

Source → destination mapping:

| Source | Destination |
|---|---|
| SQLite `tasks` row | `agent_sessions` (matched by `session_id`; `start`→`started_at`, `last`→`last_activity_at`, `completed`→`completed_at`, `seconds`→`duration_seconds`, `files`/`errors` JSON→columns, `status`/`title`/`category`/`project`/`outcome`/`machine` verbatim) |
| SQLite `events` row | `agent_events` (`key`→`event_key`, `task`→resolve `agent_session_id` via the task's `session`, `kind`, `at`→`occurred_at`, `detail`) |
| SQLite `reports` row | `reports` (`key` = `kind:start:end` → `period_kind`/`period_start`/`period_end`/`report_key`, `content`, `at`→`generated_at`) |
| `ACTIVE.md` table row | `todos` (see mapping below) + tag `@journal` |
| `daily/YYYY/MM/YYYY-MM-DD.md` | one `journal_entries` row: `entry_date` from the filename, `kind = 'activity'`, `source = 'legacy-markdown'`, `content` = file body |

`ACTIVE.md` → `Todo` mapping (from the spec, fixed):
`type = 'todo'`; `title` = Goal; `description` = Next action; `due_date` = null; `priority` = `urgent` when Status is `in_progress` or `blocked`, else `not_urgent`; `importance` = `important` when Status is `blocked`, else `not_important`; `is_completed` = true when Status is `done` (case-insensitive); tags = the Branch value plus `@journal`; `organization_id` = null.

- [ ] **Step 1: Write the failing test**

```php
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
        User::factory()->create();
        $this->runImport();
        $this->runImport();

        $this->assertSame(1, AgentSession::count());
        $this->assertSame(1, AgentEvent::count());
        $this->assertSame(1, Report::count());
        $this->assertSame(1, JournalEntry::count());
        $this->assertSame(3, Todo::count());
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=ImportLegacyJournalTest`
Expected: FAIL — command `journal:import-legacy` is not defined.

- [ ] **Step 3: Implement the command**

Use `PDO` with `sqlite:` DSN for the SQLite side and `File::allFiles()` for the Markdown side. Parse `ACTIVE.md` by locating the header row containing `| ID |` and splitting subsequent pipe-delimited rows on `|`, trimming cells. Wrap the whole run in one `DB::transaction()` and honour `--dry-run` by wrapping in `DB::beginTransaction()` + `DB::rollBack()`. Dedup keys: sessions on `(user_id, session_id)`, events on `event_key`, reports on `(user_id, report_key)`, todos on `(user_id, title)` where the `@journal` tag is attached, journal entries on `(user_id, entry_date, kind, source)`. Print a summary table of created/skipped counts per destination. Missing SQLite file or missing `ACTIVE.md` must warn and continue rather than abort, so the command is safe to re-run on a machine that only has Markdown.

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --filter=ImportLegacyJournalTest`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the real import against the live journal data**

Run:
```bash
php artisan journal:import-legacy --dry-run
php artisan journal:import-legacy
```
Expected: the dry run reports non-zero counts and writes nothing; the real run imports and a second run reports everything as skipped.

- [ ] **Step 6: Commit**

```bash
git add app/Console/Commands/ImportLegacyJournalCommand.php tests/Feature/Console/ImportLegacyJournalTest.php
git commit -m "feat(journal): import legacy SQLite and Markdown journal data"
```

---

### Task 11: Rewrite the Codex hook to POST to Zettly

**Files:**
- Modify: `D:\works\mine\code\daily-activity-journal\scripts\codex_journal.py`
- Create: `D:\works\mine\code\daily-activity-journal\scripts\tests\test_codex_journal.py`
- Create: `D:\works\mine\code\daily-activity-journal\scripts\tests\__init__.py` (empty)
- Modify: `D:\works\mine\code\daily-activity-journal\docs\WORKFLOW.md` (document the new env vars)

**Interfaces:**
- Consumes: `POST /api/v1/agent/sessions`, `POST /api/v1/agent/sessions/{sessionId}/events` (Task 4).
- Produces: a hook that keeps its existing CLI contract (`codex_journal.py hook`, JSON on stdin) and its existing local state machine, but writes to Zettly instead of SQLite. New env vars: `ZETTLY_API_BASE` (e.g. `https://zettly.example.com`), `ZETTLY_CLI_TOKEN` (Sanctum token with `zettly:cli`). New module functions:
  - `post(path: str, body: dict) -> bool` — returns `False` on any failure, never raises.
  - `spool(payload: dict) -> None` — appends one JSON line to `STATE/outbox.jsonl`.
  - `flush_spool() -> None` — replays and truncates the outbox.
  - `session_payload(...)` / `event_payload(...)` — build the two request bodies.

- [ ] **Step 1: Write the failing test**

```python
import importlib.util
import json
import pathlib
import sys

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "codex_journal.py"


def load(tmp_path, monkeypatch):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    monkeypatch.setenv("ZETTLY_API_BASE", "https://zettly.test")
    monkeypatch.setenv("ZETTLY_CLI_TOKEN", "tok-123")
    spec = importlib.util.spec_from_file_location("codex_journal", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules["codex_journal"] = module
    spec.loader.exec_module(module)
    return module


def test_post_sends_token_header_and_json_body(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)
    captured = {}

    class FakeResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self, *args):
            return b"{}"

    def fake_urlopen(request, timeout=0):
        captured["url"] = request.full_url
        captured["headers"] = dict(request.header_items())
        captured["body"] = json.loads(request.data.decode("utf-8"))
        return FakeResponse()

    monkeypatch.setattr(module.urllib.request, "urlopen", fake_urlopen)

    assert module.post("/api/v1/agent/sessions", {"session_id": "s1"}) is True
    assert captured["url"] == "https://zettly.test/api/v1/agent/sessions"
    assert captured["headers"]["Authorization"] == "Bearer tok-123"
    assert captured["body"] == {"session_id": "s1"}


def test_post_returns_false_and_does_not_raise_on_failure(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)

    def boom(*args, **kwargs):
        raise OSError("network down")

    monkeypatch.setattr(module.urllib.request, "urlopen", boom)

    assert module.post("/api/v1/agent/sessions", {"session_id": "s1"}) is False


def test_spool_then_flush_replays_and_empties_the_outbox(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)
    sent = []

    monkeypatch.setattr(module, "post", lambda path, body: sent.append((path, body)) or True)

    module.spool({"path": "/api/v1/agent/sessions", "body": {"session_id": "s1"}})
    assert (module.STATE / "outbox.jsonl").exists()

    module.flush_spool()

    assert sent == [("/api/v1/agent/sessions", {"session_id": "s1"})]
    assert module.STATE.joinpath("outbox.jsonl").read_text(encoding="utf-8") == ""


def test_spool_survives_a_failed_replay(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)
    monkeypatch.setattr(module, "post", lambda path, body: False)

    module.spool({"path": "/api/v1/agent/sessions", "body": {"session_id": "s1"}})
    module.flush_spool()

    lines = module.STATE.joinpath("outbox.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1


def test_dedup_key_is_stable_for_the_same_event(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)

    first = module.event_key("sess", "UserPromptSubmit", "turn-1", "", "", "2026-11-01T10:00:30+00:00")
    second = module.event_key("sess", "UserPromptSubmit", "turn-1", "", "", "2026-11-01T10:00:59+00:00")
    third = module.event_key("sess", "UserPromptSubmit", "turn-2", "", "", "2026-11-01T10:00:30+00:00")

    assert first == second  # same minute
    assert first != third


def test_redaction_still_applies_before_posting(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)

    cleaned = module.clean("token: supersecretvalue", 300)

    assert "supersecretvalue" not in cleaned
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd D:\works\mine\code\daily-activity-journal && python -m pytest scripts/tests -q`
Expected: FAIL — `AttributeError: module 'codex_journal' has no attribute 'post'`.

- [ ] **Step 3: Rewrite `codex_journal.py`**

Keep verbatim: `SECRET`, `DONE`, `NOT_DONE`, `BLOCKED`, `CATS`, `clean()`, `category()`, `changed()`, and the state-machine branches of `ingest()` (prompt → session create/update, `SessionStart`+`resume` → recovery, `PostToolUse` failure → error accumulation, `Stop` → status/seconds/files/outcome). Extract the dedup formula into `event_key(sid, kind, turn, source, identity, at)`. Delete `open_db()`, `cutoff()`, `due()`, `render()`, `report_path()`, `generate()`, `send_pending()`, and the `reports` subcommand — those now live in Zettly. Replace every DB write with: build the session body, `post('/api/v1/agent/sessions', body)`; when an event was produced, `post(f'/api/v1/agent/sessions/{sid}/events', event_body)`. On any `False`, `spool({...})`. Call `flush_spool()` once at the start of `main()`. Keep the `sync-errors.log` behaviour.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd D:\works\mine\code\daily-activity-journal && python -m pytest scripts/tests -q`
Expected: PASS (6 tests).

- [ ] **Step 5: Update the workflow doc**

In `docs/WORKFLOW.md`, replace the SQLite/report-scheduler instructions with: the hook requires `ZETTLY_API_BASE` and `ZETTLY_CLI_TOKEN`; tokens are minted with `POST /api/v1/auth/token` (or the profile screen) and scoped to `zettly:cli`; offline events spool to `%LOCALAPPDATA%\DailyActivityJournal\outbox.jsonl` and replay on the next hook run; reports are no longer generated on the workstation.

- [ ] **Step 6: Commit**

```bash
cd D:\works\mine\code\daily-activity-journal
git add scripts/codex_journal.py scripts/tests docs/WORKFLOW.md
git commit -m "feat(hook): post Codex sessions to Zettly with an offline outbox"
```

---

## Verification

After all eleven tasks:

- [ ] `cd D:\works\mine\code\zettly && php artisan test` — full suite green, no pre-existing test broken.
- [ ] `php artisan migrate:fresh --seed && php artisan test` — migrations replay cleanly from zero.
- [ ] `php artisan journal:import-legacy --dry-run` then `php artisan journal:import-legacy` — real data lands, second run is a no-op.
- [ ] `php artisan journal:generate-reports` followed by `php artisan journal:deliver-reports` with a real Discord webhook configured — one message arrives, `report_deliveries.status = delivered`.
- [ ] Send a synthetic Codex event through the hook with the network unplugged, confirm `outbox.jsonl` grows, reconnect, run the hook again, confirm the outbox drains and the session appears in `GET /api/v1/agent/sessions`.
- [ ] `git status` in `daily-activity-journal` is clean and the repo is documented as read-only in `docs/WORKFLOW.md`.
