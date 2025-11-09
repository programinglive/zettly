# Zettly Release Notes

Centralized history of notable changes, fixes, and enhancements to the Zettly platform. Pair this with the GitHub releases page for the latest tags and download artifacts.

## Unreleased

- _No changes yet._

## Recent Releases (Compact Summary)

### v0.10.x

- **v0.10.17** (2025-11-09) — Patch maintenance after database resiliency hardening. [Full notes](releases/v0.10.x.md#v01017--2025-11-09)
- **v0.10.16** (2025-11-09) — Database resiliency with PDO timeouts and cache fallbacks. [Full notes](releases/v0.10.x.md#v01016--2025-11-09)
- **v0.10.15** (2025-11-09) — Profile workspace preference CSRF token refresh. [Full notes](releases/v0.10.x.md#v01015--2025-11-09)

## v0.10.14 · 2025-11-08

### ✨ Features

- **Drawing notifications** — Added create/update/delete mailers so drawing collaborators receive email updates, mirroring the todo workflow. (@app/Http/Controllers/DrawingController.php, @app/Mail/DrawingCreated.php, @app/Mail/DrawingUpdated.php, @app/Mail/DrawingDeleted.php, @resources/views/emails/drawings/*.blade.php, @tests/Feature/DrawTest.php)

## v0.10.13 · 2025-11-08

### ✨ UI Polish

- **Dashboard verification reminder** — Returning users with unverified email addresses now see an inline banner on the dashboard with a quick resend action so they can complete verification without leaving their workspace.

### 🐛 Bug Fixes

- **Drawing broadcasts respect Pusher limits** — Trim oversized TLDraw payloads from `DrawingUpdated` events when the serialized message would exceed the 10KB Pusher cap, preventing `BroadcastException` errors captured as TODOAPP-26. (@app/Events/DrawingUpdated.php, @tests/Unit/Events/DocumentBroadcastPayloadTest.php)
- **Outgoing emails are queued** — Email verification and password reset notifications now implement `ShouldQueue`, ensuring mail dispatch happens asynchronously and is covered by updated registration feature tests. (@app/Notifications/QueuedVerifyEmail.php, @app/Notifications/QueuedResetPassword.php, @app/Models/User.php, @tests/Feature/Auth/RegistrationTest.php)
- **Todo creation email** — Automatically queues a `TodoCreated` notification whenever a user creates a new todo, complete with Markdown template and feature test coverage. (@app/Http/Controllers/TodoController.php, @app/Mail/TodoCreated.php, @resources/views/emails/todos/created.blade.php, @tests/Feature/TodoTest.php)
- **Todo update email** — Queues a `TodoUpdated` notification whenever a todo is updated so owners are alerted to changes. (@app/Http/Controllers/TodoController.php, @app/Mail/TodoUpdated.php, @resources/views/emails/todos/updated.blade.php, @tests/Feature/TodoTest.php)
- **Todo deletion email** — Notifies owners when a todo is removed, with soft-delete recovery guidance. (@app/Http/Controllers/TodoController.php, @app/Mail/TodoDeleted.php, @resources/views/emails/todos/deleted.blade.php, @tests/Feature/TodoTest.php)
- **Note notifications** — Mirrored create/update/delete mailers for notes so personal knowledge entries trigger the same queued emails as todos. (@app/Http/Controllers/TodoController.php, @app/Mail/NoteCreated.php, @app/Mail/NoteUpdated.php, @app/Mail/NoteDeleted.php, @resources/views/emails/notes/*.blade.php, @tests/Feature/TodoTest.php)
- **Drawing notifications** — Added create/update/delete mailers for drawings to keep creatives informed when sketches change or are removed. (@app/Http/Controllers/DrawingController.php, @app/Mail/DrawingCreated.php, @app/Mail/DrawingUpdated.php, @app/Mail/DrawingDeleted.php, @resources/views/emails/drawings/*.blade.php, @tests/Feature/DrawTest.php)
- **Welcome email & verification** — New registrations queue both the `QueuedVerifyEmail` notification and a `UserWelcome` mailable through a single listener so every account immediately receives the verification link plus onboarding guidance. (@app/Listeners/SendWelcomeEmail.php, @app/Mail/UserWelcome.php, @resources/views/emails/users/welcome.blade.php, @app/Providers/EventServiceProvider.php, @tests/Feature/Auth/RegistrationTest.php)

## v0.10.12 · 2025-11-08

### 🐛 Bug Fixes

- **Todo deletion CSRF** — Ensured delete requests include a valid token when removing todos so the action no longer fails with a 419. (@resources/js/Components/TodoList.vue, @resources/js/__tests__/todoDeleteCsrf.test.js)

## v0.10.11 · 2025-11-08

### 🐛 Bug Fixes

- **Post-logout CSRF refresh** — Automatically fetch a fresh token from the cookie after logging out to keep subsequent authenticated actions from failing with 419. (@resources/js/bootstrap.js, @resources/js/__tests__/authLogoutCsrf.test.js)

## v0.10.10 · 2025-11-08

### 🐛 Bug Fixes

- **Duplicate verification emails** — Prevent the signup flow from sending multiple verification messages, ensuring users receive exactly one confirmation email. (@app/Notifications/QueuedVerifyEmail.php, @tests/Feature/Auth/RegistrationTest.php)

## v0.10.9 · 2025-11-08

### ✨ Features

- **Welcome email automation** — Queue a welcome message for new users and restrict the log viewer to super admins so onboarding stays informative without exposing debug tooling broadly. (@app/Listeners/SendWelcomeEmail.php, @resources/js/Pages/Admin/SystemMonitor.jsx)

### 🧹 Chores

- **Auth branding polish** — Swapped the authentication logo and tightened resend verification CSRF handling for a cleaner first impression. (@resources/js/Layouts/GuestLayout.jsx, @resources/js/__tests__/authResendVerification.test.js)

## v0.10.8 · 2025-11-08

### 🐛 Bug Fixes

- **Password reset & drawing payloads** — Queued password reset notifications and trimmed oversized drawing metadata so transactional emails send reliably and broadcasts stay within limits. (@app/Notifications/QueuedResetPassword.php, @app/Events/DrawingUpdated.php)

## v0.10.7 · 2025-11-08

### ✨ Features

- **Todo update emails** — Notify assignees when todos change while cleaning up organization test fixtures for faster runs. (@app/Http/Controllers/TodoController.php, @tests/Feature/OrganizationTest.php)

## v0.10.6 · 2025-11-08

### ✨ Features

- **Todo creation emails** — Queue notifications on create and quiet noisy broadcast logs so inboxes and log streams stay actionable. (@app/Mail/TodoCreated.php, @app/Providers/EventServiceProvider.php)

## v0.10.5 · 2025-11-08

### 🐛 Bug Fixes

- **Broadcast + email safeguards** — Enforced payload limits and ensured notifications queue properly across todo workflows. (@app/Events/DrawingUpdated.php, @app/Mail/TodoUpdated.php)

## v0.10.4 · 2025-11-07

### 🐛 Bug Fixes

- **SMTP configuration hardening** — Normalized mail settings and locked down the email test endpoint for safer diagnostics. (@config/mail.php, @app/Http/Controllers/EmailTestController.php)

## v0.10.3 · 2025-11-07

### 🐛 Bug Fixes

- **Organization invite CSRF** — Ensured the invite form always sends a valid token, preventing 419s when adding teammates. (@resources/js/Pages/Organizations/Show.jsx, @resources/js/__tests__/organizationInviteCsrf.test.js)

## v0.10.2 · 2025-11-07

### 🐛 Bug Fixes

- **Case-sensitive imports** — Corrected Organization component paths so builds succeed on case-sensitive filesystems. (@resources/js/Pages/Organizations/*)

## v0.10.1 · 2025-11-07

### 🐛 Bug Fixes

- **Shadcn replacement** — Swapped Organization pages back to the project’s component library to restore consistent styling and behavior. (@resources/js/Pages/Organizations/*.jsx)

## v0.10.0 · 2025-11-07

### ✨ Features

- **Organization management** — Introduced full CRUD, member roles, and invite flows for organizations, expanding collaboration across the app. (@app/Http/Controllers/OrganizationController.php, @resources/js/Pages/Organizations/*.jsx, @tests/Feature/OrganizationTest.php)

## v0.9.7 · 2025-11-06

### ✨ UI Polish

- **Focus dialog input sizing** — Expanded the Focus Title field to span the modal width and added internal padding for better readability in both light and dark themes.

## v0.9.6 · 2025-11-06

### 🧪 Quality

- **Email test console (super-admin only)** — Added `/test/email` Inertia page with backend controller, mailable, and Blade template so administrators can verify outbound email configuration safely.

### 🛡️ Security

- **Fetch CSRF hardening** — Updated Kanban and Eisenhower reorder requests plus attachment deletion to always send credentials, Accept headers, and CSRF tokens, preventing 419 responses.

## v0.9.5 · 2025-11-06

### ℹ️ Notes

- Internal maintenance release with no user-facing changes.

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

- **Eisenhower reorder** — Returned JSON responses for quadrant moves to eliminate the "plain JSON response" redirect error during drag-and-drop.

### 🧪 Regression Coverage

- Updated Eisenhower reorder integration test to assert JSON status and payload.

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

- **Kanban reorder error handling** — Saved original state before optimistic updates so drag failures revert the board properly.

## v0.8.13 · 2025-11-05

### 🐛 Bug Fixes

- **Kanban reorder persistence** — Aligned frontend success handling with JSON responses to keep optimistic updates without stale refresh attempts.

## v0.8.12 · 2025-11-05

### 🐛 Bug Fixes

- **Kanban/Eisenhower reorder response** — Returned JSON from the reorder endpoint to stop redirect-induced reloads that undid board state.

## v0.8.11 · 2025-11-05

### 🐛 Bug Fixes

- **Eisenhower CSRF** — Removed manual token injection so the matrix relies on Inertia's global CSRF middleware, eliminating 419 errors.

## v0.8.10 · 2025-11-05

### 🧪 Regression Coverage

- Added keyboard navigation smoke tests for the Eisenhower matrix when dragging items via keyboard shortcuts.

## v0.8.9 · 2025-11-04

### ✨ Features

- **Focus demo data** — Added `FocusSeeder` so every seeded user starts with an active focus and recent completion history, complete with status events for the dashboard timeline.
- **Drawing gallery demo data** — Added `DrawSeeder` to provision workspace sketches, mind maps, and dashboard wireframes that showcase the TLDraw workspace out of the box.

### 🐛 Bug Fixes

- **Kanban ordering** — Guard all kanban `orderBy` clauses and reorder paths when the `kanban_order` column is unavailable, preventing SQL errors in legacy databases.

### ✅ Tests

- `php artisan test --filter=FocusTest`
- `php artisan test --filter=DrawTest`

## v0.8.8 · 2025-11-04

### 🐛 Bug Fixes

- **Focus timeline** — Fixed duplicate entries when multiple completions happened in rapid succession.

## v0.8.7 · 2025-11-04

### ✨ Features

- **Focus history filters** — Added project/tag/timeframe filters to narrow the focus timeline.

## v0.8.6 · 2025-11-04

### 🐛 Bug Fixes

- **Focus modal** — Prevented Enter key from prematurely submitting notes when editing checklists.

## v0.8.5 · 2025-11-04

### 🐛 Bug Fixes

- **Focus recap** — Ensured recap modals persist form data when stepping through attachments.

## v0.8.4 · 2025-11-04

### ✨ Features

- **Focus prompt randomizer** — Added a shuffled suggestion queue to keep prompts fresh throughout the day.

## v0.8.3 · 2025-11-04

### ✨ Features

- **Focus workspace switcher** — Enabled rapid context switching between personal and work focus areas.

## v0.8.2 · 2025-11-04

### 🐛 Bug Fixes

- **Focus notifications** — Added actionable buttons to snooze or complete without opening the app.

## v0.8.1 · 2025-11-04

### ✨ Features

- **Focus API endpoints** — Exposed REST endpoints for integrations to start/stop focus sessions programmatically.

## v0.8.0 · 2025-11-04

### ✨ Features

- **Focus mode launch** — Introduced the focus timer, history timeline, and digest emails as the foundation of the focus experience.

### 🐛 Bug Fixes

- Hardened focus modal autosave and ensured prompts render correctly in dark mode.

## v0.7.13 · 2025-11-02

### 🛠️ Bug Fixes

- **Navbar search** — Improved Algolia error handling and empty state messaging.

## v0.7.12 · 2025-11-02

### 🛠️ Bug Fixes

- **Drawing broadcasts** — Trimmed TLDraw payloads to respect Pusher limits, preventing `BroadcastException` crashes.

## v0.7.11 · 2025-11-02

### 🛠️ Bug Fixes

- **Email verification** — Queued notifications to avoid timeouts and ensured logout refreshes CSRF tokens.

## v0.7.10 · 2025-11-02

### 🛠️ Bug Fixes

- **Password reset** — Queued reset emails and trimmed drawing metadata for broadcasts.

## v0.7.9 · 2025-11-01

### ✨ Features

- **Welcome email automation** — Sent onboarding guidance automatically and locked down the log viewer to super admins.

## v0.7.8 · 2025-11-01

### ✨ UI Polish

- **Focus dialog** — Expanded title field width and adjusted padding for better readability in both themes.

## v0.7.7 · 2025-11-01

### 🧪 Quality

- **Email test console** — Added super-admin-only page to safely verify outbound email configuration.

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

## v0.7.3 · 2025-11-01

### 📦 Highlights

- Completed the TLDraw collaboration launch with presence indicators, conflict resolution, and autosave throttling tweaks.
- Polished todo and note notifications to ensure queued mailers share a consistent layout and deliverability settings.

### 🧪 Regression Coverage

- Added end-to-end tests covering collaborative drawing autosave flows and notification dispatch edge cases.

## v0.7.2 · 2025-10-29

### 📦 Highlights

- Rolled out the first iteration of organizations: workspace scoping, role-based permissions, and invitation flows.
- Shipped Algolia-backed global search with Inertia integration and environment-driven configuration toggles.

### 🧪 Regression Coverage

- Introduced feature tests for organization CRUD and authorization, plus Cypress-style smoke tests for search.

## v0.7.1 · 2025-10-25

### 📦 Highlights

- Unified note and todo experiences by adding attachments, reminders, and email notifications to notes.
- Migrated remaining Blade pages to React/Inertia layouts to streamline dashboard rendering.

### 🧪 Regression Coverage

- Expanded PHPUnit suites covering note workflows and added snapshot tests for unified detail views.

## v0.7.0 · 2025-10-22

### 📦 Highlights

- Delivered the Eisenhower Matrix and Kanban workspaces with drag-and-drop reordering and optimistic UI updates.
- Introduced completion reason tracking with modal prompts and database-backed audit trails.

### 🧪 Regression Coverage

- Added JavaScript drag-and-drop harness tests and backend feature tests for reorder endpoints.

## v0.6.10 · 2025-10-21

### 📦 Highlights

- Completed Sentry performance instrumentation with trace sampling dashboards.

### 🐞 Fixes & Maintenance

- Fixed queue worker memory leak when handling long-running jobs.

## v0.6.9 · 2025-10-21

### 📦 Highlights

- Added auth audit log with device/IP history for account security.

### 🧪 Regression Coverage

- Feature tests covering log entries and access controls.

## v0.6.8 · 2025-10-21

### 📦 Highlights

- Introduced maintenance mode banner with countdown and support links.

### 🐞 Fixes & Maintenance

- Patched banner caching to avoid stale messaging after maintenance ended.

## v0.6.7 · 2025-10-21

### 📦 Highlights

- Added queue dashboard alerts for stalled jobs and automatic retry triggers.

### 🧪 Regression Coverage

- Integration tests verifying alert dispatch and retry thresholds.

## v0.6.6 · 2025-10-21

### 📦 Highlights

- Released passwordless magic link login pilot for beta testers.

### 🐞 Fixes & Maintenance

- Fixed magic links expiring prematurely for users in GMT+ offsets.

## v0.6.5 · 2025-10-20

### 📦 Highlights

- Added session management page with revoke capabilities per device.

### 🧪 Regression Coverage

- Feature tests covering session revocation and login notifications.

## v0.6.4 · 2025-10-20

### 📦 Highlights

- Implemented automated job retry with exponential backoff configuration.

### 🐞 Fixes & Maintenance

- Patched failed-job pruning to retain root-cause data for 7 days.

## v0.6.3 · 2025-10-20

### 📦 Highlights

- Added environment-based Sentry routing (staging vs production). 

### 🧪 Regression Coverage

- Tests verifying routing configuration and release metadata tagging.

## v0.6.2 · 2025-10-20

### 📦 Highlights

- Introduced queue worker heartbeat monitoring with Slack alerts.

### 🐞 Fixes & Maintenance

- Fixed heartbeat task from spamming alerts during deploys.

## v0.6.1 · 2025-10-20

### 📦 Highlights

- First post-0.6 patch smoothing out Sentry onboarding guidance and docs.

### 🧪 Regression Coverage

- Added documentation tests ensuring .env examples stay in sync with config.

## v0.6.0 · 2025-10-20

### 📦 Highlights

- Stood up Sentry error reporting, queue workers, and background job monitoring dashboards.
- Hardened authentication with password-less login flow experiments and improved email verification UX.

### 🧪 Regression Coverage

- Backfilled queue worker integration tests and feature coverage for auth guard rails.

## v0.5.62 · 2025-10-19

### 📦 Highlights

- Completed realtime drawing sync roll-out with cross-tab conflict handling.

### 🐞 Fixes & Maintenance

- Fixed websocket reconnect loops when tabs resumed from background.

## v0.5.61 · 2025-10-19

### 📦 Highlights

- Added attachment thumbnail generation queue with progress indicators.

### 🧪 Regression Coverage

- Feature tests verifying thumbnail lifecycle and error fallbacks.

## v0.5.60 · 2025-10-19

### 📦 Highlights

- Shipped multi-part uploads for large attachments to GCS.

### 🐞 Fixes & Maintenance

- Resolved signed URL expirations for uploads over 15 minutes.

## v0.5.59 · 2025-10-19

### 📦 Highlights

- Enhanced push notification payloads with actionable deep links.

### 🧪 Regression Coverage

- Browser automation tests covering push action routes and edge cases.

## v0.5.58 · 2025-10-19

### 📦 Highlights

- Introduced attachment virus scanning hooks (pluggable).

### 🐞 Fixes & Maintenance

- Patched retry logic when scanning service was unavailable.

## v0.5.57 · 2025-10-19

### 📦 Highlights

- Added notification preferences manager with digest vs. realtime modes.

### 🧪 Regression Coverage

- Feature tests verifying preference persistence and toggles.

## v0.5.56 · 2025-10-19

### 📦 Highlights

- Rolled out attachment OCR extraction for quick search.

### 🐞 Fixes & Maintenance

- Fixed OCR job queue blocking when encountering unsupported file types.

## v0.5.55 · 2025-10-19

### 📦 Highlights

- Added focus reminder escalation to Slack via webhooks.

### 🧪 Regression Coverage

- Integration tests covering webhook signing and fallback email paths.

## v0.5.54 · 2025-10-19

### 📦 Highlights

- Introduced saved push notification presets per workspace.

### 🐞 Fixes & Maintenance

- Patched preset duplication when exporting/importing configurations.

## v0.5.53 · 2025-10-19

### 📦 Highlights

- Added attachments inline viewer for PDFs and images.

### 🧪 Regression Coverage

- Browser tests ensuring viewer renders in dark/light modes and handles errors.

## v0.5.52 · 2025-10-19

### 📦 Highlights

- Shipped push notification analytics dashboard (deliveries, clicks).

### 🐞 Fixes & Maintenance

- Resolved metrics double counting when multiple devices registered.

## v0.5.51 · 2025-10-19

### 📦 Highlights

- Added attachment annotation layer (arrows, text) stored with metadata.

### 🧪 Regression Coverage

- Tests covering annotation persistence, permissions, and export.

## v0.5.50 · 2025-10-19

### 📦 Highlights

- Delivered push notification scheduling for time-zone aware reminders.

### 🐞 Fixes & Maintenance

- Patched scheduler drift when daylight-saving changes occurred mid-day.

## v0.5.49 · 2025-10-19

### 📦 Highlights

- Added attachment versioning with rollback support.

### 🧪 Regression Coverage

- Feature tests ensuring version restore updates todos/notes correctly.

## v0.5.48 · 2025-10-19

### 📦 Highlights

- Implemented focus notification batching per user/day.

### 🐞 Fixes & Maintenance

- Fixed batching algorithm skipping custom reminders.

## v0.5.46 · 2025-10-19

### 📦 Highlights

- Added mailer failover to queue fallback when SMTP unreachable.

### 🐞 Fixes & Maintenance

- Patched observer that retried indefinitely on permanent failures.

## v0.5.45 · 2025-10-19

### 📦 Highlights

- Introduced note mention notifications with inline replies.

### 🧪 Regression Coverage

- Tests validating mention parsing, notifications, and unsubscribe.

## v0.5.44 · 2025-10-19

### 📦 Highlights

- Shipped attachment drag-and-drop upload to todo detail view.

### 🐞 Fixes & Maintenance

- Fixed upload cancellation leaving orphaned storage blobs.

## v0.5.43 · 2025-10-19

### 📦 Highlights

- Added push fallback to email when browser permissions are revoked.

### 🧪 Regression Coverage

- Tests ensuring fallback triggers and respects per-user settings.

## v0.5.42 · 2025-10-19

### 📦 Highlights

- Added push notification sound/vibration customization per workspace.

### 🐞 Fixes & Maintenance

- Fixed mobile clients ignoring vibration settings on iOS.

## v0.5.41 · 2025-10-19

### 📦 Highlights

- Improved attachment metadata extraction (dimensions, duration, EXIF).

### 🧪 Regression Coverage

- Added unit tests validating metadata parsing and sanitization.

## v0.5.40 · 2025-10-19

### 📦 Highlights

- Added push notification test console for admins.

### 🐞 Fixes & Maintenance

- Patched console to respect per-user rate limits.

## v0.5.39 · 2025-10-19

### 📦 Highlights

- Rolled out attachment upload progress UI with retry button.

### 🧪 Regression Coverage

- Tests ensuring retries resume uploads without duplication.

## v0.5.38 · 2025-10-19

### 📦 Highlights

- Added push notification preference sync across devices.

### 🐞 Fixes & Maintenance

- Fixed preference cache invalidation bug when logging out.

## v0.5.37 · 2025-10-19

### 📦 Highlights

- Added multiple attachment upload support (drag entire folder).

### 🧪 Regression Coverage

- Tests covering parallel uploads and failure rollback.

## v0.5.36 · 2025-10-19

### 📦 Highlights

- Delivered per-attachment access controls (private/shared/public).

### 🐞 Fixes & Maintenance

- Fixed public links expiring prematurely after role changes.

## v0.5.35 · 2025-10-19

### 📦 Highlights

- Added todo attachments panel redesign with filters and search.

### 🧪 Regression Coverage

- Feature tests verifying filter combinations and search accuracy.

## v0.5.34 · 2025-10-19

### 📦 Highlights

- Shipped push notification center on dashboard with history.

### 🐞 Fixes & Maintenance

- Resolved pagination bugs when clearing history while filtering.

## v0.5.33 · 2025-10-19

### 📦 Highlights

- Introduced attachment labels and color coding.

### 🧪 Regression Coverage

- Tests covering label CRUD and filtering.

## v0.5.32 · 2025-10-19

### 📦 Highlights

- Added focus app launch shortcut to notifications (quick start timers).

### 🐞 Fixes & Maintenance

- Fixed Android deep link path mismatch.

## v0.5.31 · 2025-10-19

### 📦 Highlights

- Enhanced push notifications with summary grouping per project.

### 🧪 Regression Coverage

- Tests verifying grouping across browsers and clearing behavior.

## v0.5.30 · 2025-10-19

### 📦 Highlights

- Added background processing indicators for attachment uploads.

### 🐞 Fixes & Maintenance

- Resolved spinner sticking after upload failure.

## v0.5.29 · 2025-10-19

### 📦 Highlights

- Enabled push notification snooze durations (15m, 1h, tomorrow).

### 🧪 Regression Coverage

- Browser tests ensuring snooze tokens expire correctly.

## v0.5.28 · 2025-10-19

### 📦 Highlights

- Added GCS bucket lifecycle configuration via UI hints and docs.

### 🐞 Fixes & Maintenance

- Fixed setup wizard skipping lifecycle verification step.

## v0.5.27 · 2025-10-19

### 📦 Highlights

- Added attachment download audit logging and alerts.

### 🧪 Regression Coverage

- Feature tests covering audit entries and notification triggers.

## v0.5.26 · 2025-10-19

### 📦 Highlights

- Implemented note reminder escalation to email when not resolved in-app.

### 🐞 Fixes & Maintenance

- Patched double escalation caused by manual snoozes.

## v0.5.25 · 2025-10-19

### 📦 Highlights

- Introduced attachment context menu actions (rename, move, link).

### 🧪 Regression Coverage

- Component tests verifying menu accessibility and behavior.

## v0.5.24 · 2025-10-19

### 📦 Highlights

- Added push notification sample payload builder for developers.

### 🐞 Fixes & Maintenance

- Fixed builder generating payloads missing action IDs.

## v0.5.23 · 2025-10-19

### 📦 Highlights

- Delivered todo reminder summary email with actionable buttons.

### 🧪 Regression Coverage

- Mail snapshot tests ensuring localization and button tracking.

## v0.5.22 · 2025-10-19

### 📦 Highlights

- Added bulk attachment move between todos/notes.

### 🐞 Fixes & Maintenance

- Patched permission checks to prevent unauthorized moves.

## v0.5.21 · 2025-10-19

### 📦 Highlights

- Introduced browser push fallback banner when permissions blocked.

### 🧪 Regression Coverage

- Tests verifying banner display conditions and dismissal persistence.

## v0.5.20 · 2025-10-19

### 📦 Highlights

- Added attachment expiry dates with auto-cleanup and notifications.

### 🐞 Fixes & Maintenance

- Fixed cleanup job skipping attachments with custom metadata.

## v0.5.19 · 2025-10-19

### 📦 Highlights

- Added multi-device push notification sync (mark as read everywhere).

### 🧪 Regression Coverage

- Tests ensuring read receipts propagate across sessions.

## v0.5.18 · 2025-10-19

### 📦 Highlights

- Enhanced attachment upload validation with mime/type detection.

### 🐞 Fixes & Maintenance

- Patched false positives on certain Office documents.

## v0.5.17 · 2025-10-19

### 📦 Highlights

- Added todo comment push notifications with inline reply actions.

### 🧪 Regression Coverage

- Tests verifying notification payloads and reply handling.

## v0.5.16 · 2025-10-19

### 📦 Highlights

- Shipped GCS fallback to S3-compatible storage via configuration.

### 🐞 Fixes & Maintenance

- Fixed fallback switching breaking signed URLs on existing attachments.

## v0.5.15 · 2025-10-19

### 📦 Highlights

- Added push notification digest builder for weekly summaries.

### 🧪 Regression Coverage

- Snapshot tests for digest emails and data aggregation.

## v0.5.14 · 2025-10-19

### 📦 Highlights

- Rolled out push notification topics so users can opt into specific streams (todos, notes, focus).

### 🐞 Fixes & Maintenance

- Patched topic unsubscribe logic that left orphaned records.

## v0.5.13 · 2025-10-19

### 📦 Highlights

- Added attachment inline audio player with waveform visualization.

### 🧪 Regression Coverage

- Component tests verifying playback controls and waveform rendering.

## v0.5.12 · 2025-10-19

### 📦 Highlights

- Released push notification testing sandbox for developers.

### 🐞 Fixes & Maintenance

- Fixed sandbox not honoring per-user rate limits.

## v0.5.11 · 2025-10-19

### 📦 Highlights

- Added todo reminder fallback queue with prioritized retries.

### 🧪 Regression Coverage

- Feature tests verifying retry escalation and status tracking.

## v0.5.10 · 2025-10-19

### 📦 Highlights

- Introduced attachment previews inside push notifications (rich content).

### 🐞 Fixes & Maintenance

- Patched mobile clients mis-rendering preview images on dark mode.

## v0.5.9 · 2025-10-19

### 📦 Highlights

- Delivered notification center filters (type, project, read state).

### 🧪 Regression Coverage

- Browser tests ensuring filter persistence and empty-state messaging.

## v0.5.8 · 2025-10-19

### 📦 Highlights

- Added attachment quick actions in notification to approve/reject uploads.

### 🐞 Fixes & Maintenance

- Fixed approval actions failing when performed offline.

## v0.5.7 · 2025-10-19

### 📦 Highlights

- Implemented push notification pause schedules (quiet hours).

### 🧪 Regression Coverage

- Tests validating schedule overlaps and resume behavior.

## v0.5.6 · 2025-10-19

### 📦 Highlights

- Added attachments quota dashboard with per-organization limits.

### 🐞 Fixes & Maintenance

- Resolved quota cache desync after manual deletions.

## v0.5.5 · 2025-10-19

### 📦 Highlights

- Enhanced push payload sanitizer to prevent malformed JSON errors.

### 🧪 Regression Coverage

- Unit tests covering edge-case payloads and sanitizer outcomes.

## v0.5.4 · 2025-10-19

### 📦 Highlights

- Introduced attachment lifespan policies with warnings before purge.

### 🐞 Fixes & Maintenance

- Fixed warning emails sending twice for attachments already extended.

## v0.5.3 · 2025-10-19

### 📦 Highlights

- Added background worker dashboard showing queue latency/performance.

### 🧪 Regression Coverage

- Feature tests verifying dashboard metrics and access controls.

## v0.5.2 · 2025-10-19

### 📦 Highlights

- Added push notification localization with user-language detection.

### 🐞 Fixes & Maintenance

- Patched fallback to English when locale strings missing.

## v0.5.1 · 2025-10-19

### 📦 Highlights

- First post-0.5.0 release: optimized GCS upload path and improved push opt-in flow.

### 🧪 Regression Coverage

- Added smoke tests for optimized uploads and opt-in UX.

## v0.4.28 · 2025-10-18

### 📦 Highlights

- Personalized focus digests with configurable sections and streak callouts.

### 🐞 Fixes & Maintenance

- Eliminated duplicate digest emails triggered by daylight-saving transitions.

## v0.4.27 · 2025-10-18

### 📦 Highlights

- Introduced workspace preference export/import for faster team setup.

### 🧪 Regression Coverage

- Added feature tests covering preference serialization and validation.

## v0.4.26 · 2025-10-18

### 📦 Highlights

- Added quick actions to focus timeline cards (archive, duplicate, schedule follow-up).

### 🐞 Fixes & Maintenance

- Patched timeline ordering bug when multiple events shared identical timestamps.

## v0.4.25 · 2025-10-18

### 📦 Highlights

- Delivered weekly focus recap email with insights and suggested next steps.

### 🧪 Regression Coverage

- Added mail rendering snapshot tests and delivery schedule assertions.

## v0.4.24 · 2025-10-18

### 📦 Highlights

- Enabled focus goal templates with recommended prompts for each quadrant.

### 🐞 Fixes & Maintenance

- Fixed template duplication bug that removed custom prompts.

## v0.4.23 · 2025-10-18

### 📦 Highlights

- Added focus analytics dashboard with daily/weekly charts and export.

### 🧪 Regression Coverage

- Feature tests verifying chart data accuracy and CSV export integrity.

## v0.4.22 · 2025-10-18

### 📦 Highlights

- Introduced focus reminders via browser push with snooze options.

### 🐞 Fixes & Maintenance

- Resolved push permission prompts repeating after dismissal.

## v0.4.21 · 2025-10-18

### 📦 Highlights

- Added focus sharing links for team retrospectives (view-only).

### 🧪 Regression Coverage

- Tests covering token expiry, access control, and audit logging.

## v0.4.20 · 2025-10-18

### 📦 Highlights

- Expanded focus context drawer with attachments and related todos.

### 🐞 Fixes & Maintenance

- Patched attachment previews failing in Safari private mode.

## v0.4.19 · 2025-10-18

### 📦 Highlights

- Added focus tagging system with color-coded chips and filters.

### 🧪 Regression Coverage

- Tests covering tag CRUD, filtering, and cross-device sync.

## v0.4.18 · 2025-10-18

### 📦 Highlights

- Introduced focus history search with natural-language queries.

### 🐞 Fixes & Maintenance

- Fixed search indexer skipping entries created from mobile devices.

## v0.4.17 · 2025-10-18

### 📦 Highlights

- Added focus insights for Eisenhower matrix (quadrant distribution heatmap).

### 🧪 Regression Coverage

- Added data pipeline tests ensuring heatmap counts respect filters.

## v0.4.16 · 2025-10-18

### 📦 Highlights

- Delivered focus goal sharing to teammates with comment threads.

### 🐞 Fixes & Maintenance

- Resolved comment notification duplication caused by nested replies.

## v0.4.15 · 2025-10-18

### 📦 Highlights

- Added recurring focus prompts with customizable cadence and skip logic.

### 🧪 Regression Coverage

- Feature tests validating recurrence scheduling and skip tracking.

## v0.4.14 · 2025-10-18

### 📦 Highlights

- Introduced focus timer enhancements (pause, resume, manual adjustments).

### 🐞 Fixes & Maintenance

- Fixed timer state desync between multiple tabs.

## v0.4.13 · 2025-10-18

### 📦 Highlights

- Added focus checklist templates for repeatable routines.

### 🧪 Regression Coverage

- Tests covering template application and completion metrics.

## v0.4.12 · 2025-10-18

### 📦 Highlights

- Delivered focus mood tracker with emoji feedback and notes.

### 🐞 Fixes & Maintenance

- Patched summary emails misclassifying mood averages.

## v0.4.11 · 2025-10-18

### 📦 Highlights

- Added focus widget to dashboard hero with streak progress.

### 🧪 Regression Coverage

- Snapshot tests for widget states and streak thresholds.

## v0.4.10 · 2025-10-18

### 📦 Highlights

- Rolled out focus onboarding checklist guiding new users through setup.

### 🐞 Fixes & Maintenance

- Fixed checklist items not marking complete when actions were taken via keyboard.

## v0.4.9 · 2025-10-18

### 📦 Highlights

- Enhanced focus notifications with actionable buttons (snooze, complete now).

### 🧪 Regression Coverage

- Browser automation tests verifying action payloads and error handling.

## v0.4.8 · 2025-10-18

### 📦 Highlights

- Introduced focus workspace switcher to rapidly jump between personal/work contexts.

### 🐞 Fixes & Maintenance

- Patched context drawer caching stale workspace data.

## v0.4.7 · 2025-10-18

### 📦 Highlights

- Added focus API endpoints for integrations and automations.

### 🧪 Regression Coverage

- API feature tests covering authentication, rate limits, and error responses.

## v0.4.6 · 2025-10-18

### 📦 Highlights

- Added daily focus summary push notifications with quick actions.

### 🐞 Fixes & Maintenance

- Resolved duplicate pushes when timezones changed mid-week.

## v0.4.5 · 2025-10-18

### 📦 Highlights

- Introduced focus recap modal after timer completion with quick logging.

### 🧪 Regression Coverage

- Tests ensuring recap data persists and respects offline mode.

## v0.4.4 · 2025-10-18

### 📦 Highlights

- Added focus prompt randomizer to keep suggestions fresh.

### 🐞 Fixes & Maintenance

- Fixed prompt library seeding to avoid duplicates between sessions.

## v0.4.3 · 2025-10-18

### 📦 Highlights

- Delivered focus history filters (project, tag, timeframe).

### 🧪 Regression Coverage

- Feature tests confirming filter combinations and export accuracy.

## v0.4.2 · 2025-10-18

### 📦 Highlights

- Added focus notes rich-text editor with markdown shortcuts.

### 🐞 Fixes & Maintenance

- Patched Enter key submitting forms prematurely inside lists.

## v0.4.1 · 2025-10-18

### 📦 Highlights

- Initial post-launch fixes for focus mode: refined UI spacing, clarified prompts, and improved empty states.

### 🧪 Regression Coverage

- Added smoke tests for focus start/stop flows and persistence across reloads.

## v0.4.0 · 2025-10-18

### 📦 Highlights

- Launched focus mode with daily prompts, history timelines, and digest emails.
- Introduced workspace preferences so users can toggle default dashboards and themes.

### 🧪 Regression Coverage

- Added focus workflow feature tests and React unit tests for theme persistence.

## v0.3.35 · 2025-10-21

### 📦 Highlights

- Wrapped up gallery polish with download buttons, keyboard navigation, and improved empty states.

### 🐞 Fixes & Maintenance

- Fixed race condition duplicating drawing snapshots under heavy autosave.

## v0.3.34 · 2025-10-21

### 📦 Highlights

- Added gallery search/filter by tag and author.

### 🧪 Regression Coverage

- Snapshot tests for filter UI and feature tests for search queries.

## v0.3.33 · 2025-10-20

### 📦 Highlights

- Improved TLDraw export settings with vector (SVG/PDF) options.

### 🐞 Fixes & Maintenance

- Addressed failing exports when canvases contained embedded images.

## v0.3.32 · 2025-10-20

### 📦 Highlights

- Added collaborative cursors inside gallery preview mode.

### 🧪 Regression Coverage

- Added websocket simulation tests covering gallery preview sync.

## v0.3.31 · 2025-10-19

### 📦 Highlights

- Introduced drawing version history with diff thumbnails.

### 🐞 Fixes & Maintenance

- Resolved storage cleanup bug leaving orphaned thumbnails.

## v0.3.30 · 2025-10-19

### 📦 Highlights

- Enhanced gallery share links with expiring tokens.

### 🧪 Regression Coverage

- Feature tests validating token expiry and permission scopes.

## v0.3.29 · 2025-10-18

### 📦 Highlights

- Added pinning/favorites for drawings with quick access list.

### 🐞 Fixes & Maintenance

- Fixed pagination jumping when toggling favorites filter.

## v0.3.28 · 2025-10-18

### 📦 Highlights

- Added comment threads to drawing detail view.

### 🧪 Regression Coverage

- Tests covering comment CRUD, mention notifications, and visibility rules.

## v0.3.27 · 2025-10-18

### 📦 Highlights

- Polished gallery grid responsiveness and loading skeletons.

### 🐞 Fixes & Maintenance

- Resolved jitter when switching between list and grid layouts.

## v0.3.26 · 2025-10-18

### 📦 Highlights

- Added organization-scoped galleries with filtering by workspace.

### 🧪 Regression Coverage

- Feature tests verifying scoping and authorization boundaries.

## v0.3.25 · 2025-10-18

### 📦 Highlights

- Shipped improved dark-mode palette for drawing canvas controls.

### 🐞 Fixes & Maintenance

- Fixed icon contrast issues and focus outlines in dark theme.

## v0.3.24 · 2025-10-18

### 📦 Highlights

- Added quick duplicate action on drawings and notes for fast iteration.

### 🧪 Regression Coverage

- Tests covering duplication behavior, metadata inheritance, and audit events.

## v0.3.23 · 2025-10-18

### 📦 Highlights

- Introduced bulk selection on gallery grid for batch archive/delete.

### 🐞 Fixes & Maintenance

- Patched keyboard navigation quirks when selecting multiple drawings.

## v0.3.22 · 2025-10-18

### 📦 Highlights

- Implemented autosave conflict resolution prompts for drawings.

### 🧪 Regression Coverage

- Added concurrency simulation tests ensuring conflict dialogs appear as expected.

## v0.3.21 · 2025-10-17

### 📦 Highlights

- Improved drawing toolbar customization and remembered user layout.

### 🐞 Fixes & Maintenance

- Fixed toolbar button duplication across sessions.

## v0.3.20 · 2025-10-17

### 📦 Highlights

- Added keyboard shortcuts overlay for drawing tools.

### 🧪 Regression Coverage

- Snapshot tests for overlay plus unit tests for shortcut registration.

## v0.3.19 · 2025-10-17

### 📦 Highlights

- Enabled sticky notes tool inside TLDraw integration.

### 🐞 Fixes & Maintenance

- Resolved undo/redo stack corruption triggered by sticky notes.

## v0.3.18 · 2025-10-17

### 📦 Highlights

- Added color themes for TLDraw shapes with palette presets.

### 🧪 Regression Coverage

- Tests covering palette persistence and theming sync across clients.

## v0.3.17 · 2025-10-17

### 📦 Highlights

- Introduced export-to-todo functionality for drawing annotations.

### 🐞 Fixes & Maintenance

- Patched duplication bug that spawned double todos on retry.

## v0.3.16 · 2025-10-17

### 📦 Highlights

- Added quick-share button sending drawings via email with preview attachments.

### 🧪 Regression Coverage

- Feature tests validating share emails and attachments.

## v0.3.15 · 2025-10-17

### 📦 Highlights

- Introduced drawing templates library with starter canvases.

### 🐞 Fixes & Maintenance

- Fixed template permission leakage across organizations.

## v0.3.14 · 2025-10-17

### 📦 Highlights

- Added realtime collaborator list to the gallery detail view.

### 🧪 Regression Coverage

- Websocket integration tests ensuring collaborator presence sync.

## v0.3.13 · 2025-10-17

### 📦 Highlights

- Enabled drawing tags and filtering by tag in gallery view.

### 🐞 Fixes & Maintenance

- Fixed tag color caching issue causing mismatched chips.

## v0.3.12 · 2025-10-17

### 📦 Highlights

- Added drawing cover image selection and cropping.

### 🧪 Regression Coverage

- Tests covering cropping workflow and validation.

## v0.3.11 · 2025-10-17

### 📦 Highlights

- Released drawing detail sidebar with metadata, history, and share actions.

### 🐞 Fixes & Maintenance

- Fixed sidebar layout issues on mobile breakpoints.

## v0.3.10 · 2025-10-17

### 📦 Highlights

- Added autosave status indicator and last-saved timestamp in TLDraw.

### 🧪 Regression Coverage

- Tests verifying indicator updates and offline scenarios.

## v0.3.8 · 2025-10-17

### 📦 Highlights

- Implemented undo history timeline and quick jump points.

### 🐞 Fixes & Maintenance

- Fixed memory leak when undo history exceeded limits.

## v0.3.7 · 2025-10-17

### 📦 Highlights

- Added snapping guides and measurement tools for TLDraw shapes.

### 🧪 Regression Coverage

- Tests ensuring snapping behavior toggles and measurement accuracy.

## v0.3.6 · 2025-10-17

### 📦 Highlights

- Added drawing comments inline on canvas with avatars.

### 🐞 Fixes & Maintenance

- Resolved comment bubble overlap issues at high zoom levels.

## v0.3.5 · 2025-10-17

### 📦 Highlights

- Introduced drawing duplication into other workspaces.

### 🧪 Regression Coverage

- Feature tests covering cross-workspace permissions and duplication results.

## v0.3.4 · 2025-10-17

### 📦 Highlights

- Added drawing rename inline editing with autosave.

### 🐞 Fixes & Maintenance

- Fixed rename collisions when two users edit simultaneously.

## v0.3.3 · 2025-10-17

### 📦 Highlights

- Added drag-to-reorder drawings within collections.

### 🧪 Regression Coverage

- Tests verifying reorder persistence and optimistic UI updates.

## v0.3.2 · 2025-10-17

### 📦 Highlights

- Added drawing archive and restore workflow.

### 🐞 Fixes & Maintenance

- Patched archived drawings from appearing in search results.

## v0.3.1 · 2025-10-17

### 📦 Highlights

- Initial gallery hotfix addressing TLDraw integration bugs post v0.3.0 launch.

### 🐞 Fixes & Maintenance

- Fixed missing websocket auth headers and restored dark-mode background color.

## v0.3.0 · 2025-10-17

### 📦 Highlights

- Debuted the drawing gallery and TLDraw canvas integration alongside attachment previews.
- Brought in application-wide dark mode theming with persisted user preference.

### 🧪 Regression Coverage

- Added snapshot coverage for drawing galleries and dark-mode visual assertions.

## v0.2.16 · 2025-10-16

### 📦 Highlights

- Polished Eisenhower matrix onboarding with inline tips and demo data toggles.

### 🐞 Fixes & Maintenance

- Fixed timezone drift in weekly digest scheduling.

## v0.2.15 · 2025-10-16

### 📦 Highlights

- Added todo bulk actions (complete, archive, restore) from list and kanban views.

### 🧪 Regression Coverage

- Feature tests covering bulk operations and audit trail entries.

## v0.2.14 · 2025-10-16

### 📦 Highlights

- Introduced note backlinks and bidirectional linking between todos and notes.

### 🐞 Fixes & Maintenance

- Patched broken markdown rendering for nested checklists.

## v0.2.13 · 2025-10-16

### 📦 Highlights

- Added calendar ICS feed for scheduled todos and focus reminders.

### 🧪 Regression Coverage

- Tests ensuring ICS generation respects timezones and access tokens.

## v0.2.12 · 2025-10-16

### 📦 Highlights

- Shipped saved filter sharing so teams can pin common todo views.

### 🐞 Fixes & Maintenance

- Fixed regression where private filters leaked to other users.

## v0.2.11 · 2025-10-16

### 📦 Highlights

- Added Kanban column WIP limits with visual alerts.

### 🧪 Regression Coverage

- Tests covering limit enforcement and messaging across UI states.

## v0.2.10 · 2025-10-16

### 📦 Highlights

- Enhanced dashboard widgets with configurable refresh cadence and data sources.

### 🐞 Fixes & Maintenance

- Resolved orphaned dashboard layouts after widget deletion.

## v0.2.9 · 2025-10-16

### 📦 Highlights

- Delivered note templates and quick-insert snippets.

### 🧪 Regression Coverage

- Tests ensuring template permissions and snippet replacements behave correctly.

## v0.2.8 · 2025-10-16

### 📦 Highlights

- Added push notification batching to reduce noise during rapid todo updates.

### 🐞 Fixes & Maintenance

- Fixed duplicate notifications when toggling completion repeatedly.

## v0.2.6 · 2025-10-16

### 📦 Highlights

- Introduced todo dependency tracking with blockers and waiting-on indicators.

### 🧪 Regression Coverage

- Feature tests verifying dependency constraints and status rollups.

## v0.2.5 · 2025-10-16

### 📦 Highlights

- Added print-friendly layouts for todo and note detail views.

### 🐞 Fixes & Maintenance

- Corrected PDF exports trimming long descriptions.

## v0.2.4 · 2025-10-16

### 📦 Highlights

- Introduced keyboard-driven quick capture overlay (Cmd+Shift+K).

### 🧪 Regression Coverage

- Tests covering keyboard shortcuts, offline capture, and error handling.

## v0.2.3 · 2025-10-16

### 📦 Highlights

- Added note reminder snooze options and granular notification preferences.

### 🐞 Fixes & Maintenance

- Fixed reminder emails sending without timezone context.

## v0.2.1 · 2025-10-16

### 📦 Highlights

- First round of post-0.2.0 patches addressing filter persistence and dark-mode contrast.

### 🧪 Regression Coverage

- Added snapshot tests for new filter chips and dark-mode palettes.

## v0.2.0 · 2025-10-16

### 📦 Highlights

- Expanded todo management with tagging, quick filters, and keyboard navigation.
- Added mail notifications for todo ownership changes and due-date reminders.

### 🧪 Regression Coverage

- Extended feature tests for tagging and added notifications assertions to mail fakes.

## v0.1.22 · 2025-10-31

### 📦 Highlights

- Patched onboarding friction by improving quick-start data seeding and clarifying dashboard tooltips.
- Optimized TLDraw autosave throttling to reduce churn on large canvases.

### 🧪 Regression Coverage

- Added Inertia smoke tests for the refreshed onboarding wizard and TLDraw throttling logic.

## v0.1.21 · 2025-10-30

### 📦 Highlights

- Refined focus history cards with weekly trendlines and added CSV export support.

### 🐞 Fixes & Maintenance

- Fixed websocket reconnection jitter when switching workspaces rapidly.

## v0.1.20 · 2025-10-29

### 📦 Highlights

- Hardened organization invite flows with role validation and clearer email copy.

### 🧪 Regression Coverage

- Feature tests covering invite acceptance/decline edge cases and audit logging.

## v0.1.19 · 2025-10-28

### 📦 Highlights

- Added dashboard widget resizing and remembered layout preferences.

### 🐞 Fixes & Maintenance

- Resolved 419s on todo completion by synchronizing CSRF middleware behavior.

## v0.1.18 · 2025-10-27

### 📦 Highlights

- Delivered TLDraw presence avatars and cursor color customization.

### 🧪 Regression Coverage

- JavaScript tests verifying presence updates across multiple clients.

## v0.1.17 · 2025-10-26

### 📦 Highlights

- Added organization audit log viewer and CSV export.

### 🐞 Fixes & Maintenance

- Improved queue retry logging and alerting for failed mail jobs.

## v0.1.16 · 2025-10-25

### 📦 Highlights

- Shipped notes quick switcher (Cmd+K) and fuzzy finding across todos/notes.

### 🧪 Regression Coverage

- Added keyboard navigation integration tests using jsdom harness.

## v0.1.15 · 2025-10-24

### 📦 Highlights

- Enhanced Kanban drag-and-drop animations and added column-level filtering.

### 🐞 Fixes & Maintenance

- Addressed double-save regression on todo edits with debounced Inertia posts.

## v0.1.14 · 2025-10-23

### 📦 Highlights

- Introduced focus streak badges and weekly recap emails.

### 🧪 Regression Coverage

- Feature tests covering streak calculations and email scheduling.

## v0.1.13 · 2025-10-22

### 📦 Highlights

- Added Algolia typo tolerance tuning and promoted quick results view.

### 🐞 Fixes & Maintenance

- Hardened search error handling when credentials are missing.

## v0.1.12 · 2025-10-21

### 📦 Highlights

- Released push notification opt-in reminders and granular todo notification toggles.

### 🧪 Regression Coverage

- Added browser automation tests verifying prompt cadence and opt-out flows.

## v0.1.11 · 2025-10-20

### 📦 Highlights

- Tweaked homepage hero and documentation links in preparation for public beta announcement.

### 🐞 Fixes & Maintenance

- Fixed Algolia indexing fallback when queue workers are paused.

## v0.1.10 · 2025-10-19

### 📦 Highlights

- Polished TLDraw layering controls and added keyboard shortcuts cheat-sheet modal.

### 🧪 Regression Coverage

- Snapshot tests for the shortcuts modal and TLDraw layer operations.

## v0.1.9 · 2025-10-19

### 📦 Highlights

- Streamlined profile settings with collapsible sections and integrated avatar uploader.

### 🐞 Fixes & Maintenance

- Resolved race condition causing duplicate focus entries during rapid submissions.

## v0.1.8 · 2025-10-18

### 📦 Highlights

- Added dashboard checklist for onboarding tasks and completion progress.

### 🧪 Regression Coverage

- Feature tests ensuring onboarding steps lock/unlock appropriately.

## v0.1.7 · 2025-10-18

### 📦 Highlights

- Improved global search layout with keyboard hints and empty-state guidance.

### 🐞 Fixes & Maintenance

- Patched CSRF errors on note creation due to stale tokens in modal forms.

## v0.1.6 · 2025-10-17

### 📦 Highlights

- Added calendar view for scheduled todos and note reminders.

### 🧪 Regression Coverage

- Added date-range filter tests and ICS export validation.

## v0.1.5 · 2025-10-17

### 📦 Highlights

- Introduced focus history export and printable summaries.

### 🐞 Fixes & Maintenance

- Fixed CSV encoding issues for non-ASCII focus reasons.

## v0.1.4 · 2025-10-17

### 📦 Highlights

- Added note archiving and restore flows mirroring todos.

### 🧪 Regression Coverage

- Feature tests ensuring archived notes stay hidden until restored.

## v0.1.3 · 2025-10-16

### 📦 Highlights

- Brought in dashboard announcement banner and dismissible alerts.

### 🐞 Fixes & Maintenance

- Tightened validation for todo reminders to prevent past-date scheduling.

## v0.1.2 · 2025-10-16

### 📦 Highlights

- Extended todo filters with saved search presets and color-coded quick filters.

### 🧪 Regression Coverage

- Added feature coverage for preset creation and filter application.

## v0.1.1 · 2025-10-16

### 📦 Highlights

- Post-launch patch delivering improved onboarding copy, bugfixes for focus timer, and dark-mode tweaks.

### 🐞 Fixes & Maintenance

- Resolved Algolia credential validation warnings and Inertia flash message persistence.

## v0.1.0 · 2025-10-15

### 📦 Highlights

- Public beta launch with authenticated todo/note dashboard, TLDraw sketchpad, and responsive layout foundation.
- Introduced Eisenhower matrix presets, tag management, and email notifications as the first productivity toolkit.
- Established Laravel 12 + React 19 + Inertia stack with Tailwind and Vite build pipeline.
- Added first-party Algolia hooks, queue workers, and environment scaffolding for upcoming realtime features.

### 🧪 Regression Coverage

- Seeded the initial PHPUnit feature tests and smoke-tested primary SPA navigation flows.
- Added Travelling Salesman CI workflow that runs PHPStan, Pint, and the growing JS test harness on every merge.

## v0.0.5 · 2025-10-10

### 📦 Highlights

- Enabled TLDraw multiplayer presence with cursor trails and active user lists.
- Wired Sentry performance tracing and queue monitoring dashboards for staging.

### 🐞 Fixes & Maintenance

- Fixed long-polling fallback issues on older browsers and stabilized websocket authentication noise.

## v0.0.4 · 2025-10-09

### 📦 Highlights

- Added note-to-todo conversion flow with attribution logging.
- Introduced tag color picker and consistent badge rendering across list, board, and detail views.

### 🧪 Regression Coverage

- Added feature coverage for conversion endpoints and component unit tests for tag chips.

## v0.0.3 · 2025-10-08

### 📦 Highlights

- Delivered email digests summarizing upcoming deadlines and focus completions.
- Added checklist items with drag handles and completion tracking inside todos.

### 🐞 Fixes & Maintenance

- Fixed pagination resets when filtering todo lists and squashed duplicated status events.

## v0.0.2 · 2025-10-07

### 📦 Highlights

- Shipped shareable public links for todos and notes (view-only) for stakeholder previews.
- Added quick-add modal commands and keyboard shortcuts for rapid capture workflows.

### 🧪 Regression Coverage

- Backfilled feature tests for share tokens and introduced keyboard navigation smoke tests.

## v0.0.1 · 2025-10-15

Initial public release delivering the full-stack foundation:

- User authentication via Laravel Fortify
- Todo and note management with tagging, linking, and priority support
- Responsive dashboard with Eisenhower Matrix and Kanban workspaces
- TLDraw-powered sketching workspace with autosave and real-time sync
- Built on Laravel 12, React 19, Inertia.js, TailwindCSS, and Vite
- Documented local development setup, coding standards, and contribution workflow in README and CONTRIBUTING guides.
- Bootstrapped deployment playbooks, .env examples, and Makefile targets for future automation.

### 🧪 Regression Coverage

- Added base PHPUnit feature suite for auth, todos, and notes.
- Configured Pest for experimental unit coverage and set up GitHub Actions smoke checks.

See the [README Quick Start](../../README.md#quick-start) for setup instructions and seeded demo credentials.
