# Consolidate Factory into Zettly Implementation Plan

> **For agentic workers:** REQUIRED: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task using strict TDD.

**Goal:** Consolidate Factory's Project Registry metadata, Pipeline Board filters, 14-day Engineering Recap, Live Worker/Session health, and Todo-to-Coding-Agent DoD prefill directly into Zettly (`/agent/jobs`, `/agent/setup`, `/todos/{todo}`).

**Architecture:** Extend `config/coding_agent.php` and `CodingAgentJobController` / `CodingAgentSetupController` / `CodingAgentPromptController` with normalized repository metadata (`slug`, `name`, `remote`, `base`, `stack`, `checks`), enriched Todo context (`description`, `checklist_items`, `tags`), active `AgentSession` telemetry, and 14-day `Asia/Jakarta` recap metrics. Update `Pages/Agent/Index.jsx`, `Pages/Agent/Setup.jsx`, `Pages/Agent/jobView.js`, and `Pages/Todos/Show.jsx`.

**Tech Stack:** Laravel 12 (PHP 8.3), Inertia.js, React 18, Tailwind CSS, PHPUnit, Node.js test runner (`node --test`).

---

### Task 1: Normalized Repository Registry & Setup View

**Files:**
- Modify: `config/coding_agent.php`
- Create: `app/Support/CodingAgentRepositoryRegistry.php`
- Modify: `app/Http/Controllers/CodingAgentSetupController.php`
- Modify: `resources/js/Pages/Agent/Setup.jsx`
- Modify: `tests/Feature/CodingAgentSetupTest.php`

### Task 2: Enriched Todo Spec/DoD Context, 14-Day Recap & Live Sessions in `CodingAgentJobController` and `CodingAgentPromptController`

**Files:**
- Modify: `app/Http/Controllers/CodingAgentJobController.php`
- Modify: `app/Http/Controllers/CodingAgentPromptController.php`
- Modify: `tests/Feature/CodingAgentPagesTest.php`
- Modify: `tests/Feature/CodingAgentPromptTest.php`

### Task 3: Frontend Pipeline Helpers, Todo Spec Formatter & Unit Tests (`jobView.js`)

**Files:**
- Modify: `resources/js/Pages/Agent/jobView.js`
- Modify: `resources/js/Pages/Agent/jobView.test.js`

### Task 4: Unified Engineering Hub UI (`Pages/Agent/Index.jsx`) & Todo One-Click Dispatch (`Pages/Todos/Show.jsx`)

**Files:**
- Modify: `resources/js/Pages/Agent/Index.jsx`
- Modify: `resources/js/Pages/Todos/Show.jsx`

### Task 5: Full Verification & Factory Backlog Reconciliation

**Files:**
- Run `php artisan test --filter=CodingAgent` and `npm run test:js`
- Reconcile remaining Factory backlog items into Zettly Todos
