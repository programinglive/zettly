---
title: Zettly Product Requirements Document (PRD)
author: Platform Team
last_updated: 2025-10-31
status: Draft
---

## 1. Executive Summary
Zettly is an integrated productivity platform for managing todos, notes, drawings, and knowledge artifacts with real-time collaboration. It merges Eisenhower prioritization, Kanban workflows, Algolia-powered search, TLDraw sketching, and push notifications into a single workspace. The most recent enhancement adds a super administrator System Monitor that surfaces operational diagnostics from within the app.

## 2. Problem Statement
Knowledge workers rely on fragmented toolchains for tasks, documentation, and visual planning, creating silos and delaying execution. Support teams similarly lack centralized operational visibility once the product is deployed. Zettly solves both challenges by unifying productivity flows and by empowering super administrators with runtime diagnostics.

## 3. Goals & Success Metrics
| Goal | Metric | Target |
| --- | --- | --- |
| Increase daily engagement | Daily active users (DAU) | +20% QoQ |
| Accelerate task throughput | Average time-to-complete todos | -15% |
| Improve operational visibility | System Monitor opened after deployments | 100% of releases |
| Reduce incident detection time | Time from failure to detection | < 5 minutes |

## 4. User Personas
- **Individual Contributor (IC):** Plans personal work and tracks tasks, notes, and sketches.
- **Team Lead:** Oversees priorities, coordinates dependencies, and reviews dashboards.
- **Knowledge Manager:** Curates reusable notes, tags, and attachments; depends on search fidelity.
- **Super Administrator / Support Engineer:** Monitors system health, validates integrations, and responds to incidents.

## 5. Product Scope
### 5.1 In Scope
- Todo and note management (CRUD, prioritization, Eisenhower matrix, Kanban, archiving).
- Tag management with color coding, restore, search.
- Drawing workspace with TLDraw autosave, gallery thumbnails, WebSocket sync.
- Attachments (upload, preview, download, delete) and checklist items.
- Global search via Algolia indexes for todos, notes, tags.
- Push notifications, broadcasting, and Gemini chat demo.
- Super administrator role management and System Monitor diagnostics.

### 5.2 Out of Scope (for current release)
- External calendar sync and time tracking.
- Automated alerting integrations (Slack/email).
- Native mobile applications (responsive web/PWA only).

## 6. Feature Breakdown
### 6.1 Task & Note Management
- Rich-text editor with sanitized HTML output.
- Priorities (urgent/not urgent) and importance classification surfaced in Eisenhower matrix.
- Tag filters, completion toggles, archival/restoration flows.
- Linked todos, checklist items, attachments, due dates.

### 6.2 Tag Management
- CRUD operations with color picker UI and soft-delete restore.
- API endpoints for search and association with todos.

### 6.3 Drawing Workspace
- TLDraw-powered canvas per user.
- Autosave with debounced persistence.
- Thumbnail generation for gallery cards.
- Real-time synchronization via broadcasting channels.

### 6.4 Search & Discovery
- Navbar search hitting Algolia multiple indexes with debounced client queries.
- Clear messaging when configuration incomplete.

### 6.5 Integrations & Notifications
- Push subscription endpoints (store, destroy, test send).
- Broadcasting configuration (Pusher-compatible) for live updates.
- Gemini chat endpoints handling timeout errors.

### 6.6 Super Administrator System Monitoring
- `UserRole` enum with `user` and `super_admin` values.
- Migration adds `role` column defaulting to `user`, with casting and helpers (`assignRole`, `scopeSuperAdmins`).
- Middleware alias `super-admin` enforcing access to `/admin` routes.
- System Monitor (`/admin/system-monitor`) includes:
  - WebSocket connection state.
  - Pusher key/cluster presence (masked output).
  - Authentication diagnostic showing signed-in user.
  - Algolia configuration status.
  - Environment summary (env, URL, debug flag).
  - Server health check via `/system-status` and broadcast endpoints.
  - Manual refresh with inline display option for reuse.
- App layout surfaces admin navigation link only for super admins.
- Seed data promotes `john@example.com` to super admin for development/staging.

## 7. Functional Requirements
1. Users can create, edit, prioritize, archive, and delete todos and notes.
2. Attachments, tags, relationships, and checklist items persist across reloads.
3. Drawings autosave, display thumbnails, and sync across sessions.
4. Global search operates when Algolia credentials are present and degrades gracefully when missing.
5. Push notifications allow subscription creation/removal and test broadcasts.
6. Gemini chat endpoint returns sensible errors on timeouts.
7. Super admin middleware returns 403 for unauthorized users.
8. System Monitor widget supports forced enable mode and inline rendering.
9. Registration flow assigns new accounts the default `user` role.
10. Role changes performed via helper without direct DB access.

## 8. Non-Functional Requirements
- **Security:** Role-based access control, CSRF compliance, masked diagnostics, hashed passwords.
- **Performance:** Vite bundling, hydration via Inertia, caching defaults, pagination for resource-heavy pages.
- **Reliability:** WebSocket reconnection handling, debounced autosave, queue listeners for broadcasts.
- **Scalability:** Algolia indexing, configurable broadcasting cluster, background queues.
- **Compliance:** Sanitized rich text, secure attachment handling, audit-friendly logging.

## 9. Technical Architecture
- **Backend:** Laravel 12, Sanctum authentication, observers for search indexing, broadcasting with Pusher-compatible drivers.
- **Frontend:** React + Inertia, TailwindCSS, shadcn/ui components, TLDraw integration, Vite build pipeline.
- **Data Model:** Users (with `role`), Todos, Tags, Attachments, Drawings, Todo relationships, Push subscriptions.
- **Infrastructure:** Environment-configurable services (Algolia, Pusher, Gemini, Sentry), optional S3-compatible storage.

## 10. Dependencies & Integrations
- Algolia Application ID/Search key.
- Pusher credentials or alternative broadcaster.
- Sentry DSN for error tracking (optional but recommended).
- Gemini API key for AI features (optional).
- Service Worker for PWA support.

## 11. Rollout Plan
1. Implement feature branches and run unit/integration tests.
2. Deploy to staging, run `php artisan migrate`, promote staging admin via `assignRole` helper, validate System Monitor.
3. Production deployment:
   - Backup database.
   - Deploy code and run migrations.
   - Promote designated super admin(s) (`php artisan tinker` → `assignRole`).
   - Smoke test `/admin/system-monitor`, dashboard, search, drawings.
4. Share updated README instructions and runbook with support team.
5. Monitor logs and System Monitor page for post-deploy validation.

## 12. Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Misconfigured Algolia or Pusher | Search or realtime outages | Diagnostics highlight missing keys; README runbook |
| Unauthorized admin access | Data exposure | Middleware + least-privilege role assignments |
| WebSocket failures | Degraded realtime UX | System Monitor exposes status; fallback to manual refresh |
| Autosave conflicts | Lost drawing updates | Debounce writes; TLDraw state merging |
| Large file uploads | Storage strain | Enforce limits; use S3 lifecycle policies |

## 13. Metrics & Analytics
- Page views for `/dashboard`, `/todos`, `/admin/system-monitor`.
- Count of push notification subscriptions.
- System Monitor refresh events for operational audit.
- Latency metrics for Algolia queries and broadcast events.

## 14. Compliance & Security
- Enforce HTTPS for all public endpoints and broadcasting.
- Sanitize user-generated HTML and store hashed passwords.
- Log access to admin routes for auditing.
- Provide runbook for role promotion/demotion.

## 15. Future Enhancements
- Automated alerting (Slack/email) triggered by diagnostics thresholds.
- Multi-tenant or team-level roles beyond super admin.
- Calendar integration for due date sync.
- Collaborative drawing cursors with presence indicators.
- Advanced analytics dashboards and OKR tracking.

## 16. Appendices
- **Runbook:** `php artisan tinker` → `\App\Models\User::where('email', 'admin@example.com')->first()?->assignRole(\App\Enums\UserRole::SUPER_ADMIN);`
- **Testing:** PHPUnit coverage across dashboard, todos, tags, system monitor (`SystemMonitorTest`, updated `RegistrationTest` for role defaults).
- **Supporting Docs:** README.md (setup & admin instructions), API_DOCUMENTATION.md (REST endpoints), CHANGELOG.md (release history), CSRF_TESTING.md (form submission guidelines).
