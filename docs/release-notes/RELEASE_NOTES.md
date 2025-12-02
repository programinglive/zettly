# Zettly Release Notes (Compact)

Centralized history of notable changes, fixes, and enhancements to the Zettly platform. See [Full Release Notes](RELEASE_NOTES_FULL.md) for detailed per-version documentation.

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 0.11.3 | 2025-12-02 | make husky installation optional in production (78f27cc) |
| 0.11.2 | 2025-12-02 | add database sync command for production to local sync (29fb811) |
| 0.11.1 | 2025-12-02 | cleanup project structure and update dependencies (85858e5) |
| 0.10.21 | 2025-11-27 | **feat:** Focus edit functionality and history auto-update |
| 0.10.20 | 2025-11-26 | **fix:** CSRF token mismatch - Refactored to use Axios with cookie-based CSRF protection |
| 0.10.19 | 2025-11-22 | **deps-dev:** bump js-yaml from 4.1.0 to 4.1.1 (754d0f7) |





## 0.11.3 – 🐛 Bug Fixes

Released on **2025-12-02**.

- make husky installation optional in production (78f27cc)
- move @headlessui/react to dependencies (9b634ca)
- move axios, laravel-echo, pusher-js to dependencies (36d19a2)
- move build dependencies to production dependencies (db0f1d1)
- move vite-plugin-pwa to dependencies (d915487)

## 0.11.2 – ✨ Features

Released on **2025-12-02**.

- add database sync command for production to local sync (29fb811)

## 0.11.1 – 🧹 Chores

Released on **2025-12-02**.

- cleanup project structure and update dependencies (85858e5)
- consolidate release notes and update for v0.10.19 (2561015)
- csrf token mismatch - refactor to use axios with cookie-based csrf protection (aa6b2c8)
- php 8+ parameter order warning in ResilientDatabaseStore (0e5f2be)
- add focus edit functionality and fix history auto-update (506ad55)

## 0.10.21 – ✨ Focus Feature Enhancement

Released on **2025-11-27**.

### Added
- **Focus Edit Functionality**: Users can now edit active focus title and description
  - New blue "Edit" button in focus greeting card
  - Edit dialog with pre-filled current values
  - PUT `/focus/{focus}` endpoint for updates
  - Validation prevents editing completed focuses
  - Authorization ensures users can only edit their own focuses
  - Comprehensive test coverage (5 new tests)

### Fixed
- **Focus History Auto-Update**: Completed focuses now appear immediately in recent history
  - No longer requires page reload to see completed focus
  - History date filter automatically set to today when completing
  - Status events update correctly from backend response

### Technical Details
- Added `FocusController::update()` method with validation and authorization
- Added `PUT /focus/{focus}` route
- Updated `FocusGreeting.jsx` with edit state management and dialog
- Added Edit icon from lucide-react
- Tests: `test_user_can_update_focus`, `test_user_can_update_focus_title_only`, `test_user_cannot_update_focus_without_title`, `test_user_cannot_update_completed_focus`, `test_user_cannot_update_other_users_focus`
- Updated documentation: FOCUS_FEATURE.md, PRD.md


## 0.10.20 – 🔒 Security Fix

Released on **2025-11-26**.

### Fixed
- **CSRF Token Mismatch**: Refactored frontend to use Axios with cookie-based CSRF protection
  - Updated `bootstrap.js` to remove manual `X-CSRF-TOKEN` header setting
  - Modified `csrf.js` to prioritize `XSRF-TOKEN` cookie over meta tags and Inertia props
  - Refactored components to use Axios instead of fetch:
    - `KanbanBoard.jsx` - Reordering functionality
    - `FocusGreeting.jsx` - All CRUD operations
    - `EisenhowerMatrix.jsx` - Reordering functionality
    - `AttachmentList.jsx` - Delete operations
    - `WebSocketTest.jsx` - Auth tests
    - `PusherTest.jsx` - Broadcast tests
  - Removed obsolete `parseJsonSafely` function from `FocusGreeting.jsx`
  - Updated all static analysis tests to verify Axios usage
  - Resolved stale token issues that occurred with multiple tabs or session rotation

### Technical Details
- Axios automatically handles the `XSRF-TOKEN` cookie and sends it as `X-XSRF-TOKEN` header
- This eliminates the need for manual CSRF token management in components
- Prevents "CSRF token mismatch" errors caused by stale meta tags

## 0.10.19 – 🧹 Chores

Released on **2025-11-22**.

- **deps-dev:** bump js-yaml from 4.1.0 to 4.1.1 (754d0f7)
- **deps:** bump glob from 10.4.5 to 10.5.0 (7071d22)
- **deps:** bump symfony/http-foundation from 7.3.5 to 7.3.7 (6811092)
- save current work before fixing csrf issues (3a96610)
- resolve csrf token mismatch and add regression tests (4dc4a32)
- update release scripts to support ESM (7652b20)

## Recent Releases (Compact Summary)

### v0.10.x

- **v0.10.18** (2025-11-09) — Release notes refactoring with detailed feature documentation. [See feature](features/release-notes-refactoring.md)
- **v0.10.17** (2025-11-09) — Patch maintenance after database resiliency hardening. [See feature](features/database-resiliency.md)
- **v0.10.16** (2025-11-09) — Database resiliency with PDO timeouts and cache fallbacks. [See feature](features/database-resiliency.md)
- **v0.10.15** (2025-11-09) — Profile workspace preference CSRF token refresh. [See feature](features/workspace-switcher.md)
- **v0.10.14** (2025-11-08) — Drawing notifications and email queuing.
- **v0.10.13** (2025-11-08) — Dashboard verification reminder and broadcast payload trimming.
- **v0.10.12** (2025-11-08) — Todo deletion CSRF fix.
- **v0.10.11** (2025-11-08) — Post-logout CSRF token refresh.
- **v0.10.10** (2025-11-08) — Duplicate verification email prevention.
- **v0.10.9** (2025-11-08) — Welcome email automation and log viewer restrictions.
- **v0.10.8** (2025-11-08) — Password reset and drawing payload hardening.
- **v0.10.7** (2025-11-08) — Todo update emails and org test cleanup.
- **v0.10.6** (2025-11-08) — Todo creation emails.
- **v0.10.5** (2025-11-08) — Broadcast and email safeguards.
- **v0.10.4** (2025-11-07) — SMTP configuration hardening.
- **v0.10.3** (2025-11-07) — Organization invite CSRF fix. [See feature](features/organization-management.md)
- **v0.10.2** (2025-11-07) — Case-sensitive import fixes. [See feature](features/organization-management.md)
- **v0.10.1** (2025-11-07) — Shadcn component replacement. [See feature](features/organization-management.md)
- **v0.10.0** (2025-11-07) — Organization CRUD and member management. [See feature](features/organization-management.md)

### v0.9.x Series
- **v0.9.2** (2025-11-05) — Focus history filtering. [See feature](features/focus-mode.md)
- **v0.9.1** (2025-11-05) — Focus history wrapping fix. [See feature](features/focus-mode.md)
- **v0.9.0** (2025-11-05) — Kanban drag ordering fix. [See feature](features/kanban-workspace.md)

### v0.8.x Series
- **v0.8.20** (2025-11-05) — Eisenhower reorder JSON responses. [See feature](features/eisenhower-matrix.md)
- **v0.8.13** (2025-11-05) — Kanban success handling. [See feature](features/kanban-workspace.md)
- **v0.8.12** (2025-11-05) — Kanban/Eisenhower JSON responses. [See feature](features/kanban-workspace.md)
- **v0.8.11** (2025-11-05) — Eisenhower CSRF fix. [See feature](features/eisenhower-matrix.md)
- **v0.8.9** (2025-11-04) — Focus and drawing demo data. [See feature](features/focus-mode.md)
- **v0.8.0** (2025-11-04) — Focus mode launch. [See feature](features/focus-mode.md)

### v0.7.x Series
- **v0.7.13** (2025-11-02) — Navbar search improvements.
- **v0.7.7** (2025-11-01) — Email test console.
- **v0.7.6** (2025-11-03) — Context panel tag order and due date fixes.
- **v0.7.0** (2025-10-22) — Eisenhower Matrix and Kanban workspaces. [See features](features/eisenhower-matrix.md) | [Kanban](features/kanban-workspace.md)

### v0.6.x Series
- **v0.6.10** (2025-10-21) — Sentry performance instrumentation.
- **v0.6.0** (2025-10-20) — Sentry error reporting and queue workers.

### v0.5.x Series
- **v0.5.62** (2025-10-19) — Realtime drawing sync.
- **v0.5.1** (2025-10-19) — GCS upload optimization.

### v0.4.x Series
- **v0.4.28** (2025-10-18) — Personalized focus digests. [See feature](features/focus-mode.md)
- **v0.4.5** (2025-10-18) — Workspace switcher. [See feature](features/workspace-switcher.md)
- **v0.4.0** (2025-10-18) — Workspaces launch. [See feature](features/workspace-switcher.md)

### v0.3.x Series
- **v0.3.35** (2025-10-17) — Tag management.
- **v0.3.0** (2025-10-17) — Core features.

### v0.2.x Series
- **v0.2.16** (2025-10-16) — Polish and refinements.
- **v0.2.0** (2025-10-16) — Second major release.

### v0.1.x Series
- **v0.1.22** (2025-10-15) — Final v0.1 patch.
- **v0.1.0** (2025-10-15) — First major release.

### v0.0.x Series
- **v0.0.5** (2025-10-14) — Early patch.
- **v0.0.1** (2025-10-14) — Initial release.

---

**For detailed release notes per version, see the [Full Release Notes](RELEASE_NOTES_FULL.md) file.**
