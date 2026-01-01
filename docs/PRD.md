---
title: Zettly Product Requirements Document (PRD)
author: Platform Team
last_updated: 2026-01-01
status: Draft
---

## 1. Executive Summary
Zettly is an integrated productivity platform for managing todos, notes, drawings, habits, and knowledge artifacts with real-time collaboration. It merges Eisenhower prioritization, Kanban workflows, Algolia-powered search, TLDraw sketching, habit tracking, and push notifications into a single workspace. The most recent major enhancements introduce **Organizations** and a **Habit Tracker** — enabling teams to create shared workspaces where members can collaboratively view and manage todos, notes, drawings, tags, and recurring habit commitments. Combined with the super administrator System Monitor, Zettly now supports both individual and team-based productivity workflows.

**CRITICAL DESIGN REQUIREMENT**: Zettly implements a strict two-color design system using ONLY black, white, and gray colors throughout the entire application. This monochromatic approach ensures visual consistency, reduces cognitive load, and creates a clean, professional interface.

## 2. Problem Statement
Knowledge workers rely on fragmented toolchains for tasks, documentation, and visual planning, creating silos and delaying execution. Teams struggle to share and collaborate on work artifacts without context switching between tools. Support teams similarly lack centralized operational visibility once the product is deployed. Zettly solves these challenges by unifying productivity flows, enabling team collaboration through organizations, and empowering super administrators with runtime diagnostics.

## 3. Goals & Success Metrics
| Goal | Metric | Target |
| --- | --- | --- |
| Increase daily engagement | Daily active users (DAU) | +20% QoQ |
| Accelerate task throughput | Average time-to-complete todos | -15% |
| Improve operational visibility | System Monitor opened after deployments | 100% of releases |
| Reduce incident detection time | Time from failure to detection | < 5 minutes |

## 4. User Personas
- **Individual Contributor (IC):** Plans personal work and tracks tasks, notes, and sketches. Can create and join organizations for team collaboration.
- **Team Lead / Organization Admin:** Creates organizations, invites team members, oversees shared priorities, coordinates dependencies, and reviews dashboards.
- **Organization Member:** Collaborates within organizations, viewing and managing shared todos, notes, drawings, habits, and tags with team members.
- **Knowledge Manager:** Curates reusable notes, tags, and attachments; depends on search fidelity; can share knowledge across organizations.
- **Super Administrator / Support Engineer:** Monitors system health, validates integrations, responds to incidents, and manages platform-wide settings.

## 5. Product Scope
### 5.1 In Scope
- Todo and note management (CRUD, prioritization, dedicated Board view with Eisenhower/Kanban support).
- Tag management with color coding, restore, search.
- Drawing workspace with TLDraw autosave, gallery thumbnails, WebSocket sync.
- Attachments (upload, preview, download, delete) and checklist items.
- Global search via Algolia indexes for todos, notes, tags, habits.
- Push notifications, broadcasting, and Gemini chat demo.
- Super administrator role management and System Monitor diagnostics.
- **Organizations:** Create, manage, and invite members to shared workspaces.
- **Organization Membership:** Admin and member roles with permission-based access.
- **Shared Resources:** Todos, notes, drawings, habits, and tags scoped to organizations.
- **Organization Switching:** Users can switch between personal and organization workspaces.

### 5.2 Out of Scope (for current release)
- External calendar sync and time tracking.
- Automated alerting integrations (Slack/email).
- Native mobile applications (responsive web/PWA only).
- Advanced permission models (e.g., read-only, editor roles).
- **Colored UI elements**: Any use of colors outside the black/white/gray palette is strictly prohibited.

## 5.3 Design System Requirements

### 5.3.1 Two-Color Mode Specification
**MANDATORY**: All UI components must adhere to a strict two-color design system:

**Allowed Colors:**
- Black (`#000000`)
- White (`#FFFFFF`) 
- Gray scale (`gray-50` through `gray-900`)

**Prohibited Colors:**
- Red, blue, green, yellow, orange, purple, pink, or any other colors
- No colored status indicators, badges, or alerts
- No colored buttons or interactive elements
- No colored backgrounds beyond gray variations

**Implementation Standards:**
- **Primary Actions**: `bg-gray-800 hover:bg-gray-900 text-white`
- **Secondary Actions**: `bg-gray-600 hover:bg-gray-700 text-white`
- **Outline Actions**: `border-gray-300 text-gray-600 hover:bg-gray-100`
- **Error States**: `bg-gray-200 text-gray-900 border-gray-300` (no red)
- **Success States**: `bg-gray-700 text-white` (no green)
- **Warning States**: `bg-gray-300 text-gray-900` (no yellow)

**AI Development Guidelines:**
- All AI assistants and developers must strictly follow this two-color system
- No exceptions for colored icons, buttons, or status indicators
- When in doubt, use gray variations instead of colors
- This requirement supersedes any standard UI conventions that use colors

## 6. Feature Breakdown
### 6.1 Task & Note Management
- Rich-text editor with sanitized HTML output.
- Priorities (urgent/not urgent) and importance classification surfaced in the dedicated Todo Board.
- Tag filters, completion toggles, archival/restoration flows.
- **Dedicated Todo Board** (`/todos/board`) supporting both Eisenhower Matrix and Kanban views (user-selectable preference).
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
- Email notification checklist:
  - [x] User registration verification email
  - [x] Password reset email
  - [x] Todo creation notification (queued)
  - [x] Todo update notification (queued)
- Registered event now uses the framework verification listener plus our queued welcome email listener so every new user gets both messages. See the detailed email checklist in [EMAILS.md](./EMAILS.md).
- Log viewer UI is restricted to the owner account (`mahatma.mahardhika@programinglive.com`).

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

### 6.7 Organizations & Team Collaboration
- **Organization Creation:** Users can create organizations with name, slug, description, and optional logo.
- **Organization Membership:** Admin and member roles; admins can invite/remove members.
- **Shared Workspace:** All todos, notes, drawings, habits, and tags created within an organization are visible to members.
- **Scoped Resources:** Todos, notes, drawings, habits, and tags can be personal (user-scoped) or organizational (org-scoped).
- **Organization Switching:** UI allows users to switch between personal workspace and joined organizations.
- **Invitation Flow:** Admins can invite users by email; invitees receive notifications and can accept/decline.
- **Member Management:** Admins can view members, change roles, and remove members from organizations.

### 6.8 Habit Tracking
- **Habit Creation & Metadata:** Users (or organizations) can create habits with title, description, monochromatic icon/color, target frequency, and cadence (daily/weekly/monthly). Habits default to personal scope but can optionally belong to an organization.
- **Completion Logging:** Web UI toggles allow members to record completions per day. Each log stores date, count, notes, and references the owning habit.
- **Progress Insights:** Dashboard widgets show today's progress, 30-day completion rate, and streak indicators (current/longest). Aggregate stats come from the new `habit_entries` and `habit_streaks` tables.
- **Permissions:** Personal habits are visible to the owner only. Organization habits appear to any authenticated member of that organization via the `habits.accessibleBy` scope.
- **Navigation & UX:** A dedicated Habits section lives in the dashboard navigation alongside Todos/Draw. Habit pages follow the two-color UI system and support create/edit/detail flows consistent with shadcn/ui patterns.

## 7. Functional Requirements
1. Users can create, edit, prioritize, archive, and delete todos and notes (personal or organizational).
2. Attachments, tags, relationships, and checklist items persist across reloads.
3. Drawings autosave, display thumbnails, and sync across sessions (personal or organizational).
4. Global search operates when Algolia credentials are present and degrades gracefully when missing.
5. Push notifications allow subscription creation/removal and test broadcasts.
6. Gemini chat endpoint returns sensible errors on timeouts.
7. Super admin middleware returns 403 for unauthorized users.
8. System Monitor widget supports forced enable mode and inline rendering.
9. Registration flow assigns new accounts the default `user` role.
10. Role changes performed via helper without direct DB access.
11. Users can create organizations and invite other users as members.
12. Organization admins can manage members, change roles, and remove members.
13. All organization members can view and manage shared todos, notes, drawings, habits, and tags.
14. Users can switch between personal workspace and organization workspaces via UI selector.
15. Organization resources are scoped and only visible to organization members.
16. Users can create, edit, archive, and delete habits (personal or organizational) with frequency targets and monochrome icon/color options.
17. Users can log daily/weekly/monthly completions, see streaks, and review historical entries for each habit.

## 8. Non-Functional Requirements
- **Security:** Role-based access control, CSRF compliance with cookie-based token handling via Axios, masked diagnostics, hashed passwords.
- **Performance:** Vite bundling, hydration via Inertia, caching defaults, pagination for resource-heavy pages.
- **Reliability:** WebSocket reconnection handling, debounced autosave, queue listeners for broadcasts.
- **Scalability:** Algolia indexing, configurable broadcasting cluster, background queues.
- **Compliance:** Sanitized rich text, secure attachment handling, audit-friendly logging.

## 9. Technical Architecture
- **Backend:** Laravel 12, Sanctum authentication, observers for search indexing, broadcasting with Pusher-compatible drivers.
- **Frontend:** React + Inertia, TailwindCSS, shadcn/ui components, TLDraw integration, Vite build pipeline.
- **Data Model:** Users (with `role`), Organizations, OrganizationMembers, Todos (scoped), Tags (scoped), Attachments, Drawings (scoped), Todo relationships, Push subscriptions.
- **Infrastructure:** Environment-configurable services (Algolia, Pusher, Gemini, Sentry), optional S3-compatible storage.
- **Authorization:** Middleware to enforce organization membership and role-based access for scoped resources.

## 10. Dependencies & Integrations
- Algolia Application ID/Search key.
- Pusher credentials or alternative broadcaster.
- Sentry DSN for error tracking (optional but recommended).
- Gemini API key for AI features (optional).
- Service Worker for PWA support.

## 11. Rollout Plan
1. Implement feature branches and run unit/integration tests (including organization CRUD and membership).
2. Deploy to staging, run `php artisan migrate`, promote staging admin via `assignRole` helper, validate System Monitor and organization features.
3. Production deployment:
   - Backup database.
   - Deploy code and run migrations (creates organizations, organization_members tables; adds organization_id columns).
   - Promote designated super admin(s) (`php artisan tinker` → `assignRole`).
   - Smoke test `/admin/system-monitor`, dashboard, search, drawings, and organization creation/management.
4. Share updated README instructions and runbook with support team (including organization setup and invitation flow).
5. Monitor logs and System Monitor page for post-deploy validation.
6. Announce organization feature to users via in-app notification and email.

## 12. Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Misconfigured Algolia or Pusher | Search or realtime outages | Diagnostics highlight missing keys; README runbook |
| Unauthorized admin access | Data exposure | Middleware + least-privilege role assignments |
| WebSocket failures | Degraded realtime UX | System Monitor exposes status; fallback to manual refresh |
| Autosave conflicts | Lost drawing updates | Debounce writes; TLDraw state merging |
| Large file uploads | Storage strain | Enforce limits; use S3 lifecycle policies |
| Accidental data sharing | Privacy breach | Organization membership validation; audit logging |
| Invitation spam | User experience degradation | Rate limiting; invitation acceptance flow |
| Organization deletion | Data loss | Soft deletes; admin confirmation required |

## 13. Metrics & Analytics
- Page views for `/dashboard`, `/todos`, `/admin/system-monitor`, `/organizations`.
- Count of organizations created and active members per organization.
- Count of push notification subscriptions.
- System Monitor refresh events for operational audit.
- Latency metrics for Algolia queries and broadcast events.
- Organization invitation acceptance rate and member retention.

## 14. Compliance & Security
- Enforce HTTPS for all public endpoints and broadcasting.
- Sanitize user-generated HTML and store hashed passwords.
- Log access to admin routes and organization membership changes for auditing.
- Provide runbook for role promotion/demotion and organization management.
- Validate organization membership before granting access to scoped resources.
- Implement rate limiting on invitation endpoints to prevent spam.

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
