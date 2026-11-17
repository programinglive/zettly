# Zettly Product Consolidation — Work Memory & Execution System

- **Status:** Design only (no implementation, deployment, data mutation, or production code change)
- **Date:** 2026-11-17
- **Owner focus:** Zettly Product Analysis & Improvement Recommendations (focus 110)
- **Canonical task:** Zettly Todo #925 · Draw #572
- **Repository state at design time:** `D:\code\zettly`, branch `main`, clean tree, HEAD `6b18624`

## Verification basis (facts, not assumptions)

| Claim | Evidence |
| --- | --- |
| No `PriorityEngine` class/service exists in the application | `grep PriorityEngine` in `app/` → no match. App only has Eisenhower fields/scopes (`app/Models/Todo.php:83-88, 191-317`) and a urgency sort in `app/Services/ReportDeliveryService.php:61`. |
| Ranking that people call "Priority Engine" lives in a separate repo | `D:\code\zettly-mcp-server\src\compass.js:1-49`: `urgent +40, important +25, overdue +35, due<=3d +20, due<=7d +10, blocked -100, waiting -30`; `rankTodos()` excludes completed, archived and notes. Exposed as MCP `zettly_recommend_next_work`. |
| Report metrics have weak/no independent source | `app/Services/ReportGenerator.php:114-171`: `Projects` comes only from `AgentSession.project`; `Machines` only from `AgentSession.machine`; `Observed active-turn time` only from `AgentSession.duration_seconds`. With no agent sessions these render `Projects: 0`, `Machines: Unavailable`, `0 minutes`. |
| `Tasks completed` mixes units | Same file line 169 adds completed agent sessions **and** completed todos into one number. |
| Legacy data-quality line is real | Lines 178-188 explicitly describe undated legacy completions (constant 28 in live reports) as counted in no period. |
| Focus containers are already multi-active by design | `docs/superpowers/specs/2026-11-11-focus-containers-design.md`: "Focus is a container, not a daily session"; several containers may be active; `focus_id` is a real nullable FK on `todos`, `drawings`, `journal_entries`. |
| Capabilities that must be preserved | 11 Zettly MCP tools; CLI command families in `cli/README.md`; web + `/api/v1` + `/api/v1/coding-agent` routes; 94 test files. |

---

# Part A — Product Design Document (≤ 2 pages)

## A1. Vision and target user

Zettly becomes a **Personal Work Memory & Execution System** for one primary user: a knowledge worker running several parallel projects, often with AI agents, who needs to (1) decide what to work on now, (2) remember what was done, (3) understand why, and (4) know the next step.

Core promise (product text, Indonesian):

> "Zettly membantu saya menentukan apa yang dikerjakan sekarang, mengingat apa yang sudah dikerjakan, memahami alasannya, dan mengetahui langkah berikutnya."

Secondary users (organizations, teams, super-admins) remain supported but are not the primary design target.

## A2. Work Memory — the central concept

**Work Memory** is not a new table. It is a derived, queryable view over four existing artifacts, joined by the relations that already exist:

```
focus_id  → Focus Container (the "why / which project")
todo      → what was committed and what was completed (with real completed_at)
journal_entry → what happened, the decision, and the next action
note      → the reusable knowledge extracted from the work
```

A work memory record is complete when it answers: *which container, what task, what outcome, what decision, what can be reused, what is next*. The product's job is to make that chain easy to create and easy to read back. No new persistence is required to deliver the concept; a read model/service assembles it.

## A3. Core user journey

Today → Task → Focus → Journal → Note (see Part C for the step-level design). The journey is a single loop: commit a small number of tasks for today under a container, execute, record the outcome and reason, extract a reusable note, then let the next cycle be ranked by what was learned.

## A4. Priority Engine relationship

There is **no canonical Priority Engine inside the application today**. The only implemented ranking is the MCP-side deterministic scorer in `zettly-mcp-server/src/compass.js`. The design treats a canonical, headless `PriorityEngine` service as **to be introduced**, with these rules:

- It reuses the existing explicit signals: urgency, importance, due date, and `blocked`/`waiting` tags — the same signals the MCP scorer already uses.
- The in-app Today view and the MCP `zettly_recommend_next_work` must eventually produce the same ordering and reasons. Until that refactor ships, the MCP scorer remains the source of truth and its tool contract does not change.
- It is advisory: it never mutates tasks, never commits work, and always reports missing fields instead of inventing values.
- Daily Execution capacity is a user decision informed by the ranking, not an automatic assignment.

## A5. Definition of success and valid metrics

Only metrics with a traceable source are valid. Targets are directional, not fabricated baselines.

| Metric | Source | Valid? | Success signal |
| --- | --- | --- | --- |
| Todos completed with a real `completed_at` | `todos.completed_at` | Yes | Share of completions with a timestamp increases; undated completions trend to 0 through normal use, not backfill. |
| Open todos created vs closed per week | `todos` timestamps | Yes | Backlog growth rate slows toward zero. |
| Journal entries with `kind=decision` | `journal_entries.kind` | Yes | Decisions captured per week becomes a visible, growing habit. |
| Notes created/updated per week | `todos.type=note` | Yes | Knowledge captured is measurable. |
| Digest actions marked done | new advisory feedback only if added later | Conditional | Do not report until an explicit source exists. |
| `Machines`, `Projects`, `active-turn time` from agent sessions | `agent_sessions` | **No (conditional source)** | Excluded from success metrics; rendered as "Not measured" when sessions are absent. |
| DAU +20% QoQ, time-to-complete −15% (old PRD) | none | **No** | Removed: no instrumentation, no baseline. |

## A6. Product boundaries

**In the primary experience:** Today, Tasks (incl. board/Eisenhower views), Notes, Journal, Reports (weekly digest), Settings.

**Out of the primary experience (still available, not deleted):** Drawings, Habits, Knowledge Graph, Organizations, Tags management, Coding Agent jobs, System Monitor, developer/docs pages, all MCP/CLI/API capabilities.

**Non-goals for this consolidation:** deleting features or endpoints; removing MCP tools; deleting/archiving/backfilling user data; changing `focus_id` relations; restructuring the graph service; enforcing a new task status machine; adding new tag axes.

---

# Part B — Navigation before / after

**Before (11 primary items, verified on the live dashboard):** Dashboard, Todo Board, My Todos, My Notes, Journal, Draw, Habits, Reports, Tags, Coding Agent, System Monitor.

**After (6 primary items):**

| Primary | Contains / replaces |
| --- | --- |
| Today | Dashboard + Focus board + "Main Work" + Daily Execution commitment |
| Tasks | My Todos + Todo Board (board becomes a view inside Tasks) |
| Notes | My Notes |
| Journal | Journal + decision/outcome entry points |
| Reports | Weekly digest first; legacy reports below |
| Settings | Profile, workspace preference, tokens, push, report channels, data/export |

**Moved, not removed:**

| Feature | New location | Route unchanged |
| --- | --- | --- |
| Draw | More → Create | `/draw*` |
| Habits | More → Track | `/habits*` |
| Graph | More → Explore | `/graph` |
| Tags | More → Organize | `/manage/tags*` |
| Coding Agent | Developer → Agent jobs | `/agent/*` |
| System Monitor | Admin → Health (`super-admin`) | `/admin/system-monitor` |
| Developer / docs / legal | Developer / footer | `/developer`, `/docs`, `/legal/*` |

Every route name and URL stays identical. This is a navigation regroup, not a route migration.

---

# Part C — Core user journey (step level)

| Step | User action | Data written / read | Boundary |
| --- | --- | --- | --- |
| 1. Orient | Open Today: see Main Work (max 1), active Focus Containers, Daily Execution list, and the ranked shortlist | Read `foci`, `todos`, `journal_entries`; Priority Engine advisory output | Personal Workspace |
| 2. Choose | Pick what to work on now from ranked shortlist; confirm today's commitment | Existing `todos` fields only in P0; optional `committed_on` in P1 | Personal Workspace |
| 3. Container | Work happens inside the chosen Focus Container | Existing `focus_id` on todos/drawings/journal entries — unchanged | Personal Workspace |
| 4. Execute | Complete the task | `todos.is_completed`, real `completed_at`, optional reason (existing flow) | Personal Workspace |
| 5. Reflect | Write a journal entry: what happened / why / decision / next | `journal_entries` with `kind` and optional `todo_id`, `focus_id` | Personal Workspace |
| 6. Capture | Extract a reusable note and link it | `todos.type=note`, tags, `related_todos`, `focus_id` | Personal Workspace |
| 7. Recall | Weekly digest shows completed, blocked, decisions, knowledge, next actions | Read-only projection over steps 3-6 | Personal Workspace |
| 8. Automate | Agent/CLI/MCP read the same memory and write outcomes | Existing MCP tools and CLI commands, unchanged signatures | Control Plane adapter |

---

# Part D — Feature keep / move / deprecate matrix

"Deprecate" here means **no further primary product investment** — never removal of a route, endpoint, dataset or MCP tool.

| Feature | Decision | Rationale | Capability preserved |
| --- | --- | --- | --- |
| Todos, notes, tags, focus, journal | Keep (primary) | Foundations of Work Memory | All routes/API/CLI/MCP |
| Reports (weekly digest) | Keep + redesign read layer | Core promise needs recall | Legacy report formats untouched |
| Dashboard | Keep, rename to Today, simplify | Primary orientation surface | `/dashboard` unchanged |
| Todo Board / Eisenhower | Move into Tasks as a view | Reduces top-level count | `/todos/board` unchanged |
| Drawings | Move to More | Secondary to memory loop | `/draw*`, CLI `drawings`, API, MCP unaffected |
| Habits | Move to More | Secondary to memory loop | `/habits*`, CLI, API unchanged |
| Knowledge Graph | Keep in More | Duplicate "relation" representation; needs consistency review in P2 | `/graph`, CLI `graph`, API unchanged |
| Tags management | Move to More | 157 tags; configuration, not a daily destination | `/manage/tags*`, CLI, API unchanged |
| Organizations | Keep in Settings/More | Supported secondary user | All routes/API/CLI unchanged |
| Coding Agent jobs | Move to Developer | Control plane, not personal work | `/agent/*`, worker API, approval API unchanged |
| Agent sessions/telemetry | Move to Developer | Infrastructure data source | API + CLI `agent` unchanged |
| System Monitor, email test | Move to Admin | Super-admin only | Routes + middleware unchanged |
| MCP tools (all 11) | Keep, all capabilities | Explicit guardrail | Names, schemas, output shapes unchanged |
| CLI command families | Keep, additive only | Explicit guardrail | Full command list unchanged |

---

# Part E — System boundary

```
Personal Workspace            Developer / Agent Control Plane        System Administration
-------------------            ------------------------------        ----------------------
Today / Tasks / Notes         /agent/jobs, worker APIs               /admin/system-monitor
Journal / Reports digest      coding jobs, approvals, events         /test/email
Settings (profile, tokens)    agent sessions, graph service          super-admin middleware
Work Memory read model        CLI, API, MCP adapters (all preserved)
     |                                   |
     +------ shared auth (sanctum) ------+
```

- Boundaries are **conceptual and navigational**, not separate deployments in this design.
- CLI, API and MCP remain available across boundaries; they are adapters over the same domain, not features to remove.
- No new role is introduced in P0/P1. Existing `auth`, `abilities:zettly:cli`, `coding-agent-*`, and `super-admin` middleware are reused as-is.

---

# Part F — Technical impact matrix

| Area | Change | Classification | Compatibility note |
| --- | --- | --- | --- |
| Sidebar / layout components | Regroup 11 → 6 primary items | **UI-only** | Route names and URLs unchanged; deep links keep working |
| Today page | Compose existing endpoints into one view | **UI-only** | New page uses existing API; no new persistence in P0 |
| Tasks view | Board embedded as a tab inside Tasks | **UI-only** | `/todos/board` and controller unchanged |
| Settings page | Group existing settings sub-pages | **UI-only** | No setting removed |
| Report metric audit | Stop emitting invalid headline metrics in the **new digest only** | **Backward-compatible refactor** | Legacy report markdown, `reportParser.js`, Discord embed and CLI formatter unchanged |
| Weekly digest endpoint | Add read-only `/api/v1/reports/weekly-digest` | **Backward-compatible refactor** | Existing `/reports*` endpoints untouched |
| Work Memory read model | Add headless service + read endpoint | **Backward-compatible refactor** | Additive; no schema required for the read model |
| Main Work marker | Add nullable `is_main` to `foci` + partial unique index on active rows | **Schema migration (additive)** | Nullable, default false, **no backfill**; existing `status`, `started_at`, `completed_at`, `focus_id` untouched |
| Daily Execution commitment | Add nullable `committed_on` date to `todos` + index | **Schema migration (additive)** | Nullable, no backfill; `due_date`, `priority`, `importance` untouched |
| Priority Engine | Introduce app-side headless service using existing signals | **Backward-compatible refactor** | MCP `zettly_recommend_next_work` keeps name, input schema, output shape; local scorer stays as fallback |
| MCP adapters | Later delegate ranking to the app service | **Backward-compatible refactor** | All 11 tools preserved; protocol test unchanged |
| CLI | Additive commands/flags only (e.g. optional `--main`, `--committed`) | **Backward-compatible refactor** | Existing commands and defaults unchanged |
| API | Additive endpoints and optional response fields only | **Backward-compatible refactor** | No field removed or renamed |
| Auth / permissions | Reuse existing middleware | **Backward-compatible refactor** | No new role, no permission widening |
| Existing data | No delete, archive, backfill or migration of rows | **No change** | `focus_id` relations preserved exactly |
| Tests | Add coverage for new behavior; keep all existing tests | **Backward-compatible refactor** | 94 existing test files remain |
| Breaking change | **None in this design** | — | Graph consolidation/tag-pivot cleanup deferred to P2 and gated on compatibility verification |

---

# Part G — Phased implementation roadmap (risk-ordered)

## P0 — Navigation and data quality (lowest risk, highest value)

1. Regroup navigation to 6 primary items; keep every route and deep link.
2. Ship Today as a composition view over existing endpoints.
3. Add the weekly digest as a **new** read-only endpoint; leave legacy report generation, markdown and delivery untouched.
4. Apply the metric validity rule: render "Not measured" when `agent_sessions` data is absent; never fabricate `Projects`, `Machines` or active-turn time.
5. Surface backlog hygiene (open vs closed, undated completions) as read-only information. **Do not auto-archive or delete user data.**

Exit gate: existing route/API tests and the MCP protocol test pass; no data written by P0 features.

## P1 — Domain consistency and Work Memory (after compatibility verification)

Prerequisite: verify cross-repo dependency (`zettly-mcp-server`), CLI consumers and all API clients before any structural change.

1. Add the headless Work Memory read model and its endpoint.
2. Add additive nullable columns for Main Work (`foci.is_main`) and Daily Execution (`todos.committed_on`), with no backfill.
3. Introduce the canonical `PriorityEngine` service; keep MCP local scoring as fallback; align ordering and reasons.
4. Add additive CLI flags and optional API fields; keep defaults identical.

Exit gate: MCP tool contracts unchanged; `focus current`, `todos`, `todos priorities` and all focus endpoints return identical shapes for existing clients.

## P2 — Architecture reduction (highest risk, last)

1. Collapse duplicate tag pivots and event-log shapes behind compatibility shims; keep old endpoints.
2. Decide and verify graph-service integration or retirement — treat any endpoint removal as a **breaking change** requiring explicit approval.
3. Consolidate notification paths without removing channels.

Exit gate: full compatibility matrix signed off before any structural refactor starts.

---

# Part H — Acceptance criteria and regression risks

## Acceptance criteria

- [ ] Primary navigation shows exactly 6 items; every moved feature is reachable in ≤ 2 clicks from More, Developer or Admin.
- [ ] Every pre-existing web route and `/api/v1` route keeps its name, URL, method and status-code behavior.
- [ ] All 11 Zettly MCP tools are present with unchanged names, input schemas and output shapes; `tests/protocol.test.js` passes.
- [ ] Every CLI command family in `cli/README.md` remains available; new flags are optional.
- [ ] `focus_id` on `todos`, `drawings` and `journal_entries` is unchanged; no nulling, backfill or relation removal.
- [ ] The weekly digest contains exactly the five agreed sections and shows "Not measured" for metrics with no valid source.
- [ ] No user data is deleted, archived or migrated in P0/P1; P1 columns are nullable with no backfill.
- [ ] Existing 94 test files pass; new tests cover navigation, digest validity and additive schema defaults.
- [ ] No production code, endpoint or integration was changed during this design phase.

## Regression risks

| Risk | Mitigation |
| --- | --- |
| `reportParser.js`, Discord embed and CLI formatter depend on fixed markdown shape | Never change legacy report content; new digest is a separate endpoint |
| Older MCP clients throw `FOCUS_CONFLICT` with multiple active foci | Do not change `foci.status`/`completed_at` semantics; Main Work is an additive flag |
| `today` as a tag would worsen the existing 157-tag sprawl | Use nullable `committed_on` column instead of a reserved tag |
| Partial unique index on `is_main` could conflict with existing rows | Default false, no backfill, index only active rows |
| `focus current` semantics could drift and break CLI/MCP | Keep current behavior; expose Main Work only as an additional field |
| Mixed-unit `Tasks completed` confuses existing consumers | Keep legacy number intact; separate the units only in the new digest |
| Nav regroup breaks tablet/PWA layout or deep links | Keep component structure and route names; test responsive layout |
| Graph/tag consolidation removes a capability | Defer to P2, behind shims, with explicit compatibility sign-off |

---

# Recommendation — smallest risk, largest benefit

Start with **P0 only**: the 6-item navigation regroup plus an honest weekly digest delivered as a **new, read-only endpoint** that reuses existing data and says "Not measured" where the source is missing.

This delivers all four parts of the core promise — what to do now (Today), what happened and why (Journal + decisions), and what is next (ranked advisory actions) — with **zero schema changes, zero data mutation, zero MCP/CLI/API contract changes, and no change to the legacy report format that downstream parsers depend on**. It is reversible with a single frontend/endpoint rollback and gives clean evidence for deciding whether P1's additive columns are actually needed.
