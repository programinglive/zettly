# Focus Containers — Slice 1 Design

## Goal

Let a Zettly owner run several focuses at the same time, and make every artifact an AI agent produces link to the focus it belongs to through a real database relation instead of a text marker hidden in a description field.

This document covers **slice 1 only**: the schema and API foundation. It is deliberately additive and nullable so that no existing row, client or deployed MCP build breaks while it ships.

## Why

Today a focus is a single row per owner with `started_at` and `completed_at`. The managed MCP refuses to operate when more than one focus is active, the dashboard shows only the most recently started one, and the only link between a focus and its work is the HTML comment `<!-- dev-workflow-focus:62 -->` appended to a Todo description.

That model assumed one human working on one thing at a time. That is a human attention limit, not a system limit. When an AI agent works on several streams in parallel, the single-focus rule stops protecting anything and starts producing workarounds: description markers instead of foreign keys, full-table scans of every Todo to compute focus progress, and no link at all for drawings and journal entries.

Two facts shape the solution:

- A **note** is not a separate entity. `todos.type` is an enum of `todo` and `note`. One `focus_id` column therefore covers both todos and notes.
- **Drawings** and **journal entries** already exist as first-class tables and are already written by the MCP. They only lack a link.

## Current state (verified in code)

| Layer | Behaviour | Location |
| --- | --- | --- |
| Schema | `foci(id, user_id, title, description, started_at, completed_at)`; no unique index | `database/migrations/2025_11_04_022414_create_foci_table.php` |
| Model | `User::currentFocus()` is `hasOne` where `completed_at IS NULL`, newest first | `app/Models/User.php:121` |
| Controller | `index()` already returns **all** foci; only `current()` narrows to one | `app/Http/Controllers/FocusController.php:64` |
| Controller | `store()` does **not** check for an existing active focus, so the API already permits several | `app/Http/Controllers/FocusController.php:87` |
| MCP (separate repo) | `activeFocus()` throws `FOCUS_CONFLICT` when more than one focus is active | `D:\code\dev-workflow-mcp-server\focus-workflow.js:30` |
| Link | HTML comment marker in the Todo description, matched by string scan | `dev-workflow-mcp-server/focus-workflow.js:9,117` |
| Drawings / journal | No link to any focus | — |

The single-focus rule is therefore **not enforced by Zettly at all**. It lives in the MCP and in the dashboard component. That is why the schema change is small and the client change is the real work.

## Decisions

### Focus is a container, not a daily session

A focus becomes a container with a lifecycle: `active`, `paused`, `completed`. Several containers may be active at once. "What am I doing today" becomes a filter over those containers, not a separate table and not a separate entity called Project.

`status` is stored separately from `completed_at` on purpose. `completed_at` records when the work finished and is an audit fact. `status` records the current state and is what queries filter on. A `paused` focus cannot be expressed by `completed_at` alone.

**One definition, used everywhere:** a focus is *active* when `status = 'active'` **and** `completed_at IS NULL`. `User::activeFoci()`, `User::currentFocus()`, `Focus::isActive()` and the API all use this single rule. Without it, a paused focus would still be reported as active by `currentFocus()`.

### Real foreign keys, not tags and not markers

Rejected alternatives:

- **Reuse the tag system** (`focus:62`). Cheapest, but tags are user-facing, renameable, carry no referential integrity, and cannot enforce that an artifact has a focus. It reproduces the current fragility in a different column.
- **A polymorphic `focus_items` table.** Flexible and many-to-many, but loses foreign-key integrity and forces union queries and a morph map for four artifact types. That is more machinery than this problem needs.

Chosen: a nullable `focus_id` foreign key on each artifact table, plus an aggregate read endpoint added in slice 2. Integrity stays with the database, and adding a new artifact type later does not require changing existing relations.

## Data model

```php
// 2026_11_12_000001_add_focus_id_to_artifacts.php
foreach (['todos', 'drawings', 'journal_entries'] as $table) {
    Schema::table($table, function (Blueprint $t) {
        $t->foreignId('focus_id')->nullable()
          ->constrained('foci')->nullOnDelete();
        $t->index(['user_id', 'focus_id']);
    });
}
```

```php
// 2026_11_12_000002_add_status_and_color_to_foci_table.php
Schema::table('foci', function (Blueprint $t) {
    $t->string('color', 7)->default('#6366F1');
    $t->string('status', 16)->default('active');
    $t->index(['user_id', 'status']);
});

// The column default applies to every existing row, including completed ones.
// Backfill explicitly, in the same migration, before the index is relied on.
DB::table('foci')->whereNotNull('completed_at')->update(['status' => 'completed']);
```

Notes on the migration:

- `constrained('foci')` is written explicitly for readability. Laravel would resolve it correctly anyway: `Str::plural('focus')` is `foci` and `Focus::getTable()` is `foci` (verified).
- `nullOnDelete` keeps artifacts when a focus is deleted rather than destroying work as a side effect of cleanup.
- **No `after()` calls.** Column position is cosmetic, is a no-op on SQLite and PostgreSQL, and only exists on MySQL. Local and test run SQLite; production runs PostgreSQL.
- `down()` cannot drop a foreign-keyed column on SQLite: it refuses to drop a column that an FK still references, and it cannot drop the FK without rebuilding the table. Production is PostgreSQL, where the full rollback runs. On SQLite the index is dropped and the column kept, and `up()` is guarded by `hasColumn()` so re-running after such a rollback is safe. A test covers this.

### Model layer

```php
// Focus
public function todos(): HasMany            // type = todo
public function notes(): HasMany            // type = note
public function drawings(): HasMany
public function journalEntries(): HasMany

// User
public function activeFoci(): HasMany       // status = active AND completed_at IS NULL
public function currentFocus(): HasOne      // newest of activeFoci, keeps the dashboard card working

// Todo, Drawing, JournalEntry
public function focus(): BelongsTo
```

`Focus::$fillable` must gain `status` and `color`; without that, `foci()->create([...])` silently discards them through mass assignment.

`Focus::isActive()` and `isCompleted()` must be rewritten against `status` as well as `completed_at`, and `FocusController::complete()` must set `status = 'completed'` in the same transaction that writes `completed_at` and the `focus_status_events` row. Otherwise a focus completed through the API keeps `status = 'active'` and `activeFoci()` keeps returning it.

### State authority

`foci.status` is the current state and is what queries filter on. `focus_status_events` remains the append-only audit trail. Every transition writes both, in one transaction. New `action` values: `paused`, `resumed`, `completed`. The existing default of `completed` is unchanged.

## API

Slice 1 changes no existing route signature. It widens accepted input and stops hiding rows.

**Artifact linking** — `focus_id` is accepted on:

| Endpoint | Controller | Note |
| --- | --- | --- |
| `POST /api/v1/todos` | `Api\TodoController::store` | covers todos and notes |
| `PATCH /api/v1/todos/{todo}` | `Api\TodoController::update` | |
| `POST /api/v1/drawings` | `DrawingController::store` | builds the insert from explicit keys, so `focus_id` must be added there |
| `PATCH /api/v1/drawings/{drawing}` | `DrawingController::update` | currently rejects a payload without `title\|document\|thumbnail`; must accept a `focus_id`-only patch |
| `POST /api/v1/journal/entries` | `Api\JournalController::store` | no update route exists |

The web `TodoController` (`/todos`) is **out of scope** for slice 1. The AI path uses `/api/v1`.

**Ownership** — `focus_id` is validated as `['sometimes','nullable','integer', Rule::exists('foci','id')->where('user_id', Auth::id())]`, the same pattern already used for `todo_id` in `Api\JournalController:29`. A foreign or missing focus returns **422**, never a silent drop. A silent drop would leave an artifact unlinked while the agent believes it is linked.

**Journal precedence** — if `focus_id` is present it wins. If it is absent and `todo_id` is present, `focus_id` is derived from that todo's focus. If both are present and disagree, the explicit `focus_id` wins and no error is raised; `todo_id` stays a provenance link, not a grouping authority.

**Focus endpoints** — `POST /api/v1/focus` accepts optional `color` and `status`. Allowed `status` at creation is `active` only; `paused` and `completed` are rejected with 422 because a focus cannot be born paused or finished.

**Lifecycle** — new `PATCH /api/v1/focus/{id}/status` with `{status}` accepting `active|paused|completed`. It writes the `foci.status` change and the matching `focus_status_events` row in one transaction. `POST /focus/{id}/complete` keeps its current contract and additionally sets `status = 'completed'`.

**Editable metadata** — `PUT|PATCH /api/v1/focus/{id}` accepts optional `color` in addition to the existing required `title` and optional `description`. Without this, `color` could be set once at creation and never changed. `title` stays required so the current web form keeps working unchanged.

**Read** — `GET /api/v1/focus/current` keeps returning the newest active focus in `data` and adds a top-level `active_focus_count` integer, so a client can tell that more than one exists without changing the existing response shape.

The aggregate `/api/v1/focus/{id}/board` endpoint, the Focus Board UI and MCP auto-attach are **slice 2** and are not part of this task.

## Backfill

`php artisan focus:backfill-links`:

1. Scans `Todo::withTrashed()` where `description` matches `/<!-- dev-workflow-focus:(\d+) -->/`. Soft-deleted todos are included so a restored todo keeps its link.
2. Resolves each referenced focus id belonging to the same `user_id`.
3. Writes `focus_id` when it is null. Never overwrites an existing value.
4. `--dry-run` prints the planned changes and writes nothing.
5. Reports counts: scanned, linked, skipped-missing-focus, skipped-already-linked, skipped-foreign-owner.
6. Is idempotent: a second run changes nothing.

The marker text is **not** removed in slice 1. The deployed MCP build still reads it, and removing it before the MCP is upgraded would break focus completion checks on every device that has not been rolled out yet.

## Compatibility and rollout order

This order is mandatory:

1. Zettly ships slice 1. It accepts `focus_id` and still accepts the marker. Nothing breaks.
2. `focus:backfill-links` runs and fills existing links.
3. The MCP is upgraded to write `focus_id` and stop writing markers.
4. Markers are removed from descriptions (optional, later).

Shipping step 3 before step 1 makes the MCP write a column that does not exist. Removing markers before step 3 removes the only link the deployed MCP can read. Both failures are silent in normal use and surface later as missing focus progress.

## Other code that must change

- `app/Console/Commands/MergeUserAccounts.php:68` throws `Source account has multiple active foci`. That guard becomes wrong once several active foci are legitimate; it must merge them instead of aborting, and must maintain `status`.
- `database/factories/FocusFactory.php` needs `status` and `color`, and its `completed()` state must set `status = 'completed'`. `TodoFactory`, `DrawingFactory` and `JournalEntryFactory` need a `focus_id` state.
- `FocusController` is mounted on three route surfaces: `routes/web.php:129`, `routes/api.php:63` and `routes/api.php:111`. A change to the controller affects all three, and `tests/Feature/FocusTest.php` exercises the web route names.

## Security

- Every new write validates that the target focus belongs to the authenticated owner. An artifact must never be linked to another owner's focus.
- Existing organization membership checks are unchanged.

## Out of scope for this slice

- Many-to-many focus membership for a single artifact.
- Sub-focus or hierarchy (`parent_id`).
- Treating an AI session (`agent_sessions`) as a focus.
- The Focus Board UI and the aggregate endpoint.
- MCP changes and the three-device rollout.
- The web `TodoController` and the dashboard component.

## Acceptance criteria

- Migration adds nullable `focus_id` with `nullOnDelete` and the `(user_id, focus_id)` index to `todos`, `drawings` and `journal_entries`.
- Migration adds `status` and `color` to `foci` and sets existing completed rows to `completed`.
- `Focus`, `Todo`, `Drawing` and `JournalEntry` expose the relations above; `focus_id` is fillable on the three artifact models and `status`/`color` on `Focus`.
- The `/api/v1` artifact endpoints accept `focus_id`, enforce ownership with a 422, and `focus/current` reports `active_focus_count`.
- `PATCH /api/v1/focus/{id}/status` moves a focus between `active`, `paused` and `completed` and writes the matching audit event.
- `focus:backfill-links` converts existing markers with a working `--dry-run` and is idempotent.
- Feature tests cover: two active focuses coexisting, an artifact linked to a focus, a foreign-owner link rejected with 422, a paused focus excluded from `activeFoci()`, the status transition endpoint, and the backfill command.
- Migration rollback does not error on SQLite, and re-running `up()` after it is safe.
- The full Zettly test suite passes.
