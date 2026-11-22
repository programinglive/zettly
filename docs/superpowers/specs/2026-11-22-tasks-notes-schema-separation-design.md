# Architectural Design Spec: Rename `todos` → `tasks` and Physically Separate `notes`

- **Date:** 2026-11-22
- **Status:** Approved by Owner (Scheduled for Saturday 2026-11-28 ProgramingLive Sprint)
- **Repository:** `programinglive/zettly`
- **Owner:** Single-tenant owner (`mahar`)

## 1. Problem Statement & Intent

1. **Terminology mismatch:** The UI navigation and user mental model use **Tasks** and **Notes**, while the underlying database table, model, and primary routes are named `todos` (`App\Models\Todo`, `/todos`), which feels ambiguous and inconsistent.
2. **Overloaded single table (`todos` with `type = 'todo' | 'note'`):** Storing permanent Zettelkasten knowledge notes inside the `todos` table mixes actionable execution columns (`is_completed`, `priority`, `importance`, `due_date`, `kanban_order`, `completed_at`, `focus_id`) with long-form knowledge records where those columns are permanently `NULL`.

## 2. Target Domain & Database Architecture

### 2.1 `tasks` Table (Renamed from `todos`)
- Rename `todos` → `tasks` and drop the overloaded `type` column after migrating `type = 'note'` rows out.
- Rename child & pivot tables for clean 1:1 alignment:
  - `todo_tag` → `task_tag` (`task_id`, `tag_id`)
  - `todo_checklist_items` → `task_checklist_items` (`task_id`, ...)
  - `todo_attachments` → `task_attachments` (`task_id`, ...)
  - `todo_status_events` → `task_status_events` (`task_id`, ...)
  - `todo_relations` (or `related_todos` pivot) → `task_links` (`task_id`, `related_task_id`)
- Model: `App\Models\Task` (with `App\Models\Todo` kept temporarily as a thin deprecated subclass or removed once all internal references & tests migrate cleanly).

### 2.2 Dedicated `notes` Table (Physically Separated)
- New `notes` table:
  - `id` (preserve original IDs during migration where possible, or map deterministically and update sequences!)
  - `user_id`, `organization_id` (nullable), `title`, `description`, `archived`, `archived_at`, `created_at`, `updated_at`, `deleted_at`
- Dedicated child & pivot tables:
  - `note_tag` (`note_id`, `tag_id`)
  - `note_attachments` (`note_id`, ...)
  - `note_links` (`note_id`, `linkable_type`, `linkable_id`) — polymorphic Zettelkasten links allowing Notes to link seamlessly to both other Notes and Tasks!
- Model: `App\Models\Note` + `App\Http\Controllers\NoteController` + `App\Http\Controllers\Api\NoteController`.

## 3. Routing & Zero-Break Integration Strategy

| Layer | Canonical Target | Backward-Compatibility Bridge |
|---|---|---|
| Web UI | `/tasks`, `/tasks/{task}`, `/notes`, `/notes/{note}` | `GET /todos` → `301` redirect to `/tasks`; `GET /todos/{id}` → redirect to `/tasks/{id}` or `/notes/{id}` |
| REST API | `/api/v1/tasks`, `/api/v1/notes` | Keep `/api/v1/todos` as a thin controller alias to `Task` until `dev-workflow` MCP & Zettly CLI finish rolling over to `/api/v1/tasks` |
| Graph & Search | `GraphSyncService` indexes both `Task` and `Note` nodes with distinct node types (`task`, `note`) | Preserves all existing Zettelkasten graph edges |
| Classifier | `ProjectClassifierService` accepts `Task\|Note` | Enforces canonical `proyek:*`, explicit `tipe:*`, and explicit `area:*` on both models |

## 4. Safe 3-Phase Execution Plan (Saturday 2026-11-28)

1. **Phase 0 — Mandatory Verified Full Backup:**
   - Run `pg_dump` of `prod_zettly`, verify `gzip -t` + `PostgreSQL database dump complete` + `sha256sum`, and upload to `gs://bw-server-backups-377312/server_backups_v2/pre-repair/`.
2. **Phase 1 — Additive Migration & Data Copy:**
   - Create `notes`, `note_tag`, `note_attachments`, `note_links`.
   - Copy all `todos` rows where `type = 'note'` (24 rows) along with their tags, attachments, and links into `notes` & child tables; verify exact row counts (`24 === 24`).
   - Rename `todos` → `tasks` (and child tables), delete migrated note rows from `tasks`, drop `type` column.
3. **Phase 2 — Application Code, Tests & MCP/CLI Alignment:**
   - Introduce `App\Models\Task`, `App\Models\Note`, `TaskController`, `NoteController`.
   - Update Inertia pages (`Pages/Tasks/*`, `Pages/Notes/*`), `ProjectClassifierService`, `WorkspaceSummaryService`, `PriorityEngine`, and `GraphSyncService`.
   - Run full PHPUnit + JS + CLI test suites; release and deploy via `webhook-deploy-launcher`.
   - Follow up in `dev-workflow` MCP to point to `/api/v1/tasks` and `/api/v1/notes`, then retire the `/api/v1/todos` alias in a subsequent release.

## 5. Reversibility & Rollback
- **Reversibility:** `CONDITIONALLY_REVERSIBLE` (requires verified pre-migration `pg_dump` restore if rolling back across the table rename).
- **Zero Data Loss Guarantee:** Migration runs inside a PostgreSQL transaction after verified off-host GCS backup and row-count assertions.
