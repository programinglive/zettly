# Zettly Release Notes

Centralized history of notable changes, fixes, and enhancements to the Zettly platform. Pair this with the GitHub releases page for the latest tags and download artifacts.

## v0.9.5 · 2025-11-06

### 🧪 Quality

- **Email test console (super-admin only)** — Added `/test/email` Inertia page with backend controller, mailable, and Blade template so administrators can verify outbound email configuration safely.

### 🛡️ Security

- **Fetch CSRF hardening** — Updated Kanban and Eisenhower reorder requests plus attachment deletion to always send credentials, Accept headers, and CSRF tokens, preventing 419 responses.

## v0.9.2 · 2025-11-06

### ✨ Features

- **Focus history filtering** — Added a date picker to the Recent Focus History card that defaults to today, with matching backend support so you can review completions for any day without leaving the dashboard.

## v0.9.1 · 2025-11-05

### 🐛 Bug Fixes

- **Focus history wrapping** — Added defensive `break-all` styling so long URLs and reasons stay within the dashboard card across light and dark themes.

## v0.9.0 · 2025-11-05

### 🐛 Bug Fixes

- **Kanban drag ordering** — Ensured dragging cards downward inserts them after the intended target so optimistic updates match the persisted order.

## v0.8.20 · 2025-11-05

### 🐛 Bug Fixes

- **Eisenhower matrix reorder** — Returned JSON responses for quadrant moves to eliminate the "plain JSON response" redirect error during drag-and-drop.

## v0.8.19 · 2025-11-05

### ℹ️ Notes

- No user-facing changes were recorded for this maintenance release.

## v0.8.18 · 2025-11-05

### 🐛 Bug Fixes

- **Kanban board reorder** — Synced local todo ordering immediately after drag events so the UI reflects the updated sequence without waiting for a reload.

## v0.8.17 · 2025-11-05

### 🐛 Bug Fixes

- **Kanban cross-column moves** — Propagated column metadata changes when cards travel between lists to keep status and column attributes in sync.

## v0.8.16 · 2025-11-05

### 🐛 Bug Fixes

- **Kanban reorder requests** — Swapped to the Fetch API for drag submissions, matching Eisenhower handling and preventing Inertia response parsing errors.

## v0.8.15 · 2025-11-05

### 🐛 Bug Fixes

- **Dark theme toggle** — Restored the appearance toggle in dark mode and added reorder debug logging for production diagnostics.

## v0.8.14 · 2025-11-05

### 🐛 Bug Fixes

- **Kanban error recovery** — Reverted todo ordering to the pre-drag snapshot whenever the reorder request fails so boards never stay in an invalid state.

## v0.8.13 · 2025-11-05

### 🐛 Bug Fixes

- **Kanban success handling** — Removed the assumption that reorder responses return Inertia page props, avoiding silent failures after successful drags.

## v0.8.12 · 2025-11-05

### 🐛 Bug Fixes

- **Kanban reorder endpoint** — Returned JSON instead of redirects so Inertia keeps the optimistic UI state applied by the drag-and-drop operation.

## v0.8.11 · 2025-11-05

### 🐛 Bug Fixes

- **Eisenhower drag CSRF** — Relied on Inertia's shared middleware for tokens when moving todos between quadrants, fixing the 419 error regression.

## v0.8.10 · 2025-11-05

### 🐛 Bug Fixes

- **Kanban & Eisenhower reordering** — Switched Eisenhower matrix reorder calls to use `fetch` with JSON/CSRF headers, matching the Kanban board. This prevents Inertia from expecting a full page response and eliminates the "plain JSON response" error in production when dragging todos across quadrants.

## v0.8.9 · 2025-11-04

### ✨ Features

- **Focus demo data** — Added `FocusSeeder` so every seeded user starts with an active focus and recent completion history, complete with status events for the dashboard timeline.
- **Drawing gallery demo data** — Added `DrawSeeder` to provision workspace sketches, mind maps, and dashboard wireframes that showcase the TLDraw workspace out of the box.

### 🐛 Bug Fixes

- **Kanban ordering** — Guard all kanban `orderBy` clauses and reorder paths when the `kanban_order` column is unavailable, preventing SQL errors in legacy databases.

### ✅ Tests

- `php artisan test --filter=FocusTest`
- `php artisan test --filter=DrawTest`

## v0.7.6 · 2025-11-03

### 🛠️ Bug Fixes

- **Context Panel Tag Order** — Moved tag chips beneath created metadata within the context drawer so tablet users see tags next to other timeline details.
- **Todo Detail Tag Placement** — Ensured tags render directly under created/updated metadata on todo and note detail views.
- **Due Date Inputs** — Normalized ISO timestamps to the `yyyy-MM-dd` format before populating `<input type="date">` fields to stop console warnings and preserve selection state.
- **Editor Toolbar Layering** — Lowered the Zettly editor toolbar stacking context so the navbar remains in front while keeping the editor layout intact.

### ✅ Tests

- Re-ran `npm test -- dashboardWorkspace.test.js` to cover dashboard/todo regressions.

## v0.7.5 · 2025-11-03

### 🛠️ Bug Fixes

- **Reason Dialog Hydration** — Added hydration guards and Inertia `transform()` usage across dashboard, todo detail, Eisenhower Matrix, and Kanban views to ensure archive/restore/toggle dialogs respect the first submitted reason and surface validation errors consistently.
- **Archive Reason Dialog (Dashboard & Detail View)** — Reintroduced archive/restore reason prompts with consistent UX and ensured CSRF tokens are appended automatically.

### 📚 Documentation

- Added dedicated community guidelines (Code of Conduct, Contributing, Security policy) and refreshed README badges plus contact details for maintainers.
- Documented the hydration fix workflow in `docs/reference/REASON_DIALOG_HYDRATION.md`.

## v0.7.4 · 2025-11-02

### 🐞 Bug Fix Highlights

- **Debug Mode Toggle Missing** — Fixed a template-literal typo that hid the toggle for super admins and added regression tests. (@resources/js/Pages/Profile/Edit.jsx, @tests/js/DebugModeToggle.test.js)
- **Draw Gallery Runtime Error** — Replaced stale TLDraw handlers to avoid `TypeError: h is not a function` when returning to `/draw`. (@resources/js/Pages/Draw/Index.jsx, @tests/js/Draw.test.js)
- **Note Edit 419 Errors** — Ensured CSRF tokens are included when saving notes via Inertia. (@resources/js/Pages/Todos/Edit.jsx, @resources/js/__tests__/todoEditCsrf.test.js)
- **Login 419 Errors** — Mirrored token fix for the login form. (@resources/js/Pages/Auth/Login.jsx, @resources/js/__tests__/loginCsrf.test.js)
- **Drawing Editor Infinite Loop** — Reduced hook dependencies to stop runaway renders and covered with tests. (@resources/js/Pages/Draw/Index.jsx, @resources/js/__tests__/DrawInfiniteLoopTest.test.js)
- **Passive Event Listener Warnings** — Centralized TLDraw event configuration to suppress console noise and allow `preventDefault`. (@resources/js/Pages/Draw/Index.jsx, @resources/js/__tests__/DrawPassiveEventFixTest.test.js)
- **Drawing Gallery Thumbnails** — Generated PNG previews on autosave and surfaced them throughout the UI plus tests. (Multiple files including `DrawingController`, `DrawingUpdated` event, migration, and @tests/js/Draw.test.js)

### 🧪 Regression Coverage

- Expanded JS test suite to guard all fixes above, including TLDraw autosave behavior and debug toggle rendering.

## v0.0.1 · 2025-10-15

Initial public release delivering the full-stack foundation:

- User authentication via Laravel Fortify
- Todo and note management with tagging, linking, and priority support
- Responsive dashboard with Eisenhower Matrix and Kanban workspaces
- TLDraw-powered sketching workspace with autosave and real-time sync
- Built on Laravel 12, React 19, Inertia.js, TailwindCSS, and Vite

See the [README Quick Start](../../README.md#quick-start) for setup instructions and seeded demo credentials.
