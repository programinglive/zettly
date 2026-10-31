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

## Features

### Core Functionality
- ✅ **Tasks and priorities** — Create, edit, complete, archive, and sort todos by priority.
- ✅ **Focus workspace** — Keep the current daily focus and important notifications visible.
- ✅ **Eisenhower and Kanban boards** — Plan by urgency/importance or manage work in sortable drag-and-drop columns.
- ✅ **Tags and relationships** — Organize tasks with tags and link related todos.
- ✅ **Notes and rich text** — Capture notes separately from actionable tasks and write formatted descriptions with the Zettly Editor.
- ✅ **Attachments and checklists** — Add files and structured checklist items to tasks.
- ✅ **Habit tracker** — Set recurring goals, record completions, and review streaks.
- ✅ **Organizations** — Create shared workspaces, invite members, and organize workspace data.
- ✅ **Knowledge graph** — Explore relationships between todos in the graph workspace.
- ✅ **Draw workspace** — Create multiple TLDraw sketches with autosave and live synchronization.
- ✅ **Web Push and PWA** — Subscribe to push notifications and install the app on supported devices.

### Drawing Workspace

The `/draw` experience introduces a multi-document sketching surface powered by TLDraw. Key capabilities:

- **Multiple drawings per user** with lazy loading and caching for fast context switches.
- **Autosave every keystroke** – snapshots queue up and debounce writes to the server, with persisted metadata stored in the new `drawings` table.
- **Cross-session continuity** – drawings are restored on demand, including title edits, undo history, and last-saved status.
- **Live updates** – changes are synchronized in real-time across multiple tabs/devices using WebSockets.
- **Robust migration & seeding** – run `php artisan migrate` after updating to create the supporting schema; no seed data is required.

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

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
