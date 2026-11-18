# Zettly P0 — Work Memory Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the lowest-risk half of the approved consolidation — a 6-item primary navigation, an honest read-only Today page, and a new read-only weekly digest with five sourced sections — without changing any existing route, report contract, CLI command, MCP tool, schema, or user data.

**Architecture:** Three UI/adapter changes plus one additive headless service. Navigation is regrouped in the single existing `AppLayout.jsx` source used by both desktop and mobile. Today is assembled server-side by extending the existing `DashboardController` Inertia payload with a read-only `today` key; no client-side ranking is introduced. The weekly digest is a new deterministic `WeeklyDigestService` with explicit provenance per section, exposed by a new additive `/api/v1/reports/weekly-digest` endpoint and rendered above the legacy Reports list; the legacy `ReportGenerator` markdown, delivery jobs and parsers are untouched.

**Tech Stack:** Laravel 12, Inertia + React JSX, Tailwind, PHPUnit, node:test (`npm run test:js`), CLI node:test (`npm run test:cli`), Playwright for viewport checks, MCP `tests/protocol.test.js` in the separate `zettly-mcp-server` repo.

**Spec:** `docs/superpowers/specs/2026-11-17-zettly-work-memory-consolidation-design.md` (approved 2026-11-17; Parts A, B, C, D, E, F, G, H).

## Global Constraints

- **Implementation is NOT authorized by this document.** Execute only after explicit owner approval.
- No schema migration, no user data deletion/archivation/backfill, no production data mutation.
- No breaking API changes: no route name, URL, HTTP method, request field, or response field removed or renamed.
- All existing features remain reachable; "move" means navigation placement only.
- All 11 Zettly MCP tools keep their names, input schemas and output shapes.
- All CLI command families in `cli/README.md` keep working; new flags are optional.
- No deployment, no release, no `npm run release`, no `git push` to production paths during implementation.
- Repository identity gate: confirmed `D:/code/zettly`, `origin https://github.com/programinglive/zettly.git`, branch `main`, HEAD `6b18624cee4ca5233b772d466e376a3efaa2f7e7`. Do not touch `feat/agent-approval-api` or any other agent worktree/branch.
- Single-writer lock: one implementation session at a time on the chosen implementation branch.
- CLI-first: domain logic lives in `app/Services/WeeklyDigestService.php`; the HTTP endpoint and React page are thin adapters. No CLI command is required for P0, but none may be broken.
- Copy rule: the literal string `Not measured` is used for any metric with no valid source. Static advice text such as `- Continue from activity/ACTIVE.md.` must not appear in the new digest.
- Timezone rule: `Asia/Jakarta` for all digest period boundaries, matching `ReportGenerator::periodFor()`.
- Conventional Commits; every task ends with its own commit and its own test evidence.
- No fabricated completion claims: a task is done only when its stated test command passes and output is recorded.

## Review Focus

These are the silent failure modes the spec implies; each is pinned by a test in the owning task.

1. **Legacy report consumers** (`reportParser.js`, Discord embed, CLI formatter) parse fixed markdown — a digest change must not touch `ReportGenerator` output. → Task 4 regression test asserts `ReportGenerator::render()` output byte-for-byte unchanged for a fixed fixture.
2. **Several active foci** are normal and older MCP clients may throw `FOCUS_CONFLICT` — Today must not invent a single "Main Work". → Task 2 test with two active foci asserts `current_work` lists both and sets `main_work = null` with an honest message.
3. **Undated completions** (constant 28 in live data) must not be counted as completed work. → Task 4 test creates a completed todo with `completed_at = null` and asserts it is excluded from `completed_work` and reported only under `data_quality`.
4. **No agent session data** is the common case for CLI/MCP-originated work — Machines/Projects/active-turn time must read `Not measured`, never `0`/`Unavailable`. → Task 4 test with zero `AgentSession` rows asserts those three metric values.
5. **Navigation parity and reachability** on desktop and mobile — moving a menu must not hide a feature. → Task 1 tests assert the same primary array drives both renderers and that all 11 legacy hrefs remain present; Playwright check at 1280px and 390px.
6. **Authorization leakage** — Coding Agent is owner-gated and System Monitor is super-admin-gated. → Task 1 frontend test asserts those entries are conditional; Task 5 API test asserts a second user cannot read another user's digest.

---

## File Structure (locked decisions)

| File | Responsibility | New/Modified |
| --- | --- | --- |
| `resources/js/Layouts/AppLayout.jsx` | Single source for desktop sidebar + mobile drawer nav | Modify |
| `resources/js/__tests__/appLayoutPrimaryNav.test.js` | Source-level nav contract (6 primary, all legacy hrefs, gating) | Create |
| `resources/js/__tests__/appLayoutReportsNav.test.js` | Existing contract — must keep passing unchanged | Keep |
| `app/Http/Controllers/DashboardController.php` | Additive read-only `today` prop | Modify |
| `resources/js/Pages/Dashboard.jsx` | Render Today blocks with empty/loading/fallback states | Modify |
| `resources/js/__tests__/todayPage.test.js` | Today rendering and honest-empty-state contract | Create |
| `tests/Feature/DashboardPayloadTest.php` | Existing payload contract — must keep passing | Keep |
| `app/Services/WeeklyDigestService.php` | Headless deterministic digest with provenance | Create |
| `tests/Unit/WeeklyDigestServiceTest.php` | Section sourcing and `Not measured` rules | Create |
| `app/Http/Controllers/Api/ReportController.php` | Additive `weeklyDigest()` action | Modify |
| `routes/api.php` | Additive `GET api/v1/reports/weekly-digest` route | Modify |
| `tests/Feature/Api/WeeklyDigestApiTest.php` | API shape, auth, isolation, no-write | Create |
| `resources/js/Pages/Reports/Index.jsx` | Digest-first block above legacy list | Modify |
| `app/Http/Controllers/ReportsController.php` | Additive `weeklyDigest` prop on `index()` | Modify |
| `resources/js/__tests__/weeklyDigestView.test.js` | Digest rendering and empty states | Create |

No migration file, no model file, no CLI source file, no MCP source file, no `ReportGenerator.php` change in P0.

---

## Task 1 — Sidebar regroup to 6 primary items (UI-only)

**Files:**
- Modify: `resources/js/Layouts/AppLayout.jsx:47-130` (nav arrays), `:267-293` (desktop render), `:317-339` (mobile render)
- Create: `resources/js/__tests__/appLayoutPrimaryNav.test.js`
- Keep passing: `resources/js/__tests__/appLayoutReportsNav.test.js`, `resources/js/__tests__/appLayoutBrandLink.test.js`, `resources/js/__tests__/appLayoutProfileMenu.test.js`

**Interfaces:**
- Consumes: `page.props.canUseCodingAgent`, `page.props.canProvisionCodingAgent`, `auth.user.role === 'super_admin'` (already provided by `HandleInertiaRequests::share`).
- Produces: `primaryNavigation` (exactly 6 entries: `/dashboard`, `/todos`, `/notes`, `/journal`, `/reports`, `/settings`), `secondaryNavigation` (`/todos/board`, `/draw`, `/habits`, `/graph`, `/manage/tags`), `developerNavigation` (`/agent/jobs` or `/agent/setup`), `adminNavigation` (`/admin/system-monitor`). Every entry keeps `{href, label, icon, group}`.

- [ ] **Step 1: Write the failing test** in `resources/js/__tests__/appLayoutPrimaryNav.test.js`:
  - assert `primaryNavigation` block contains exactly the six hrefs above, in that order;
  - assert the file still contains every legacy href (`/todos/board`, `/draw`, `/habits`, `/graph`, `/manage/tags`, `/agent/jobs`, `/agent/setup`, `/admin/system-monitor`, `/organizations`, `/profile`);
  - assert the desktop `<nav>` block and mobile drawer block both map `primaryNavigation` (single shared array);
  - assert `canUseCodingAgent` / `canProvisionCodingAgent` / `isSuperAdmin` guards still wrap the developer/admin entries.

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:js
```
Expected: FAIL with "Expected exactly six primary navigation entries".

- [ ] **Step 3: Restructure `AppLayout.jsx`**

Split the current `sidebarNavigation` literal into the four arrays named in Interfaces. Keep `brandHref`, `isActive()`, `profileMenuItems`, collapse button, profile dropdown, and all existing class names. Add a "More" disclosure rendered in both the desktop `<nav>` and the mobile drawer that expands `secondaryNavigation` and `developerNavigation`; render `adminNavigation` only for `isSuperAdmin`. Keep `/settings` as a primary entry pointing at the existing `/profile` page (no new route): use `href: '/profile'` with `label: 'Settings'`, and keep the existing "Profile Settings" profile-menu item intact.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm run test:js
```
Expected: all existing JS tests plus the new file PASS, including `appLayoutReportsNav.test.js` (Reports remains `group: 'main'`).

- [ ] **Step 5: Viewport acceptance check with Playwright**

At `1280x800` and `390x844`, open `/dashboard`; assert exactly six primary links are visible, then open "More" and assert Draw/Habits/Graph/Tags and Coding Agent (owner) or System Monitor (super admin) are reachable. Record both snapshots as evidence.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Layouts/AppLayout.jsx resources/js/__tests__/appLayoutPrimaryNav.test.js
git commit -m "feat(nav): regroup primary sidebar into six destinations without removing routes"
```

**Rollback:** `git revert <commit>`. No data or route state to restore.

---

## Task 2 — Read-only Today aggregation in DashboardController (additive, no ranking)

**Files:**
- Modify: `app/Http/Controllers/DashboardController.php:11-62`
- Test: `tests/Feature/DashboardPayloadTest.php` (add new tests, keep all existing assertions)
- Keep passing: `tests/Feature/DashboardTest.php`, `tests/Feature/FocusDashboardListTest.php`

**Interfaces:**
- Consumes: `$user->activeFoci()` (`app/Models/User.php:125`), `$user->todos()->notArchived()->tasks()`, `$user->todos()->notArchived()->notes()`, `$user->journalEntries()` (`app/Models/User.php`), `AgentSessionIngestor::redact()` for excerpts.
- Produces: new Inertia prop `today` with shape:
```
today = {
  current_work: {
    status: 'ok' | 'no_data',
    main_work: null,                       // always null in P0; never inferred from active foci
    items: [{ id, title, status }],        // from activeFoci(), newest first, limit 5
    message: string|null                   // honest text when no_data
  },
  open_tasks: {
    status: 'ok' | 'no_data',
    items: [{ id, title, due_date, priority, importance }],  // limit 5, ordered by created_at desc only
    total_open: int
  },
  recent_activity: {
    status: 'ok' | 'no_data',
    items: [{ id, kind, entry_date, excerpt }]               // journal entries, limit 5
  },
  linked_notes: {
    status: 'ok' | 'no_data',
    items: [{ id, title, updated_at }]                       // reuse existing $notes, limit 5
  }
}
```
Existing props `tasks`, `filters`, `availableTags`, `notes`, `preferences` remain byte-identical in name and value.

- [ ] **Step 1: Write the failing feature tests** in `tests/Feature/DashboardPayloadTest.php`:
  - `test_today_prop_contains_current_work_open_tasks_recent_activity_and_linked_notes` — seed two foci, three todos, one journal entry, one note; assert all four keys and their item fields;
  - `test_today_uses_no_ranking_and_no_main_work` — with two active foci assert `current_work.items` contains both ids and `current_work.main_work === null`;
  - `test_existing_dashboard_props_are_unchanged` — assert the five legacy keys still exist with the same types (guards the contract).

- [ ] **Step 2: Run the tests to verify they fail**

```bash
php artisan test --filter=DashboardPayloadTest
```
Expected: FAIL with "Response doesn't have the prop `today`".

- [ ] **Step 3: Extend `DashboardController::__invoke()`**

Append one `'today' => [...]` key to the existing `Inertia::render('Dashboard', [...])` array. Build each block from the relations listed in Consumes. Use `status: 'no_data'` plus a literal message when a collection is empty; never call a ranking helper and never infer a "Main Work". Cap every list at 5 items.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
php artisan test --filter=DashboardPayloadTest
php artisan test --filter=DashboardTest
php artisan test --filter=FocusDashboardListTest
```
Expected: PASS with no skipped assertions.

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/DashboardController.php tests/Feature/DashboardPayloadTest.php
git commit -m "feat(today): add read-only aggregation props without changing dashboard contract"
```

**Rollback:** `git revert <commit>`. If a partial rollout already served the new prop, the old page ignores unknown Inertia props; no data state to unwind.

---

## Task 3 — Today page rendering with honest states (UI-only)

**Files:**
- Modify: `resources/js/Pages/Dashboard.jsx:1-120` and the JSX body where the four blocks render
- Create: `resources/js/__tests__/todayPage.test.js`
- Keep: `resources/js/__tests__/focusGreeting.test.js`, `resources/js/Components/FocusGreeting.jsx` unchanged

**Interfaces:**
- Consumes: the `today` prop from Task 2; existing `notes`, `tasks`, `preferences` props.
- Produces: four labelled blocks rendered from `today.*`; no new props, no new client-side fetches, no new sorting.

- [ ] **Step 1: Write the failing frontend test** in `resources/js/__tests__/todayPage.test.js`:
  - assert `Dashboard.jsx` source destructures `today` and renders `today.current_work`, `today.open_tasks`, `today.recent_activity`, `today.linked_notes`;
  - assert every block has a `status === 'no_data'` branch rendering the prop's `message` (honest empty state) and that no block uses `.sort(` or a scoring call;
  - assert a missing `today` prop falls back to a single "Today data unavailable" message instead of throwing.

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:js
```
Expected: FAIL with "Expected Dashboard to consume the today prop".

- [ ] **Step 3: Update `Dashboard.jsx`**

Rename visible heading from "Dashboard" to "Today" while keeping `<Head title="Dashboard" />` unchanged (title contract). Replace the existing focus/counts/notes presentation with the four blocks from `today`. Keep `FocusGreeting` mounted as-is for focus actions. Preserve `ReorderDebug` super-admin gating and the existing FAB. Preserve `preferences.workspace_view` behavior.

- [ ] **Step 4: Run the tests**

```bash
npm run test:js
npm run build
```
Expected: PASS; Vite build succeeds with no unresolved imports.

- [ ] **Step 5: Playwright empty-state check**

With a fresh user (no foci, no journals, no notes) open `/dashboard`; assert four honest empty messages and no recommendation text. Record snapshot as evidence.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Dashboard.jsx resources/js/__tests__/todayPage.test.js
git commit -m "feat(today): render sourced work memory blocks with honest empty states"
```

**Rollback:** `git revert <commit>`; the server prop from Task 2 remains harmless.

---

## Task 4 — WeeklyDigestService with provenance and `Not measured` (headless)

**Files:**
- Create: `app/Services/WeeklyDigestService.php`
- Create: `tests/Unit/WeeklyDigestServiceTest.php`
- Keep unchanged: `app/Services/ReportGenerator.php`, `resources/js/lib/reportParser.js`, `app/Services/ReportDeliveryService.php`

**Interfaces:**
- Consumes: `Todo`, `JournalEntry`, `User` models; `ReportGenerator::periodFor('weekly', $date)` for boundaries.
- Produces: `WeeklyDigestService::forUser(User $user, CarbonImmutable $start, CarbonImmutable $end): array` with return shape:
```
[
  'period' => ['start' => 'Y-m-d', 'end' => 'Y-m-d', 'timezone' => 'Asia/Jakarta'],
  'sections' => [
    'completed_work'       => section(...),
    'blocked_work'         => section(...),
    'important_decisions'  => section(...),
    'knowledge_captured'   => section(...),
    'next_actions'         => section(...),
  ],
  'metrics' => [
    'tasks_completed'      => ['value' => int, 'provenance' => 'todos.completed_at'],
    'agent_active_minutes' => ['value' => 'Not measured', 'provenance' => 'agent_sessions.duration_seconds'],
    'machines'             => ['value' => 'Not measured', 'provenance' => 'agent_sessions.machine'],
    'projects'             => ['value' => 'Not measured', 'provenance' => 'agent_sessions.project'],
  ],
  'data_quality' => [
    'undated_completions' => int,   // count only, explicitly not throughput
  ],
]
```
where `section(...) = ['label' => string, 'provenance' => string, 'status' => 'ok'|'no_data', 'items' => [['id'=>int,'title'=>string,'date'=>string,'source'=>string]], 'message' => string|null]`.

Section sourcing rules (exact):
- `completed_work`: `todos.is_completed = true` and `completed_at` between `$start`/`$end`; provenance `todos.completed_at`; exclude undated completions.
- `blocked_work`: open non-archived todos carrying tag name `blocked` or `waiting` (case-insensitive), plus `journal_entries.kind = 'blocker'` in period; provenance `todos.tag(blocked|waiting), journal_entries.kind=blocker`.
- `important_decisions`: `journal_entries.kind = 'decision'` with `entry_date` in period; provenance `journal_entries.kind=decision`.
- `knowledge_captured`: `todos.type = 'note'`, non-archived, `created_at` or `updated_at` in period; provenance `todos.type=note`.
- `next_actions`: open non-archived todos with a non-null `due_date` falling within `[$start, $end + 7 days]` (overdue included), plus `journal_entries.kind = 'handoff'` in period; ordered by `date` ascending then `id` ascending; **no score, no static advice**; provenance `todos.due_date, journal_entries.kind=handoff`. Empty result uses message `No sourced next actions in this period.`

- [ ] **Step 1: Write the failing unit tests** in `tests/Unit/WeeklyDigestServiceTest.php`:
  - `test_each_section_has_a_provenance_and_exact_source` — seed one row per section and assert section keys, `provenance` strings and item `source` values;
  - `test_undated_completion_is_excluded_and_reported_as_data_quality` — completed todo with null `completed_at`;
  - `test_agent_metrics_are_not_measured_without_sessions` — no `AgentSession` rows;
  - `test_next_actions_use_only_dated_todos_and_handoff_journals` — include an undated urgent todo and the legacy static text, assert neither appears;
  - `test_report_generator_output_is_unchanged` — render a fixed fixture through `ReportGenerator::render()` and assert the exact expected markdown string including `- Continue from activity/ACTIVE.md.` (legacy contract guard).

- [ ] **Step 2: Run the tests to verify they fail**

```bash
php artisan test --filter=WeeklyDigestServiceTest
```
Expected: FAIL with "Class App\Services\WeeklyDigestService not found".

- [ ] **Step 3: Implement the service**

Use `ReportGenerator::periodFor()`-compatible boundaries, Eloquent queries scoped by `user_id`, and a small private `section()` helper that produces the exact shape above. Deterministic ordering only (`date`, then `id`). Do not call `ReportGenerator`, do not write to any table, do not read `agent_sessions` for values.

- [ ] **Step 4: Run the tests**

```bash
php artisan test --filter=WeeklyDigestServiceTest
php artisan test --filter=ReportGeneratorTest
```
Expected: PASS; legacy report assertions unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/Services/WeeklyDigestService.php tests/Unit/WeeklyDigestServiceTest.php
git commit -m "feat(reports): add headless weekly digest with provenance and not-measured metrics"
```

**Rollback:** `git revert <commit>`. No writes, no schema.

---

## Task 5 — Additive weekly digest API endpoint (backward-compatible)

**Files:**
- Modify: `routes/api.php` (inside the `auth:sanctum`, `abilities:zettly:cli` v1 group, near the existing `reports` routes)
- Modify: `app/Http\Controllers\Api\ReportController.php` (add `weeklyDigest()` only)
- Create: `tests/Feature/Api/WeeklyDigestApiTest.php`
- Keep passing: `tests/Feature/Api/ReportApiTest.php`

**Interfaces:**
- Consumes: `WeeklyDigestService::forUser(...)` from Task 4.
- Produces: `GET /api/v1/reports/weekly-digest?date=YYYY-MM-DD` → `200 {"success": true, "data": <digest>}`. Optional `date` validated as `date_format:Y-m-d`, default `today('Asia/Jakarta')`. No other parameter. Response is read-only and contains no HTML.

- [ ] **Step 1: Write the failing feature tests** in `tests/Feature/Api/WeeklyDigestApiTest.php`:
  - `test_owner_can_read_weekly_digest_with_five_sections` — assert HTTP 200, five section keys, every section has `provenance`, `metrics.*.value === 'Not measured'` where applicable;
  - `test_guest_and_wrong_ability_are_rejected` — assert 401 for guest and 403 for a token without `zettly:cli`;
  - `test_digest_is_scoped_to_authenticated_user` — seed another user's decision journal, assert it is absent;
  - `test_digest_endpoint_does_not_create_reports_or_deliveries` — assert `reports` and `report_deliveries` counts unchanged after the call;
  - `test_legacy_reports_endpoints_are_unchanged` — assert `GET /api/v1/reports` still returns the previous shape and status.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
php artisan test --filter=WeeklyDigestApiTest
```
Expected: FAIL with 404 for `/api/v1/reports/weekly-digest`.

- [ ] **Step 3: Add route and controller action**

Register the route with name `api.v1.reports.weekly-digest` in the existing authenticated v1 group. Implement `weeklyDigest(Request $request, WeeklyDigestService $digest): JsonResponse` using `Auth::user()` and `ReportGenerator::periodFor(Report::KIND_WEEKLY, $date)`. Do not modify any existing controller method.

- [ ] **Step 4: Run the tests**

```bash
php artisan test --filter=WeeklyDigestApiTest
php artisan test --filter=ReportApiTest
php artisan test --filter=CliAbilityMiddlewareTest
```
Expected: PASS; no existing report test changed.

- [ ] **Step 5: CLI compatibility check (read-only)**

```bash
node --test cli/tests/*.test.js
```
Expected: all CLI routing/parity tests PASS; the new endpoint is additive and no CLI source file changed. Optionally verify `zettly reports list --json` against a dev token still returns the legacy shape (no production token).

- [ ] **Step 6: Commit**

```bash
git add routes/api.php app/Http/Controllers/Api/ReportController.php tests/Feature/Api/WeeklyDigestApiTest.php
git commit -m "feat(api): expose read-only weekly digest without changing report contracts"
```

**Rollback:** `git revert <commit>`; the service from Task 4 becomes unused but harmless.

---

## Task 6 — Digest-first Reports page (additive server prop + UI)

**Files:**
- Modify: `app/Http/Controllers/ReportsController.php` (additive `weeklyDigest` prop in `index()`)
- Modify: `resources/js/Pages/Reports/Index.jsx`
- Create: `resources/js/__tests__/weeklyDigestView.test.js`
- Keep unchanged: `resources/js/lib/reportParser.js` and `resources/js/__tests__/reportParser.test.js`

**Interfaces:**
- Consumes: `WeeklyDigestService::forUser()` from Task 4 via a new additive Inertia prop `weeklyDigest` on the existing `/reports` page. The Reports page is Inertia-props-driven (`ReportsIndex({ reports, channels, periodKind, kinds, page, has_more })`), not axios-driven; do not introduce a client fetch.
- Produces: a digest card above the existing paginated report list; the legacy list, filters, "Generate now" and `/reports/view/{id}` links remain functional. The API endpoint from Task 5 remains the CLI/MCP adapter and is unchanged by this task.

- [ ] **Step 1: Write the failing tests** in `resources/js/__tests__/weeklyDigestView.test.js` and `tests/Feature/ReportsUiTest.php`:
  - frontend: assert `Reports/Index.jsx` destructures a `weeklyDigest` prop (no `axios`/`fetch` added);
  - frontend: assert the five section labels appear in order and each renders `provenance`;
  - frontend: assert `Not measured` is rendered through the metric value, not as a number;
  - frontend: assert an empty section renders its `message` and no static advice;
  - feature: assert `GET /reports` still returns all legacy props plus the additive `weeklyDigest` key.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run test:js
php artisan test --filter=ReportsUiTest
```
Expected: FAIL with "Expected Reports page to consume the weeklyDigest prop".

- [ ] **Step 3: Add the prop and render the digest**

In `ReportsController::index()`, compute the digest with `ReportGenerator::periodFor(Report::KIND_WEEKLY, today('Asia/Jakarta'))` and add only a new `'weeklyDigest' => [...]` key to the existing `Inertia::render` payload. In `Reports/Index.jsx`, destructure `weeklyDigest` and render the five sections above the existing list. Do not modify `reportParser.js`, the legacy markdown rendering, or any report route/link. Preserve the existing period-kind filter and "Show older reports" pagination.

- [ ] **Step 4: Run the tests**

```bash
npm run test:js
php artisan test --filter=ReportsUiTest
npm run build
```
Expected: PASS, including `reportParser.test.js` unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/ReportsController.php resources/js/Pages/Reports/Index.jsx resources/js/__tests__/weeklyDigestView.test.js tests/Feature/ReportsUiTest.php
git commit -m "feat(reports): show sourced weekly digest above legacy reports"
```

**Rollback:** `git revert <commit>`; endpoint remains available to CLI/MCP.

---

## Task 7 — Compatibility gate and evidence capture (verification only)

**Files:** none modified; evidence recorded in the task and Zettly Todo.

**Interfaces:** consumes all six prior commits.

- [ ] **Step 1: Run the full local suites**

```bash
php artisan test
npm run test:js
npm run test:cli
```
Expected: all pass, zero new failures. Record counts.

- [ ] **Step 2: MCP protocol discovery and regression (separate repo, read-only)**

```bash
cd /d D:\code\zettly-mcp-server
node --test tests/protocol.test.js
```
Expected: PASS with exactly the 11 tool names listed in `tests/protocol.test.js` (`zettly_api`, `zettly_download_attachment`, `zettly_note_archive`, `zettly_note_create`, `zettly_note_read`, `zettly_note_search`, `zettly_recommend_next_work`, `zettly_record_work_outcome`, `zettly_upload_attachment`, `zettly_work_briefing`) and the three prompts. No MCP source file is changed.

- [ ] **Step 3: Route and schema guard**

```bash
cd D:\code\zettly
php artisan route:list --path=api/v1
git status --short
```
Expected: all pre-existing routes present plus exactly one new route; working tree contains only the planned modified files; no migration file present.

- [ ] **Step 4: Viewport acceptance re-check**

Repeat Task 1 Step 5 at 1280px and 390px on `/dashboard` and `/reports`; record that six primary items render and all moved features remain reachable.

- [ ] **Step 5: Record evidence, no commit**

Do not commit this task. Mark DoD items only with recorded command output.

**Rollback:** not applicable (no changes).

---

## File-level impact matrix

| File | Change | Classification | Compatibility note |
| --- | --- | --- | --- |
| `resources/js/Layouts/AppLayout.jsx` | Split nav arrays, add More/Developer/Admin sections | UI-only | All hrefs and route names unchanged |
| `resources/js/Pages/Dashboard.jsx` | Render four `today` blocks, heading "Today" | UI-only | `<Head title="Dashboard" />` unchanged |
| `resources/js/Pages/Reports/Index.jsx` | Digest card above legacy list | UI-only | `reportParser.js` untouched |
| `app/Http/Controllers/ReportsController.php` | Additive `weeklyDigest` prop | Backward-compatible refactor | Legacy props unchanged |
| `app/Http/Controllers/DashboardController.php` | Additive `today` prop | Backward-compatible refactor | Five legacy props unchanged |
| `app/Services/WeeklyDigestService.php` | New headless service | Backward-compatible refactor | Additive; no writes |
| `app/Http/Controllers/Api/ReportController.php` | Add `weeklyDigest()` | Backward-compatible refactor | No existing method changed |
| `routes/api.php` | One new GET route | Backward-compatible refactor | No existing route changed |
| Test files (5 new, 1 modified) | Add coverage | Backward-compatible refactor | Existing tests kept |
| MCP / CLI / migrations / models | No change | No change | Capabilities preserved |

## Test matrix

| Layer | Command | Covers |
| --- | --- | --- |
| Unit | `php artisan test --filter=WeeklyDigestServiceTest` | Provenance, `Not measured`, undated exclusion, legacy generator guard |
| Feature | `php artisan test --filter=DashboardPayloadTest` | Today props, two foci honesty, legacy prop contract |
| API feature | `php artisan test --filter=WeeklyDigestApiTest` | Five sections, guest/ability 401/403, user isolation, no writes, legacy endpoint |
| Authorization | same API tests + `CliAbilityMiddlewareTest` | `auth:sanctum`, `abilities:zettly:cli`, user scoping |
| Frontend | `npm run test:js` | Nav contract, Today states, digest rendering, existing parser tests |
| Frontend build | `npm run build` | Import/resolution integrity |
| Regression (legacy reports) | `ReportGeneratorTest`, `reportParser.test.js` | Markdown parser and Discord/CLI format contracts |
| CLI compatibility | `npm run test:cli` | All CLI routing/parity tests |
| MCP discovery/regression | `node --test tests/protocol.test.js` in `zettly-mcp-server` | 11 tools + 3 prompts unchanged |
| Browser acceptance | Playwright 1280x800 + 390x844 | Desktop/mobile nav parity and reachable moved features |

## Risk and rollback matrix

| Risk | Likelihood | Impact | Mitigation | Rollback |
| --- | --- | --- | --- | --- |
| Legacy report parser breaks | Low | High | Digest is a separate endpoint; byte-for-byte generator test | Revert Task 4/6 commits |
| Nav hides a moved feature | Medium | Medium | Source test for all legacy hrefs + viewport checks | Revert Task 1 |
| `main_work` inferred from multiple foci | Medium | High | Explicit `main_work = null` in P0; test with two foci | Revert Task 2 |
| Fabricated next actions | Medium | High | Only dated todos and handoff journals; no static text | Revert Task 4 |
| Report/delivery rows created by "read-only" endpoint | Low | High | No-write assertion in API test | Revert Task 5 |
| MCP tool list drift | Low | High | Protocol test in separate repo, no MCP source change | Revert none; investigate external change |
| Migration accidentally added | Low | High | `git status` guard in Task 7; delete before commit | Remove file before commit |
| Another session touches same branch | Medium | Medium | Single-writer lock + dedicated implementation branch | Stop and re-verify identity |

## Definition of Done (P0)

- [ ] Primary navigation has exactly six destinations; all 11 legacy destinations remain reachable via More/Developer/Admin/profile menu.
- [ ] Route names and URLs unchanged; no route removed; exactly one new route exists.
- [ ] Today renders current work, open tasks, recent activity and linked notes from server-provided real data, with honest empty and fallback states.
- [ ] Today performs no new ranking and invents no Main Work.
- [ ] Weekly digest endpoint returns exactly five sections, each with a `provenance`; no static advice text.
- [ ] Metrics without a valid source display the literal `Not measured`; undated completions are not counted as completed work.
- [ ] Legacy report generation, delivery, markdown, `reportParser.js`, Discord and CLI formatters are unchanged.
- [ ] No schema migration, no user data mutation, no CLI command removed, no MCP tool changed.
- [ ] Full PHP/JS/CLI suites and MCP protocol test pass with recorded output.
- [ ] Desktop and mobile viewport checks recorded.
- [ ] Every task committed with Conventional Commits; evidence recorded in DevWorkflow.

## Ready execution prompt (use only after explicit approval)

```text
Implement docs/superpowers/plans/2026-11-17-zettly-p0-work-memory-consolidation.md
task-by-task, starting with Task 1. Use superpowers:executing-plans.

Preflight (must pass before any edit):
- Verify repo identity: D:/code/zettly, origin github.com/programinglive/zettly.git,
  branch main, HEAD 6b18624cee4ca5233b772d466e376a3efaa2f7e7.
- Verify no other session owns the target implementation branch; create and use a
  dedicated feature branch. Never touch feat/agent-approval-api or other worktrees.
- Read docs/superpowers/specs/2026-11-17-zettly-work-memory-consolidation-design.md
  together with this plan. Do not deviate from the recorded Mermaid flow.

Rules: no schema migration, no data mutation, no deployment, no release, no change
to ReportGenerator.php, reportParser.js, CLI source, MCP source, or any existing
route/endpoint contract. TDD per task: write failing test, prove failure, implement,
prove pass, commit. Run the full suites and the MCP protocol test in Task 7.
Record actual command output as evidence; never claim a task is done without it.
Stop and report if any verification gate fails.
```
