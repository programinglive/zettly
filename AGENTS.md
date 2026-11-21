# ZETTLY — AI AGENT & DEVWORKFLOW V2.0 ENGINEERING INSTRUCTIONS

## 1. Purpose & Core Philosophy
> "Every change should leave the codebase easier to understand, safer to modify, and more reliable than before."

All AI coding agents (Antigravity, OpenCode, Codex, Claude Code, Gemini CLI) working on Zettly MUST follow the **Engineering Loop**:
`DISCOVER → AUDIT → UNDERSTAND → PROTECT → IMPROVE → TEST → VERIFY → ENFORCE → LEARN`

---

## 2. Canonical Engineering Standards Registry
Zettly enforces version-controlled standards in `engineering/`:
- `engineering/standards/architecture.yaml` (`ZET-ARCH-001`, `ZET-ARCH-002`) — Deep modules, information hiding, code-enforced role/release boundaries (Ousterhout & Pragmatic Programmer).
- `engineering/standards/code-quality.yaml` (`ZET-CODE-001`, `ZET-CODE-002`) — DRY, no debug leftovers (`dd`/`var_dump`), no conflict markers (Pragmatic Programmer, Fowler, Beck).
- `engineering/standards/security.yaml` (`ZET-SEC-001`, `ZET-SEC-002`) — Zero embedded credentials, no unsafe shell/deserialization.
- `engineering/standards/testing.yaml` (`ZET-TEST-001`) — Characterization & regression protection before risky changes (Feathers).
- `engineering/standards/api-contracts.yaml` (`ZET-API-001`) — Design by Contract & backward-compatible responses.
- `engineering/standards/database.yaml` (`ZET-DB-001`) — Additive N-1 compatible migrations; destructive schema changes blocked without verified GCS backup (`sha256`) and human approval.
- `engineering/standards/documentation.yaml` (`ZET-DOC-001`) — Living documentation synchronized with code.
- `engineering/standards/release.yaml` (`ZET-REL-001`) — 8-Dimension PR Reversibility & 15-Condition Autonomous Release Gate.
- `engineering/exceptions/approved-exceptions.yaml` — Explicit, time-bounded rule exceptions.
- `engineering/policies/enforcement.yaml` — Baseline-aware quality gates and Autofix classes (`AF-0`..`AF-3`).

---

## 3. Mandatory AI Agent Workflow

### Before Coding
1. Register the task in `dev-workflow` (`start_task` → `create_feature_flow` → `refine_with_ai`) and verify active Focus & Pareto Priority Queue (`/priority`).
2. Run `audit_standards` and `repo_overview` / `helper_change_impact` to understand affected modules, dependencies, and existing tests.

### During Coding
1. Follow established architecture (`App\Domain`, `App\Services`, `App\Support`).
2. Preserve public contracts and N-1 database schema compatibility.
3. Never modify protected governance or release-safety files (`engineering/policies/`, `app/Services/ReleaseSafety/`, `.github/workflows/`, `.env`) autonomously.

### After Coding
1. Run `audit_changes` or `audit_code` against modified files.
2. Execute automated test suites:
   - PHPUnit: `php artisan test`
   - Python Worker: `python -m unittest discover -s agent_worker -p "test_*.py"`
   - Frontend / CLI JS: `npm test`
3. Evaluate `ci_quality_gate` and `release_readiness` before committing or requesting release.
