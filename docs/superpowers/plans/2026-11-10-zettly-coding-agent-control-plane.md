# Zettly Coding Agent Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the sole authorized owner assign, monitor, review, and approve coding-agent jobs from the Zettly PWA without exposing a shell or bypassing CI/CD.

**Architecture:** Laravel owns the job state and approval record linked to an existing Todo. A future VM worker will poll a narrow, authenticated API; this plan builds and tests that contract using an API client test before any VM is provisioned. React/Inertia presents a phone-friendly control surface over the same persisted state.

**Tech Stack:** Laravel 12, Sanctum, PostgreSQL/SQLite tests, React 18, Inertia 2, Tailwind CSS, PHPUnit, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-10-zettly-mobile-coding-agent-design.md`

## Global Constraints

- Only the configured user ID matching `mahatma.mahardhika@programinglive.com` may use browser controls; `super-admin` alone is insufficient.
- A worker token may claim and report jobs but may not approve a release. It must be a persisted Sanctum token with `coding-agent:worker`, never a first-party transient token.
- An approval is bound to one repository, target environment, and commit SHA; changing any of them invalidates approval.
- Production code and release changes use branches, local tests, Conventional Commits, and existing CI/CD. This plan does not add a direct server mutation or deploy endpoint.
- Zettly Todo and Dev Workflow task IDs remain canonical; job rows are execution records and must not create duplicate Todos.
- Zettly stores concise, redacted events; browser reconnects read persisted state. Offline mutations are outside this plan.
- Keep `coding_agent.enabled` false by default; do not expose job creation in production until a worker pilot passes its own verification.

## Review Focus

- A second super administrator requests an agent page or action: return 403 without exposing job data (Task 1 test).
- A submitted Todo belongs to another user or an organization: reject with 404, preserving owner-only scope (Task 2 test).
- Two workers try to claim the same queued job: one lease succeeds and the other receives no job (Task 3 test).
- A stale event or heartbeat arrives after lease expiry: reject it without changing the newer job state (Task 3 test).
- A review artifact's commit SHA changes after approval: approval is no longer valid for release (Task 4 test).

---

### Task 1: Owner authorization and job records

**Files:**
- Create: `config/coding_agent.php`, `app/Http/Middleware/EnsureCodingAgentOwner.php`, `app/Models/CodingAgentJob.php`
- Create: `database/migrations/2026_11_10_000001_create_coding_agent_jobs_table.php`, `database/factories/CodingAgentJobFactory.php`
- Modify: `bootstrap/app.php`, `.env.example`
- Test: `tests/Feature/CodingAgentOwnerTest.php`, `tests/Feature/CodingAgentJobSchemaTest.php`

**Interfaces:**
- Produces: middleware alias `coding-agent-owner`; `CodingAgentJob` with owner `user_id`, `todo_id`, optional `workflow_task_id`, allowlisted `repository`, `instruction`, `status`, `client_request_id`, lease fields, and nullable review artifact fields. Unique `(user_id, client_request_id)`.
- Configuration: `coding_agent.enabled`, `coding_agent.owner_user_id`, and `coding_agent.owner_email` read from `CODING_AGENT_ENABLED`, `CODING_AGENT_OWNER_USER_ID`, and `CODING_AGENT_OWNER_EMAIL`. No access if disabled or either owner value is missing.

- [ ] Write failing feature tests: matching verified owner passes middleware when enabled; disabled feature returns 404; guest is redirected or 401; another user and another super administrator receive 403; changing the owner's verified email fails closed; schema enforces the idempotency key.
- [ ] Run `php artisan test tests/Feature/CodingAgentOwnerTest.php tests/Feature/CodingAgentJobSchemaTest.php` and confirm the new tests fail for absent middleware/model/schema.
- [ ] Add configuration, middleware, model, migration, factory, and middleware alias. Use a personal Todo foreign key and cascade or restrict behavior consistent with existing Todo lifecycle; never infer owner from a request parameter.
- [ ] Run the same targeted test command and confirm zero failures.
- [ ] Commit only Task 1 files: `feat(agent): add owner guard and job records`.

### Task 2: Browser job creation and control

**Files:**
- Create: `app/Http/Controllers/CodingAgentJobController.php`, `app/Services/CodingAgentJobTransitions.php`
- Modify: `routes/web.php`, `config/coding_agent.php`
- Test: `tests/Feature/CodingAgentJobWebTest.php`, `tests/Unit/CodingAgentJobTransitionsTest.php`

**Interfaces:**
- Consumes: Task 1 owner middleware and `CodingAgentJob`.
- Produces: `POST /agent/jobs`, `POST /agent/jobs/{job}/instructions`, `POST /agent/jobs/{job}/pause`, `POST /agent/jobs/{job}/cancel`. These routes redirect to the Todo or current page with status; Task 5 adds the list and detail pages. `CodingAgentJobTransitions::apply(CodingAgentJob $job, string $action): CodingAgentJob` owns legal state changes.
- Allowlist: `coding_agent.repositories` maps stable repository keys to remote URLs; the browser sends a key, never a shell path or Git URL.

- [ ] Write failing tests named `test_owner_creates_one_job_for_retried_request`, `test_foreign_todo_is_not_found`, `test_unknown_repository_is_rejected`, `test_other_user_cannot_read_or_control_job`, and `test_terminal_job_rejects_new_instruction`. Assert exact HTTP status, one row per idempotency key, and no state mutation on denial.
- [ ] Run `php artisan test tests/Feature/CodingAgentJobWebTest.php tests/Unit/CodingAgentJobTransitionsTest.php` and confirm the expected failures.
- [ ] Implement validation and state transitions: `queued → running/paused/cancelled`, `running → needs_input/review/paused/failed`, and `needs_input/paused → queued/cancelled`; reject other transitions. Restrict Todo lookup to personal Todos owned by the current user. Save instructions as bounded job events, with no command field.
- [ ] Run the targeted tests and `php artisan route:list --path=agent`; confirm zero failures and only guarded routes.
- [ ] Commit Task 2 files: `feat(agent): add owner job controls`.

### Task 3: Worker polling, leases, and redacted events

**Files:**
- Create: `app/Http/Middleware/EnsureCodingAgentWorker.php`, `app/Http/Controllers/Api/CodingAgentWorkerController.php`, `app/Models/CodingAgentJobEvent.php`
- Create: `database/migrations/2026_11_10_000002_create_coding_agent_job_events_table.php`
- Modify: `bootstrap/app.php`, `routes/api.php`, `app/Services/CodingAgentJobTransitions.php`
- Test: `tests/Feature/Api/CodingAgentWorkerTest.php`

**Interfaces:**
- Consumes: Task 1 job model and Task 2 transitions.
- Produces: `POST /api/v1/coding-agent/claim`, `POST /api/v1/coding-agent/jobs/{job}/heartbeat`, `POST /api/v1/coding-agent/jobs/{job}/events`, `POST /api/v1/coding-agent/jobs/{job}/result`. Controller methods are `claim(Request $request): JsonResponse`, `heartbeat(Request $request, CodingAgentJob $job): JsonResponse`, `event(Request $request, CodingAgentJob $job): JsonResponse`, and `result(Request $request, CodingAgentJob $job): JsonResponse`. Claim returns job ID, repository key, instruction, lease token, and lease expiry. Event writes use a unique `(job_id, event_key)` and redact through `AgentSessionIngestor::redact` before persistence.
- Auth: `EnsureCodingAgentWorker` requires `PersonalAccessToken`, owner user ID, and `coding-agent:worker` ability; browser session and generic `zettly:cli` token receive 403.

- [ ] Write failing SQLite feature tests for worker auth, sequential duplicate claim, duplicate `event_key`, expired or wrong lease token, bounded redacted event detail, and lease reclaim after expiry. Add a PostgreSQL integration test using two connections for competing claims; SQLite's locking model cannot prove that race. Assert no duplicate execution claim and no secret substring stored.
- [ ] Run `php artisan test tests/Feature/Api/CodingAgentWorkerTest.php` and confirm failures.
- [ ] Implement worker middleware, transactional claim with row lock and lease expiry, heartbeat renewal, idempotent event append, and result state. Store only a hash of each lease token. Keep worker API outbound-poll friendly; it cannot approve or release.
- [ ] Run the targeted SQLite tests and the existing `tests/Feature/Api/AgentApiTest.php` regression suite; confirm zero failures. Run the competing-claim test against a disposable PostgreSQL database and confirm exactly one claim succeeds.
- [ ] Commit Task 3 files: `feat(agent): add leased worker API`.

### Task 4: Review artifacts and exact-commit approval

**Files:**
- Create: `app/Models/CodingAgentApproval.php`, `app/Http/Controllers/CodingAgentApprovalController.php`
- Create: `database/migrations/2026_11_10_000003_create_coding_agent_approvals_table.php`
- Modify: `routes/web.php`, `app/Models/CodingAgentJob.php`, `app/Http/Controllers/Api/CodingAgentWorkerController.php`
- Test: `tests/Feature/CodingAgentApprovalTest.php`

**Interfaces:**
- Consumes: Task 3 result with branch, commit SHA, PR URL, test summary, and target environment.
- Produces: `POST /agent/jobs/{job}/approve-release` handled by `CodingAgentApprovalController::store(Request $request, CodingAgentJob $job): RedirectResponse`, an approval row keyed to `(job_id, repository, target_environment, commit_sha)` and an `approved_by` owner ID. It records `release_pending`; a later repository-specific CI adapter consumes approval. This plan does not start a pipeline.

- [ ] Write failing tests `test_owner_approves_exact_reviewed_sha_once`, `test_changed_sha_invalidates_approval`, `test_worker_token_cannot_approve`, `test_non_owner_cannot_approve`, and `test_failed_tests_block_approval`. Assert 403/409 where applicable and no release action.
- [ ] Run `php artisan test tests/Feature/CodingAgentApprovalTest.php` and confirm failures.
- [ ] Implement approval validation, unique storage, exact-SHA invalidation, and concise audit event. Require the job to be in `review` with passing test evidence and a valid 40- or 64-character Git SHA.
- [ ] Run the targeted tests; confirm zero failures and that no endpoint launches a release.
- [ ] Commit Task 4 files: `feat(agent): record exact-commit release approval`.

### Task 5: Phone-friendly Zettly workspace

**Files:**
- Create: `resources/js/Pages/Agent/Index.jsx`, `resources/js/Pages/Agent/Show.jsx`, `resources/js/Pages/Agent/jobView.js`, `resources/js/Pages/Agent/jobView.test.js`
- Modify: `resources/js/Layouts/AppLayout.jsx`, `app/Http/Controllers/CodingAgentJobController.php`, `app/Http/Middleware/HandleInertiaRequests.php`
- Test: `tests/Feature/CodingAgentPagesTest.php`, `resources/js/Pages/Agent/jobView.test.js`

**Interfaces:**
- Consumes: Tasks 2–4 web routes and persisted job/event/approval records.
- Produces: `GET /agent/jobs` and `GET /agent/jobs/{job}` Inertia pages plus owner-only Agent navigation. Views show status, age of last heartbeat, latest events, instructions, cancel/pause, review summary, and approval bound to displayed SHA. `jobView.js` formats status and derives whether approval is enabled; it never authorizes a request.

- [ ] Write failing PHP tests for owner page props, non-owner 403, disabled feature 404, bounded event pagination, and absence of secrets in page props. Write Node tests for status labels, stale heartbeat, approval disabled when SHA or test evidence changes, and retention of `client_request_id` during form retries.
- [ ] Run `php artisan test tests/Feature/CodingAgentPagesTest.php` and `node --test resources/js/Pages/Agent/jobView.test.js`; confirm failures.
- [ ] Implement responsive Inertia pages, compact cards and review actions. Add the sidebar link only when a server-computed `canUseCodingAgent` prop is true; keep server guards on every route. Generate one `client_request_id` with `crypto.randomUUID()` per form submission and keep it during retries. Read persisted state on reload and show a reconnect indication after network loss.
- [ ] Run the targeted tests, `npm run test:js`, `php artisan test`, and `npm run build`; confirm zero failures and a successful production asset build. On a phone-sized browser, verify creation, reconnect, review, and release approval display against an inert worker test fixture.
- [ ] Commit Task 5 files plus README/API documentation of the new UI and worker contract: `feat(agent): add mobile coding workspace`.

## Final integration gate

- [ ] Re-read the spec and verify every owner-only route, worker route, event, approval, and mobile state against it.
- [ ] Run `git diff --check`, the PHP and JS test suites, and the asset build on the implementation branch; record exact results.
- [ ] Review the full branch diff for authorization gaps, token leakage, duplicate Todos, release bypasses, and undocumented schema changes.
- [ ] Open a pull request for the Zettly control plane; keep the VM provisioning and repository-specific release adapters in separate follow-up plans.
