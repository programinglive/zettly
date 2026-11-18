# Zettly Priority Engine — Technical Design

Status: design only. No production code, schema or migration is changed by this document.
Date: 2026-11-17
Author: audit + design pass requested by the owner
Related focus: Zettly Daily Work Guide: Priority Decision Audit (focus 103)

## 1. Problem

The owner wants every working day to be driven by Zettly instead of by whatever
condition arrives first. That requires Zettly to answer one question reliably:
*what should I do now, and why?* Today it cannot.

Measured on the owner account (2026-11-17, live API):

| Signal | Value |
| --- | --- |
| Open tasks | 129 |
| Q1 (important + urgent) | 0 |
| Q2 (important, not urgent) | 0 |
| Q3 | 2 |
| Q4 (neither) | 126 |
| Tasks with a due date | 0 |
| Tasks without a focus | 51 |
| Active focuses | 25 (all created within 7 days) |
| Largest focus load | 21, 13, 8 open tasks |

Code paths that decide ordering today:

- `Api\TodoController@index` returns `latest()` — newest task first, so the most
  recent interruption sits at the top of the list by construction.
- `Todo::scopeQ1..Q4` exist, but with 126 of 129 tasks in Q4 they cannot separate
  anything.
- `due_date` is validated and rendered as a badge in
  `resources/js/Pages/Todos/Index.jsx`; no server query, sort or report uses it.
- `todo_relationships` is undirected ("related"), so "A must finish before B" is
  not representable.
- `Focus` has no rank, capacity or "main" marker, so 25 focuses are equally
  active.
- `ReportGenerator::render()` emits a static `## Next actions` line pointing at
  `activity/ACTIVE.md` — there is no recommendation.
- The Zettly MCP server ships a *second* priority algorithm in
  `src/compass.js` (weights: urgent 40, important 25, overdue 35, …). It is
  advisory-only, invisible to the UI, and depends on free-text `blocked` /
  `waiting` tags. This already violates single-source-of-truth.

Conclusion: Zettly today is a record and a board, not a decision system.

## 2. Goals, non-goals, anti-goals

Goals

1. One ranked daily queue produced server-side, identical for UI, API, CLI and MCP.
2. Every rank decision is explainable in plain language, per task.
3. A single designated **Main Work** that outranks ordinary work (except overdue
   commitments), so the main project cannot be displaced by the newest request.
4. A capacity gate: the queue commits a bounded number of items per day (WIP
   limit and optional minute capacity).
5. Real dependencies: a task that waits on another is not offered until it is
   unblocked.
6. Inbox/backlog separation: a new task does not enter the queue until it is
   accepted and ready.
7. Full audit trail for every priority, main-work, queue-state and plan change.

Non-goals

- No AI/LLM scoring. The order must be deterministic and testable.
- No scheduling/calendar integration in this phase.
- No organisation-level (multi-user) priority. Priority is per user.
- No change to note, journal, drawing, habit or report semantics.

Anti-goals (failure even if it works)

- Two implementations of the ordering rule (web vs MCP) — the current defect.
- A hidden weight table the owner cannot explain or tune.
- A queue that silently drops tasks; anything excluded must be visible in triage.
- Priority changes without an audit row, or an MCP path that can bypass a limit.

## 3. Approaches considered

**A. Extend the Todo table in place.** Add `rank`, `is_blocked`, `main_work`
columns to `todos`, sort in `TodoController`, mirror the sort in MCP.
Small diff, no new tables. Rejected: keeps the rule in controllers, cannot carry
per-day plans, cannot enforce capacity, and leaves MCP free to re-implement the
sort (the exact failure we are fixing).

**B. Dedicated priority domain + thin adapters (recommended).** One headless
domain layer in Zettly (`App\Domain\Priority`), one bounded API surface
(`/api/v1/priority/*`), one CLI (`zettly priority …`), and MCP tools that only
translate arguments and call the API. Web UI renders the same domain output.
Cost: 7 tables, ~6 services, 2 controllers, CLI + MCP work. Benefit: the rule
exists once, is testable, tunable per user, and auditable.

**C. Keep the algorithm in MCP and extend `compass.js`.** Cheapest. Rejected:
the owner's mandatory rule is one source of truth; a client-side rule cannot be
enforced, cannot be shown in the UI, and breaks whenever another client appears
(web, mobile, coding agent).

Decision: **B**.

## 4. Domain model

All tables are additive. Portability target: SQLite (dev) and PostgreSQL
(production), so no partial unique indexes and no `jsonb`-only features.

### 4.1 `main_work` (one row per user)

| column | type | notes |
| --- | --- | --- |
| id | bigint pk | |
| user_id | bigint, unique, fk users | one main work per user |
| target_type | string(10) | `focus` or `todo` |
| target_id | bigint | |
| reason | string(500) | required |
| source | string(10) | `ui`, `api`, `cli`, `mcp` |
| assigned_by | bigint | actor user |
| assigned_at | timestamp | |

History is not stored here; it lives in `priority_decisions`, so the table stays
one row per user and the unique constraint stays portable. A missing target
(deleted focus/todo) is reported as `main_work: null` plus a warning, never an
error.

### 4.2 `user_priority_settings`

| column | type | default |
| --- | --- | --- |
| user_id | bigint unique fk | |
| wip_limit | smallint | 3 (1..10) |
| daily_capacity_minutes | integer | 240 (0 = unlimited) |
| queue_size | smallint | 8 (1..50) |
| require_focus | boolean | true |
| require_estimate | boolean | false |
| max_p0 | smallint | 2 (1..3) |
| main_work_strict | boolean | true |
| enabled | boolean | false (opt-in per user) |

No row means the feature is off for that user; existing behaviour is untouched.

### 4.3 `todos` additions

| column | type | notes |
| --- | --- | --- |
| queue_state | string(12) | `inbox`, `backlog`, `committed`; default `inbox` |
| estimate_minutes | integer nullable | used by capacity and readiness |
| triaged_at | timestamp nullable | when readiness was last confirmed |
| is_p0 | boolean | production critical; default false |
| p0_reason | string(500) nullable | required when `is_p0` is set |
| p0_since | timestamp nullable | when P0 was declared |
| p0_expires_at | timestamp nullable | mandatory, at most 72h after `p0_since` |
| p0_by | bigint nullable | actor that declared P0 |

Index: `(user_id, queue_state, is_completed)` and `(user_id, is_p0, p0_expires_at)`.
Migration backfills existing open tasks to `backlog` (they are already accepted);
only newly created tasks start in `inbox`. No existing priority value is changed.

### 4.3.1 P0 Production Critical

P0 means production is broken or degraded right now: checkout fails, invoices
cannot be issued, a clinic cannot transact. It is not "important".

- Declaring P0 requires a reason (min 8 chars) and an expiry. Default 24h,
  maximum 72h. An expired P0 stops ranking first automatically; no timer job is
  required because the key reads `p0_expires_at`.
- P0 bypasses the readiness gate (a broken production task must not wait for an
  estimate) and bypasses the WIP limit when committed, but never bypasses
  completion, archive or deletion.
- Authorization: only the account owner may set or clear P0. In MCP the call
  requires the confirmation string `P0 <todo_id>`. Every declaration, extension
  and clear writes a `priority_decisions` row with before/after and reason.
- At most 2 P0 tasks may be active per user at any time. A third is rejected with
  code `p0_limit_reached`, so P0 cannot become a new "urgent" tag for everything.

### 4.4 `todo_dependencies`

| column | type |
| --- | --- |
| id | bigint pk |
| user_id | bigint fk |
| todo_id | bigint fk todos |
| depends_on_todo_id | bigint fk todos |
| source | string(10) |
| created_at | timestamp |

Unique `(todo_id, depends_on_todo_id)`; `todo_id != depends_on_todo_id` checked
in the service; cycles rejected by DFS before insert. A task is **blocked** when
at least one dependency target is not completed and not archived. This is
additive: `todo_relationships` stays as the undirected "related" link.

### 4.5 `daily_plans` / `daily_plan_items`

`daily_plans`: id, user_id, plan_date (unique with user_id),
wip_limit_snapshot, capacity_minutes_snapshot, closed_at nullable, timestamps.

`daily_plan_items`: id, daily_plan_id, todo_id (unique with plan), position,
state (`planned`|`done`|`dropped`), reason nullable, timestamps.

Snapshots keep history honest when settings change later.

### 4.6 `priority_decisions` (audit)

id, user_id, todo_id nullable, focus_id nullable, action
(`rank`, `commit`, `uncommit`, `override`, `set_main_work`,
`clear_main_work`, `state_move`, `dependency_add`, `dependency_remove`,
`settings_change`, `p0_set`, `p0_clear`), source (`ui`|`api`|`cli`|`mcp`),
actor_user_id, actor_token_id nullable, reason string(500), before json nullable,
after json nullable, created_at.

Indexes: `(user_id, created_at)`, `(todo_id, created_at)`.

## 5. Ranking rule (deterministic, explainable, final policy)

`PriorityEngine` filters then sorts by a lexicographic key. No weights, no sums.

Final policy decisions from the owner (authoritative):

- `main_work_strict = true`: Main Work beats forthcoming deadlines.
- Overdue does **not** automatically beat Main Work.
- P0 Production Critical always ranks first.
- A deadline that becomes threatened produces a warning, not a silent demotion.
- Every override stores its reason and an audit trail.

Eligibility (task is *offerable*):

1. `type = todo`, not completed, not archived, not deleted.
2. `queue_state in (backlog, committed)`.
3. Ready: `focus_id` present when `require_focus`, `estimate_minutes` present when
   `require_estimate`. A live P0 task is always ready.
4. Not blocked by an open dependency. A live P0 task is never hidden by a
   dependency, because production is already broken.

Everything else appears in **triage** with a reason
(`inbox`, `needs_focus`, `needs_estimate`, `blocked_by:<ids>`) and a count.

Sort key (first differing position decides; ties fall through):

| pos | key | order | explanation text |
| --- | --- | --- | --- |
| 0 | P0 live | P0 first | "Production critical: <reason>" |
| 1 | main work | main first (if `main_work_strict`) | "Main work: <title>" |
| 2 | due bucket | overdue, today, ≤3d, ≤7d, later, none | "Overdue since 2026-11-12" |
| 3 | Eisenhower | Q1, Q2, Q3, Q4, unset | "Important + urgent" |
| 4 | unblocks | desc | "Finishing this unblocks 3 tasks" |
| 5 | age | oldest first | "Created 16 days ago" |
| 6 | kanban_order, id | asc | stable tie-break |

`main_work_strict = false` swaps positions 1 and 2. Positions 0 and 3-6 never
move. Because position 1 precedes the due bucket, an overdue task does not
outrank Main Work; only a live P0 does.

### 5.1 Deadline warnings

Warnings never change the order; they make the cost of the order visible.

- `deadline_at_risk`: a task with `due_date` within 3 days (or overdue) ranks
  below Main Work and is not in today's committed set. Fields: `todo_id`,
  `due_date`, `days_left`, `displaced_by` (`main_work` or `p0`).
- `deadline_uncommitted`: `wip_limit` is reached while a task due within 3 days
  is still in `next`.
- `capacity_exceeded`: committed estimate minutes exceed `daily_capacity_minutes`
  (only when capacity > 0).
- `main_work_overdue`: the Main Work itself carries a past due date.

Each warning is returned by `/api/v1/priority/queue` and rendered above the queue
in the UI and by the CLI as a separate block, so a protected main work never
hides a burning deadline silently.

Capacity: the first `wip_limit` items of the ready list are `today`; the rest are
`next`. Adding an item beyond `wip_limit` requires `allow_over_capacity = true`
plus a reason and is audited as `override`. A live P0 commit is accepted without
that flag and is still audited.

## 6. API surface (`/api/v1/priority`)

Bounded DTOs only — id, 140-char title, focus id/title, due date, quadrant,
estimate, state, reasons, key. Never the full `description` (today a single todo
description can be 4 KB of embedded HTML, and `/api/v1/todos` returns 520 KB for
129 rows, which already breaks the MCP 1 MB response cap).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/priority/queue?date=&limit=` | today's plan + next items + triage counts |
| GET | `/api/v1/priority/explain/{todo}` | full reasoning, dependency chain, exclusions |
| POST | `/api/v1/priority/plan` | idempotently ensure the plan for a date |
| POST | `/api/v1/priority/plan/items` | commit a todo (enforces WIP/capacity) |
| DELETE | `/api/v1/priority/plan/items/{todo}` | uncommit with reason |
| GET | `/api/v1/priority/main-work` | current main work |
| POST | `/api/v1/priority/main-work` | set (single active, reason required) |
| DELETE | `/api/v1/priority/main-work` | clear with reason |
| POST | `/api/v1/todos/{todo}/dependencies` | add dependency (cycle-checked) |
| DELETE | `/api/v1/todos/{todo}/dependencies/{dep}` | remove |
| GET | `/api/v1/todos/{todo}/dependencies` | list |
| PATCH | `/api/v1/todos/{todo}/queue-state` | inbox/backlog/committed |
| POST | `/api/v1/todos/{todo}/p0` | declare or extend P0 (reason + expiry) |
| DELETE | `/api/v1/todos/{todo}/p0` | clear P0 with reason |
| GET | `/api/v1/priority/settings` | read settings |
| PATCH | `/api/v1/priority/settings` | update settings |
| GET | `/api/v1/priority/history?todo_id=&from=&to=&limit=` | audit trail |

Auth: existing Sanctum + `zettly:cli` ability. Every query scoped to
`Auth::id()`. Cross-user todo/focus ids return 404, not 403, to avoid leaking
existence. Priority-changing calls require `reason` (min 8 chars) and write a
`priority_decisions` row in the same transaction.

## 7. Service layer (single source of truth)

```
App\Domain\Priority\
  PriorityContext        settings + today + main work + dependency index
  ReadinessGate          isReady(Todo): [ready, missing[]]
  DependencyGraph        blockedIds(), wouldCycle(), unblockCount()
  RankingKey             immutable sort key + reasons builder
  PriorityEngine         rank(Collection): Collection<RankedTodo>
  DayPlanner             ensurePlan(), commit(), uncommit(), capacityCheck()
  MainWorkService        get(), set(), clear()  (transaction + audit)
  PriorityAudit          record(action, before, after, reason, source)
```

Entry points, all thin:

- Web: `App\Http\Controllers\PriorityController` → Inertia `Priority/Index` page.
- API: `App\Http\Controllers\Api\PriorityController` → JSON resources.
- CLI: `zettly priority …` (node, `cli/src/cli.js`) + Artisan `priority:queue`
  and `priority:explain` for parity tests and headless use.
- MCP: `zettly-mcp-server/src/priority-tools.js` → HTTP only, no logic.

Enforcement: an architecture test fails if `App\Domain\Priority` classes are
bypassed by ordering logic elsewhere, and the MCP repository carries a test that
fails when a local scoring table exists in `src/`.

## 8. MCP surface

Audit of the 11 existing tools:

| Tool | Status |
| --- | --- |
| `zettly_api` | keep unchanged (generic passthrough, backend rules still apply) |
| `zettly_note_*` (5) | keep unchanged |
| `zettly_upload_attachment`, `zettly_download_attachment` | keep unchanged |
| `zettly_record_work_outcome` | keep unchanged |
| `zettly_work_briefing` | **fix**: calls `/api/v1/dashboard`, which now exceeds the 1 MB cap, so the tool fails. Rework to `/api/v1/priority/queue` + journal + sessions, keeping the existing top-level keys |
| `zettly_recommend_next_work` | **re-point**: delegate to `/api/v1/priority/queue`; keep input schema and existing output fields, add `tier`, `key`, `explanation` |

New tools (5, one noun each, no overlap):

1. `zettly_priority_queue` — `mode: queue | explain | triage`, `date?`, `limit?`,
   `todo_id?`. Read-only.
2. `zettly_main_work` — `action: get | set | clear`, `target_type?`,
   `target_id?`, `reason?`. Write needs reason; `clear` needs confirmation string.
3. `zettly_priority_plan` — `action: get | commit | uncommit`, `todo_id?`,
   `date?`, `reason?`, `allow_over_capacity?`. Enforces WIP server-side.
4. `zettly_task_dependency` — `action: list | add | remove`, `todo_id`,
   `depends_on_todo_id?`.
5. `zettly_priority_admin` — `action: settings_get | settings_set | history |
   state_move | p0_set | p0_clear`. Settings, queue-state moves, the audit trail,
   and the P0 declaration. `p0_set` and `p0_clear` require the confirmation string
   `P0 <todo_id>` and forward the reason and expiry to the server; the server
   refuses a third concurrent P0.

Deliberately not created: separate tools for "why", "inbox", "backlog", "WIP" —
each would be a thin synonym of one of the five above.

Backward compatibility: no tool is renamed or removed; existing input schemas are
unchanged; outputs only gain fields. `compass.js` and its test are deleted once
`zettly_recommend_next_work` is served by the API, and a guard test prevents a
local scoring table from returning.

## 9. UI

New Inertia page `Priority/Index` (nav label "Today"):

- Capacity header: `3 of 3 committed · 180 of 240 min · main work: <title>`.
- The queue in order, each row showing the deciding reason inline.
- "Next" section (ranked, not committed) with one-click commit.
- Triage panel with counts and existing quick actions (assign focus, estimate,
  move to backlog, mark blocked).
- Main Work picker and policy drawer (WIP, capacity, readiness gates).

The dashboard keeps its counts and gains "Committed today: n/m". No existing page
is removed; `/todos` and `/todos/board` continue to work, with an inbox badge.

## 10. Testing and verification plan

| Layer | Proof |
| --- | --- |
| Unit | `PriorityEngine` order table (each tier position), determinism across shuffled input, stability, `deadline_before_importance` swap |
| Unit | `DependencyGraph` cycle rejection, blocked detection, unblock count |
| Unit | `DayPlanner` WIP enforcement, capacity math, override audit |
| Feature/API | auth + ownership scoping, validation, audit row per mutation, bounded payload (< 100 KB for 129 tasks) |
| Feature/Web | Inertia props equal API DTO for the same user/date |
| CLI | node tests in `cli/tests` + a real smoke run of `zettly priority queue --json` |
| MCP (server repo) | schema snapshot, contract tests with a mocked client, "no local scoring" guard, cue: `zettly_work_briefing` succeeds |
| Regression | the 10 untouched MCP tools keep passing; `/api/v1/todos` unchanged |
| E2E | create → triage → set main work → plan → commit (WIP blocks 4th) → explain → complete → history rows |

Release evidence must include the tool list (added/updated/kept), schema notes,
CLI/API/MCP/UI test output, the E2E transcript, and remaining limitations.

## 11. Rollout and risk

- Feature is per-user opt-in (`user_priority_settings.enabled`); the owner is the
  first enabled account, so no other account changes behaviour.
- Migrations are additive with defaults; the backfill runs as a separate Artisan
  command inside a transaction, after a verified database backup.
- Portable schema (no partial indexes, no `jsonb`-only columns).
- Risk: `require_focus = true` pushes the 51 focus-less tasks into triage. That is
  intended; the triage panel must make the work of clearing them cheap.
- Risk: MCP changes must reach all three devices; the Zettly MCP release needs the
  same central rollout and a verified fleet status before the tools are called
  done.

## 12. Policy (decided)

Decided by the owner on 2026-11-17, implemented as specified:

- `main_work_strict = true`; Main Work outranks forthcoming deadlines.
- P0 Production Critical ranks above everything, bounded to 2 live tasks, maximum
  expiry 72h, owner-only, reason required, audited.
- Overdue does not outrank Main Work; it moves up within its own due bucket only.
- A threatened deadline produces a warning, never a silent demotion.
- Overrides store a reason and an audit row.
