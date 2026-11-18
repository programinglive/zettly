# Implementation Prompt — Zettly Priority Engine + MCP Synchronization

Copy this whole prompt into a fresh implementation session. It assumes the design
document `docs/superpowers/specs/2026-11-17-priority-engine-design.md` is already
approved by the owner.

---

## Role and mission

You are implementing the Zettly Priority Engine exactly as specified in
`docs/superpowers/specs/2026-11-17-priority-engine-design.md`. Your job is to make
Zettly able to answer "what should I do now, and why?" with one deterministic
server-side rule that the web UI, API, CLI and MCP all share.

Register the work with the dev-workflow MCP before the first edit (`start_task`
with the existing canonical task for this focus, `projectDir D:\code\zettly`),
record the Mermaid flow, then keep the task and its Zettly Todo updated with real
evidence.

## Non-negotiable constraints

1. **One rule, one place.** The ordering logic lives only in
   `App\Domain\Priority`. Controllers, the node CLI and the MCP server must not
   compute rank, score, or ordering. If you find yourself writing a weight or a
   comparator outside that namespace, stop.
2. **CLI-first.** Every capability must be executable through
   `zettly priority …` and through the Artisan commands before the UI is wired.
3. **No bypass.** MCP calls the same API endpoints as the CLI. No MCP-only path,
   no MCP-side limit override. Every priority-changing endpoint validates input,
   scopes to `Auth::id()` and writes an audit row in the same transaction.
4. **Bounded payloads.** Priority responses never include `description`,
   attachments or related-todo graphs. Title is truncated to 140 characters. The
   full queue for 129 tasks must stay under 100 KB, because the MCP client caps
   responses at 1 MB.
5. **Additive only.** No column drops, no renames, no changes to note, journal,
   drawing, habit or report semantics. Existing `/api/v1/todos` behaviour stays.
6. **Backward compatibility.** Existing MCP tool names, input schemas and output
   keys are preserved. New fields are additive. `compass.js` may only be removed
   after `zettly_recommend_next_work` is verified against the API.
7. **Database safety.** Before running any migration or backfill on a non-local
   database, take a full backup, verify the dump completed, verify gzip integrity,
   record size and sha256, and report the path in the task. Local SQLite dev
   databases are exempt.

## Final policy (authoritative, decided 2026-11-17)

- `main_work_strict = true`; Main Work outranks forthcoming deadlines.
- P0 Production Critical always ranks first. Need not wait for readiness.
- Overdue does not outrank Main Work; it only moves up inside its due bucket.
- A threatened deadline produces a warning (`deadline_at_risk`,
  `deadline_uncommitted`), never a silent demotion.
- Every override stores a reason and a `priority_decisions` row.
- P0: owner-only, reason required, expiry required (≤72h, default 24h), at most 2
  live per user, set/clear audited, MCP requires confirmation `P0 <todo_id>`.

## Phase 0 — Baseline (read-only)

- Record the current numbers: open tasks, quadrant distribution, tasks with due
  dates, tasks without focus, active focuses, and the size of
  `/api/v1/todos?filter=pending` (it is ~520 KB today).
- Confirm the two known defects: `Api\TodoController@index` orders by `latest()`,
  and `zettly_work_briefing` fails because `/api/v1/dashboard` exceeds the MCP
  response cap. Both must be reproducible before and fixed/justified after.
- Write the baseline into the task as evidence.

## Phase 1 — Schema and domain (headless, no UI, no MCP)

Create migrations for `main_work`, `user_priority_settings`, `todo_dependencies`,
`daily_plans`, `daily_plan_items`, `priority_decisions`, and the additive `todos`
columns `queue_state` (default `inbox`), `estimate_minutes`, `triaged_at`,
`is_p0`, `p0_reason`, `p0_since`, `p0_expires_at`, `p0_by`.

Rules:

- Portable types only (SQLite and PostgreSQL): no partial unique indexes, no
  `jsonb`-only columns, `json` via the Laravel schema builder.
- `main_work.user_id` is unique; history lives in `priority_decisions`.
- `todo_dependencies` unique on `(todo_id, depends_on_todo_id)`.
- `daily_plans` unique on `(user_id, plan_date)`; `daily_plan_items` unique on
  `(daily_plan_id, todo_id)`.
- The backfill of existing open tasks to `queue_state = backlog` is a separate
  Artisan command (`priority:backfill`), idempotent, wrapped in a transaction,
  with a `--dry-run` flag and a count report.
- No row in `user_priority_settings` means the feature is off. Do not enable any
  user except the owner (`enabled = true`) in the backfill.

Build `App\Domain\Priority`:

- `PriorityContext` — settings, today in WIB, current main work, dependency index.
- `ReadinessGate` — `inbox`, `needs_focus`, `needs_estimate`, plus ready.
- `DependencyGraph` — `blockedIds`, `wouldCycle`, `unblockCount`, batch-loaded.
- `RankingKey` — immutable 7-position key plus the reason strings for the
  positions that decided a comparison.
- `PriorityEngine` — pure `rank(Collection $todos, PriorityContext $ctx)`.
- `DayPlanner` — `ensurePlan`, `commit`, `uncommit`, capacity and WIP checks.
- `MainWorkService` — `get`, `set`, `clear`, transactional, audited.
- `PriorityAudit` — `record(action, before, after, reason, source)`.

Write unit tests first (TDD) for the order table, determinism under shuffled
input, `deadline_before_importance` swap, cycle rejection, blocked detection,
WIP enforcement and capacity math. Do not continue while any of these fail.

## Phase 2 — API and CLI

Implement `/api/v1/priority/*` exactly as tabled in the design (queue, explain,
plan, plan items, main-work, settings, history) plus the three
`/api/v1/todos/{todo}/…` routes for dependencies and queue state.

- Require `reason` (min 8 chars) on: commit override, uncommit, main-work set,
  main-work clear, queue-state move, settings change.
- Return 404 for foreign todo/focus ids. Return 422 with a machine-readable
  `code` (`wip_limit_reached`, `dependency_cycle`, `not_ready`, `capacity_exceeded`)
  and a human message.
- Serialize through one `PriorityQueueItemResource` and one
  `PriorityPlanResource`; assert the payload size in a test.
- Keep `/api/v1/todos` untouched.

Then the CLI: `zettly priority queue|explain|triage|commit|uncommit|main-work|
history|settings|state|deps` in `cli/src/cli.js`, with `--json` on every command
and human-readable output as the default. Add node tests and one real smoke run.

Add Artisan `priority:queue` and `priority:explain` that call the same services,
and an architecture test that fails when priority ordering logic appears outside
`App\Domain\Priority`.

Verification gate: CLI output and API response must be byte-identical for the
same user and date (modulo timestamps).

## Phase 3 — Web UI

New Inertia page `Priority/Index` (navigation label "Today") rendering the same
`PriorityQueueResource`: capacity header, ordered queue with an inline reason per
row, "Next" section with commit, triage panel with counts and quick actions, main
work picker, policy drawer for WIP/capacity/readiness.

Do not remove `/todos` or `/todos/board`. Add an inbox badge and a "Committed
today: n/m" line to the dashboard. Add a feature test asserting the Inertia props
equal the API DTO for the same user and date.

## Phase 4 — MCP synchronization

Repository: `D:\code\zettly-mcp-server`.

1. Re-point `zettly_recommend_next_work` to `/api/v1/priority/queue`. Keep the
   input schema (`date`, `limit`). Keep existing output keys (`id`, `title`,
   `score`, `reasons`, `missing`); add `tier`, `key`, `explanation`,
   `excluded_reason`. Mark `score` deprecated in the description.
2. Fix `zettly_work_briefing`: stop calling `/api/v1/dashboard` (it exceeds the
   response cap and the tool fails today). Build it from `/api/v1/priority/queue`,
   `/api/v1/journal/entries`, `/api/v1/agent/sessions`, keeping the existing
   top-level keys and adding `capacity`.
3. Add the five new tools, one noun each, no overlap:
   `zettly_priority_queue`, `zettly_main_work`, `zettly_priority_plan`,
   `zettly_task_dependency`, `zettly_priority_admin` — with the `action`/`mode`
   enums from the design. Write actions must forward `reason` and must never
   bypass server-side limits; surface a server rejection as a clear error.
4. Delete `src/compass.js` and its test only after (1) passes against the live
   API. Replace them with a guard test that fails if local scoring constants
   reappear under `src/`.
5. Update `docs/API-COVERAGE.md`, the README tool list, and the prompt texts
   (`plan_my_day` should use the priority queue and the capacity gate).

Compatibility check: the 6 untouched read/write tools plus `zettly_api` must
still pass their existing tests.

## Phase 5 — Verification and release evidence

Run and capture, do not summarize from memory:

- `php artisan test` (or the repo's configured test command) — full suite.
- `npm test` in `cli/`, plus a real `zettly priority queue --json` smoke run.
- `npm test` in `zettly-mcp-server/`.
- One end-to-end transcript: create a task → triage it → set main work → plan the
  day → commit until the WIP limit rejects the next one → `explain` shows the
  reasons → complete it → `history` shows the audit rows.
- A UI screenshot or test assertion showing the same queue order as the CLI.

Then report in the task and in the final message:

- MCP tools added, updated and kept, with one line each.
- Schema changes and the compatibility strategy.
- CLI, API, MCP and UI test results.
- End-to-end evidence.
- Remaining limitations and follow-up work.

A Zettly feature is not done while the relevant MCP capability is missing or
unverified.

## Definition of done (exact items)

1. Migrations applied on a backed-up database; `priority:backfill` idempotent.
2. `App\Domain\Priority` unit tests cover every rank position and the gates.
3. `/api/v1/priority/*` implemented, scoped, audited, bounded; feature tests green.
4. `zettly priority …` works and matches the API output for the same date.
5. `Priority/Index` page renders the same order as the CLI; props parity test green.
6. Five new MCP tools added, two existing tools fixed/re-pointed, 7 legacy tools
   regression-tested, local scoring removed with a guard test.
7. E2E transcript attached as evidence.
8. MCP release rolled out centrally and fleet status verified on all three devices
   before the tools are declared available.

## Out of scope

Calendar integration, LLM-based ranking, organisation-level priority, automatic
task creation from email or GitLab, and any change to notes, journal, drawings,
habits or reports.

## Stop conditions

Stop and ask the owner if: the ranking order needs a policy that changes what
"main work" means; a migration would need to rewrite existing rows destructively;
an existing MCP tool would need a breaking schema change; or the fleet rollout
cannot be verified on every device.
