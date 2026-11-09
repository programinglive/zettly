# Zettly Application

[![Latest release](https://img.shields.io/github/v/release/programinglive/zettly?logo=github&style=flat&color=F97316)](https://github.com/programinglive/zettly/releases)
[![Open issues](https://img.shields.io/github/issues/programinglive/zettly?style=flat&color=EF4444)](https://github.com/programinglive/zettly/issues)
[![Open pull requests](https://img.shields.io/github/issues-pr/programinglive/zettly?style=flat&color=0EA5E9)](https://github.com/programinglive/zettly/pulls)
[![License: MIT](https://img.shields.io/github/license/programinglive/zettly?style=flat&color=6366F1)](./LICENSE)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-22C55E.svg)](./CONTRIBUTING.md)

Zettly is a productivity workspace for tasks, focus sessions, notes, habits, shared organizations, knowledge graphs, and drawings. It is built with Laravel 12, React, Inertia.js, and Tailwind CSS.

## Design System

The application uses a mostly monochrome interface with black, white, and gray as its base palette. Feature-specific accents remain available where they carry meaning, including priority quadrants and user-configurable habit colors. Follow the shared gray-based component styles while preserving those purposeful indicators.

## Release Notes

Detailed historical changes live in [docs/release-notes/RELEASE_NOTES.md](./docs/release-notes/RELEASE_NOTES.md) and on the [GitHub releases page](https://github.com/programinglive/zettly/releases).

## Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/programinglive/zettly.git
   cd zettly
   ```

2. **Install dependencies**
   ```bash
   composer install && npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Database setup**
   ```bash
   # Configure your database in .env
   php artisan migrate
   php artisan db:seed
   ```
   `DatabaseSeeder` creates development users and sample workspace data. Use it only with a disposable development database. Inspect `database/seeders/UserSeeder.php` before seeding any shared or production database because it creates or promotes a privileged account.

5. **Administration & Monitoring**
   - Super administrators can visit `/admin/system-monitor` to inspect application and WebSocket health.
   - Do not use development seed accounts in a shared or production environment.

6. **Start development server**
   ```bash
   composer run dev
   ```

### Windows Development Setup

For Windows users, the development environment is configured to work without the `pcntl` extension (which is Unix/Linux only):

- **PHP Configuration**: The `pcntl` extension is disabled in `php.ini` to avoid startup warnings
- **Mail System**: Uses log driver (`MAIL_MAILER=log`) for development - emails are logged instead of sent
- **Composer Scripts**: `composer run dev` starts Laravel server, queue worker, and Vite frontend

If you encounter mail job failures, clear the queue:
```bash
php artisan queue:clear
php artisan config:clear
```

### Tests

- **PHPUnit**
  ```bash
  php artisan test
  ```
- **Frontend regression suites** (Node test runner)
  ```bash
  npm run test:js
  ```
  The frontend suite is run by the `test:js` script in `package.json`; it includes regression coverage for drawing synchronization, editor styles, and other UI behavior.

### API Documentation

The API endpoints and authentication examples are documented in [docs/reference/API_DOCUMENTATION.md](./docs/reference/API_DOCUMENTATION.md).

### Journal reports

The application ships two scheduled console commands for journal report generation and delivery:

- `journal:generate-reports` — enqueues report-generation jobs for every user with at least one enabled report channel.
- `journal:deliver-reports` — enqueues delivery jobs for pending `report_deliveries` rows.

These are scheduled from `routes/console.php`:

- Daily at 23:55 WIB (`Asia/Jakarta`) for report generation.
- Every 15 minutes for delivery.

#### Browsing reports in the app

Signed-in users open the **Reports** workspace in the sidebar (`/reports`) to
review the generated daily, weekly, monthly, and yearly recaps:

- `GET /reports` — digest-first list: cards carry the report's human summary
  line, grouped by month (newest month expanded) and paginated 30 at a time
  with a "Show older reports" action. Includes a period-kind filter, the
  configured delivery-channel status, and a **Generate now** action that
  (re)generates today's daily report and queues its delivery.
- `GET /reports/view/{id}` — full report detail: the summary block stays
  visible at the top, the per-project drill-down sits behind a collapsed
  "Full details" toggle. Rendered client-side by a dependency-free parser
  (`resources/js/lib/reportParser.js`) that only understands the fixed
  markdown shape `ReportGenerator` emits.

Every report now starts with a short human "## Summary" paragraph (2–4
templated sentences, deterministic, no LLM) placed after the headline metric
bullets. That placement keeps the fixed machine format intact for the CLI
formatter, the redacted legacy page, and Discord's structured embed — while
the human recap leads both the in-app digest and the Discord chat summary.

The legacy `GET /reports/{id}` (a redacted, noindex HTML page) remains as the
private report link embedded in notification payloads; the in-app detail page
deliberately lives under `/reports/view` so the two do not collide.

The API routes under `/api/v1/reports*` remain available to the CLI/MCP
integrations; the web routes above are the in-app browsing layer.

For the scheduler to actually fire, the host must run `php artisan schedule:run` every minute (standard Laravel cron entry):

```
* * * * * cd /path-to-zettly && php artisan schedule:run >> /dev/null 2>&1
```

And a queue worker must be running for the delivery jobs to execute under the `database` queue driver:

```
php artisan queue:work --tries=3
```

#### Catch-up for missed nights

The nightly job writes only the period that closes tonight, but also performs a
write-only **catch-up** of any periods that closed on nights the host missed
(e.g. the VM was down or the scheduler did not run). Missed daily, weekly,
monthly, and yearly reports are generated directly in the database from the day
after the last stored report (or from the first recorded activity when no
reports exist yet). Their delivery rows are intentionally **not** queued, so a
long gap can never flood the chat channel with stale messages — the owner can
read them in the Reports workspace instead. Only the period closing on the
current night reaches the delivery queue. An explicit `--backfill` with
`--deliver` still opts into pushing the full history.

## Features

### Core Functionality
- ✅ **Tasks and priorities** — Create, edit, complete, archive, and sort todos by priority.
- ✅ **Focus workspace** — Keep the current daily focus and important notifications visible.
- ✅ **Eisenhower and Kanban boards** — Plan by urgency/importance or manage work in sortable drag-and-drop columns.
- ✅ **Tags and relationships** — Organize tasks with tags and link related todos.
- ✅ **Zettelkasten tag axes** — Every todo, drawing and journal entry carries tags on four axes (`proyek`, `tipe`, `area`, `sumber`), shown as chips and filterable per axis, so a record can be reached from its codebase, its kind of work, its subsystem or its source. See `docs/zettelkasten-tags.md`.
- ✅ **Notes and rich text** — Capture notes separately from actionable tasks and write formatted descriptions with full Markdown support (headings, bold, lists, code blocks, and line breaks) cleanly rendered in the Zettly web UI.
- ✅ **Attachments and checklists** — Add files and structured checklist items to tasks.
- ✅ **Habit tracker** — Set recurring goals, record completions, and review streaks.
- ✅ **Organizations** — Create shared workspaces, invite members, and organize workspace data.
- ✅ **Knowledge graph** — Explore relationships between todos in the graph workspace.
- ✅ **Draw workspace** — Create multiple TLDraw sketches with autosave and live synchronization.
- ✅ **Web Push and PWA** — Subscribe to push notifications and install the app on supported devices.

### Web Push and PWA Installation

Zettly provides Progressive Web App (PWA) capabilities with service worker caching and install prompts:
- **Dismissal persistence** — When a user installs the application or clicks "Maybe later", dismissal state is safely persisted in `localStorage` (`zettly-pwa-install-dismissed`). The banner also checks `window.matchMedia('(display-mode: standalone)')`, listens to native `window.addEventListener('appinstalled')`, and queries `navigator.getInstalledRelatedApps()` to eliminate repeat nagging.
- **Offline service worker caching** — A network-first caching strategy in `sw.js` caches static app assets and navigation shells under `zettly-cache-v1` while strictly bypassing mutation endpoints and APIs (`/api/*`, `/sanctum/*`), allowing the app to open reliably when offline.
- **Unified manifest routing** — All standard manifest endpoints (`/site.webmanifest`, `/manifest.webmanifest`, and `/manifest.json`) are served with matching standalone display mode, orientation, branding colors (`#3b82f6`), and maskable icon sets.
- **Atomic asset builds** — Production frontend assets and service workers (`sw.js`) are built atomically via `scripts/build-assets.sh` into `public/build.next` before swapping to `public/build`, ensuring the Vite manifest and SW precache are always consistently available.

### Drawing Workspace

The `/draw` experience introduces a multi-document sketching surface powered by TLDraw. Key capabilities:

- **Multiple drawings per user** with lazy loading and caching for fast context switches.
- **Autosave every keystroke** – snapshots queue up and debounce writes to the server, with persisted metadata stored in the new `drawings` table.
- **Cross-session continuity** – drawings are restored on demand, including title edits, undo history, and last-saved status.
- **Live updates** – changes are synchronized in real-time across multiple tabs/devices using WebSockets.
- **Robust migration & seeding** – run `php artisan migrate` after updating to create the supporting schema; no seed data is required.

### Knowledge Graph Synchronization Resilience

Task and note relationships are asynchronously synced to the graph microservice via `App\Jobs\SyncGraphEvent`:

- **Graceful degradation** — If the graph microservice (`http://localhost:3001` or configured `GRAPH_SERVICE_URL`) is unreachable, the queue job catches `ConnectionException`, logs a warning with event details, and completes cleanly without throwing unhandled exceptions to Sentry or failing the queue worker.
- **Configurable sync** — Graph synchronization can be explicitly controlled via `services.graph.enabled` and `services.graph.url`.
- **Sentry exception suppression** — Eliminates noise from unreachable local microservices in migrated single-host topologies.

> ℹ️ **Optional TLDraw License**: Set `VITE_TLDRAW_LICENSE_KEY` in `.env` if you have a commercial key. Leaving it blank falls back to the open core features.

#### Live Updates with Laravel Reverb

Zettly uses Laravel Reverb as its WebSocket server. The browser connects through the Pusher-compatible Echo client, so frontend settings retain the `VITE_PUSHER_*` names while the server uses `REVERB_*` settings.

1. Copy the Reverb settings from `.env.example` into `.env` and set the app ID, key, secret, and public host. Keep `BROADCAST_CONNECTION=reverb`.
2. Make `VITE_PUSHER_APP_KEY`, `VITE_PUSHER_HOST`, `VITE_PUSHER_PORT`, and `VITE_PUSHER_SCHEME` match the Reverb app key and public endpoint.
3. Start the app with `composer run dev`, then start Reverb in a separate terminal:
   ```bash
   php artisan reverb:start
   ```
4. In production, expose the public Reverb endpoint through the existing HTTPS reverse proxy. Keep `REVERB_SERVER_HOST` and `REVERB_SERVER_PORT` internal.

The drawing workspace uses authenticated channels for live updates. Keep Reverb secrets in `.env` or the deployment secret store; never commit them.

## Community & Support

We strive to foster an inclusive, learner-friendly community.

- 📜 **Code of Conduct:** [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- 🛠️ **Contributing Guide:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- 🔐 **Security Policy:** [SECURITY.md](./SECURITY.md)
- 📮 **Contact:** Mahatma Mahardhika — [mahatma.mahardhika@programinglive.com](mailto:mahatma.mahardhika@programinglive.com)
- 🧾 **License:** [MIT](./LICENSE)

Pull requests are welcome! Please review the contributing guide and use the pull request template when opening a PR. For sensitive security matters, email the address above instead of posting a public issue.

## Zettly CLI

The standalone terminal client can manage Zettly through the versioned Sanctum API. It requires Node.js 18 or newer. From the repository root:

```bash
npm install --global ./cli
zettly help
```

Create a personal access token in the Zettly profile page, run `zettly auth login`, then exchange it for a CLI-only token with `zettly auth issue-token`. See [CLI installation, authentication, and command examples](./cli/README.md). The CLI's `/api/v1` server routes must be deployed before using it against production.

### Editor Credits
- Built with the [@programinglive/zettly-editor](https://github.com/programinglive/zettly-editor) package — explore the editor source and examples in that repository.

### Current integrations

- **Live updates:** Laravel Reverb, with Laravel Echo and the Pusher-compatible browser client.
- **Rich-text editing:** the `@programinglive/zettly-editor` TipTap package.
- **Error reporting:** Sentry configuration is documented in `.env.example`.
- **Push notifications:** Web Push support uses VAPID keys from the environment.
- **Drawing:** TLDraw provides the multi-document sketch workspace; its optional license key is `VITE_TLDRAW_LICENSE_KEY`.

Use `.env.example` as the source of truth for environment variable names.

### Layout & Navigation
- 🧭 **Public Marketing Layout** – The landing experience uses `PublicLayout.jsx`, a centered design with a marketing-focused navbar, internal anchors, and a theme toggle without exposing account information.
- 📊 **Authenticated App Shell** – Signed-in pages share `DashboardLayout.jsx`, which wraps the fluid-width `AppLayout.jsx` so dashboard, todos, and other tools stretch edge-to-edge while keeping account menus handy.

### Priority System
The application includes a comprehensive 4-level priority system:
- 🟢 **Low** - Nice to have tasks
- 🟡 **Medium** - Standard tasks (default)
- 🔴 **High** - Important tasks
- 🚨 **Urgent** - Critical tasks requiring immediate attention

Todos are automatically sorted by priority on all pages, ensuring urgent and high-priority items are always visible first.

## Usage

Visit the application in your browser and start managing your todos! The interface is intuitive:
- Create new todos with priority levels and tags
- Switch to note mode when you just need to jot something down—notes never require a priority and stay separate from your actionable task list
- Link related todos together
- Upload attachments on the todo show page (image preview supported)
- All destructive actions (e.g., deleting todos, tags, attachments) use a reusable confirmation modal for consistency

### Progressive Web App (PWA)

Zettly ships with an installable PWA experience so you can keep the dashboard on your home screen and continue working while offline. A service worker and manifest are bundled during `npm run build` and activated automatically in production.

#### Install (Desktop / Android)
1. Browse to your deployed Zettly instance using Chrome, Edge, or another Chromium browser over HTTPS.
2. When the in-app banner appears, click **Install app** or use the browser's menu (usually `⋮` → **Install app**).
3. The app opens in its own window and will update automatically on the next publish.

#### Install on iPhone / iPad (Safari requirement)
Apple Safari does not fire the `beforeinstallprompt` event, so the banner inside Zettly provides manual guidance instead. To complete the install:
1. Open the site in Safari (Chrome/Firefox on iOS cannot add PWAs to the home screen).
2. Tap the **Share** button (square with the ↑ arrow).
3. Choose **Add to Home Screen** and optionally rename the shortcut.
4. Tap **Add**. The Zettly icon should now appear on your home screen.

#### Tablet Support
When installed on tablets (iPad, Android tablets), Zettly automatically detects the device and uses the full screen width for an optimized experience. The app:
- Detects tablet devices via user agent (iPad/Android) or screen width ≥ 768px
- Detects PWA standalone mode via the `(display-mode: standalone)` media query
- Applies full-width layout on tablets in PWA mode
- Respects safe-area insets for notched devices (iPhone X+, modern Android devices)

See `.windsurf/docs/PWA_TABLET_FIX.md` for implementation details.

> ℹ️ **Troubleshooting**
> - Ensure you are using HTTPS (or a LAN IP while testing)  – iOS will not install PWAs from `http://localhost`.
> - Disable Private Browsing; the Add to Home Screen option is hidden there.
> - Confirm the icon loads by visiting `/apple-touch-icon.png`. If it 404s, Safari will skip the install icon.
> - If the option is missing, remove any previous shortcut created for the same domain and refresh.
> - On tablets, if the app still appears small, try uninstalling and reinstalling the PWA after clearing browser cache.

## Zettly Editor debug logging

To inspect TipTap lifecycle and toolbar state during development, the app integrates `@programinglive/zettly-editor` debug logging with a local toggle (no API key, no remote forwarding):

```tsx
<ZettlyEditor
  value={data.description || ''}
  onChange={(value) => setData('description', value)}
  debug={debugEnabled}
  onDebugEvent={handleDebugEvent}
  onDebugToggle={setDebugEnabled}
  className="zettly-editor-wrapper"
  editorClassName="min-h-[240px]"
/>
```

- `debugEnabled` is a local React state controlled by the 🐞 toggle in the toolbar.
- `handleDebugEvent` logs structured events to the browser console only when debug is enabled.
- No `.env` keys are required for this flow.
- Styling overrides in `resources/css/app.css` remove the editor surface/footer borders so only the outer card border remains. Adjust those selectors if you change the wrapper layout.
- The same stylesheet now also ensures toolbar buttons keep their active colors in both light and dark themes via the `:root:not(.dark) [data-zettly-editor-toolbar] button[data-state=on]` override.

## Environment configuration

### Account consolidation

The `zettly:merge-users` command transfers account-owned records to a retained account while preserving Todo, focus, journal, report, and agent record IDs. It retires the source account with Laravel soft deletion, revokes its API tokens and browser sessions, and sets the retained account password from standard input. The command prints a dry-run inventory by default.

Before applying a merge, choose a private backup directory outside the application. The command creates and verifies a fresh PostgreSQL dump before changing data. Check for account-specific unique-key collisions and review any active focus on both accounts. The command refuses a tag-name collision or multiple active source foci. A single active source focus is completed in the same database transaction; the target account's active focus remains in place. If any update fails, the transaction rolls back.

```bash
php artisan zettly:merge-users SOURCE_ID TARGET_ID
# Supply the target password on stdin through a private credential helper.
credential-helper | php artisan zettly:merge-users SOURCE_ID TARGET_ID --apply --backup-dir=/private/backups --password-stdin
```

Run readback checks for moved record counts and source login denial after applying. Never pass passwords on the command line or store database backups in the repository.

Start from `.env.example` and configure only the services you use. Keep credentials in `.env` or the deployment secret store, never in the repository.

## Release workflow

- **Prerequisites**
  - Follow Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`). Add `BREAKING CHANGE:` to the body for major bumps.
  - Ensure the test-suite passes before releasing.
- **Create a release**
  ```bash
  npm run release
  ```
  Powered by `@programinglive/commiter`, this analyzes commits, updates `CHANGELOG.md`, bumps the version in `package.json`/`package-lock.json`, and creates a Git tag with emoji-friendly sections.
- **Override the version bump**
  ```bash
  npm run release:minor
  ```
  Use `release:patch` or `release:major` for other SemVer increments.
- **Publish**
  ```bash
  git push --follow-tags
  ```
  Create the GitHub/GitLab release after the push if your CI is not configured to do so automatically.

## Commit message policy

- **Install hooks**
  ```bash
  npx husky install
  ```
  Run this once after cloning to enable the Husky hooks configured by `@programinglive/commiter`.
- **Enforced format**
  - Commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
  - Examples: `feat(todo): add priority filter`, `fix(api): validate payload`, `chore: update dependencies`.
- **Hook behavior**
  - Husky runs `commitlint` via `.husky/commit-msg`. Non-compliant messages are rejected, preventing the commit.

## Documentation

For detailed API documentation, developer guides, and more information, visit the `/developer` page in the application.

For bounded activity digests, private report links, and the safe CLI preview command, see [notification formatting](./docs/notification-formatting.md).

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
