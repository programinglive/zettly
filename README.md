# Zettly Application

[![Latest release](https://img.shields.io/github/v/release/programinglive/zettly?logo=github&style=flat&color=F97316)](https://github.com/programinglive/zettly/releases)
[![Open issues](https://img.shields.io/github/issues/programinglive/zettly?style=flat&color=EF4444)](https://github.com/programinglive/zettly/issues)
[![Open pull requests](https://img.shields.io/github/issues-pr/programinglive/zettly?style=flat&color=0EA5E9)](https://github.com/programinglive/zettly/pulls)
[![License: MIT](https://img.shields.io/github/license/programinglive/zettly?style=flat&color=6366F1)](./LICENSE)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-22C55E.svg)](./CONTRIBUTING.md)

Zettly is a modern, full-stack todo list application built with Laravel 12, React, Inertia.js, TailwindCSS, and shadcn/ui. Create, manage, and track your todos with a beautiful and responsive interface.

## Design System: Two-Color Mode

**IMPORTANT**: Zettly uses a strict two-color design system - **ONLY black, white, and gray colors** are allowed throughout the entire application.

### Color Palette Guidelines

- **Primary Colors**: Black (`#000000`) and White (`#FFFFFF`)
- **Accent Colors**: Gray scale (`gray-50` through `gray-900`)
- **NO colored elements**: No red, blue, green, yellow, orange, purple, or any other colors
- **Consistent theme**: All UI components must adhere to this monochromatic palette

### Implementation Rules

1. **Buttons**: Use gray scale only (gray-500, gray-600, gray-700, gray-800, gray-900)
2. **Backgrounds**: White or gray variations only
3. **Text**: Black, white, or gray tones only
4. **Borders**: Gray colors only
5. **Icons**: Black, white, or gray
6. **Status indicators**: Use gray intensity instead of colored badges
7. **Error states**: Use gray backgrounds with darker gray text (no red)
8. **Success states**: Use darker gray backgrounds (no green)

### Component Examples

- **Primary buttons**: `bg-gray-800 hover:bg-gray-900 text-white`
- **Secondary buttons**: `bg-gray-600 hover:bg-gray-700 text-white`
- **Outline buttons**: `border-gray-300 text-gray-600 hover:bg-gray-100`
- **Error messages**: `bg-gray-200 text-gray-900 border-gray-300`
- **Success messages**: `bg-gray-700 text-white`

This two-color system ensures visual consistency, reduces cognitive load, and creates a clean, professional interface.

## Release Notes

Detailed historical changes live in [docs/reference/RELEASE_NOTES.md](./docs/reference/RELEASE_NOTES.md) and on the [GitHub releases page](https://github.com/programinglive/zettly/releases).

## Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd todoapp
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
   # Configure your database in .env file
   php artisan migrate
   php artisan db:seed
   ```
   Running the seeders now creates todos that already have sample tags (Work, Personal, Important, Learning) attached, so the dashboard filters and tag-based features are immediately usable.

   > **Super administrator access:** The `UserSeeder` promotes `john@example.com` to a super administrator every time it runs (existing records are updated). Sign in with that account (password `password123`) to use the monitoring tools. To elevate another account, run `php artisan tinker` and execute `\App\Models\User::where('email', 'you@example.com')->first()?->assignRole(\App\Enums\UserRole::SUPER_ADMIN);`.

5. **Administration & Monitoring**
   - Visit `/admin/system-monitor` (requires super administrator role) to inspect WebSocket status, Pusher credentials, authentication state, and server health from the browser.
   - The System Monitor page embeds the same realtime diagnostics widget used on the dashboard, but it is permanently enabled for administrators.

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
  The Node test suite now includes targeted regression coverage for the drawing workspace to ensure we never reintroduce the infinite render loop or passive event listener warnings on the TLDraw canvas.

## Features

### Core Functionality
- ✅ **Create & Manage Todos** - Add, edit, delete, and complete todos
- ✅ **Priority System** - Set priority levels (Low, Medium, High, Urgent) with color-coded badges; completed or archived todos automatically drop their priority so the "Completed" lane stays clean, and API updates mirror the same behavior for parity across clients
- ✅ **Smart Sorting** - Todos automatically sorted by priority and completion status
- ✅ **Tag Management** - Organize todos with customizable colored tags
- ✅ **Todo Linking** - Create relationships between related todos
- ✅ **Attachments** - Upload images/documents, preview images, download files, and delete with a confirmation modal
- ✅ **Rich Text Descriptions** - Compose todos with the Zettly Editor (TipTap). The app sanitizes all saved HTML, highlights code blocks with Highlight.js, and shows a concise plain-text preview on the overview cards to keep layouts tidy.
- ✅ **Dashboard Overview** - Simplified "Focus" workspace. The home view focuses on your Daily Focus and critical notifications to reduce clutter.
  - ✅ **Dedicated Todo Board** - A powerful, separate workspace (`/todos/board`) for managing tasks.
    - Toggle between **Eisenhower Matrix** (urgency/importance) and **Kanban Board** views via Profile Settings.
    - Sortable columns and drag-and-drop management.
    - Context panel for detailed task metadata and linked todos.
  - ✅ **Notes Mode** - Capture lightweight notes without due dates or priorities alongside your actionable todos
- ✅ **Draw Workspace** - Open the TLDraw-powered canvas alongside Todos and Notes, create multiple sketches, and enjoy automatic autosave with persistent storage

### Drawing Workspace

The `/draw` experience introduces a multi-document sketching surface powered by TLDraw. Key capabilities:

- **Multiple drawings per user** with lazy loading and caching for fast context switches.
- **Autosave every keystroke** – snapshots queue up and debounce writes to the server, with persisted metadata stored in the new `drawings` table.
- **Cross-session continuity** – drawings are restored on demand, including title edits, undo history, and last-saved status.
- **Live updates** – changes are synchronized in real-time across multiple tabs/devices using WebSockets.
- **Robust migration & seeding** – run `php artisan migrate` after updating to create the supporting schema; no seed data is required.

> ℹ️ **Optional TLDraw License**: Set `VITE_TLDRAW_LICENSE_KEY` in `.env` if you have a commercial key. Leaving it blank falls back to the open core features.

#### Live Update Configuration

To enable real-time collaboration across tabs/devices:

1. **Configure Pusher** (or compatible WebSocket service):
   ```env
   # Add to your .env file
   PUSHER_APP_ID=your_pusher_app_id
   PUSHER_APP_KEY=your_pusher_app_key
   PUSHER_APP_SECRET=your_pusher_app_secret
   PUSHER_HOST=your_pusher_host  # Optional: for self-hosted
   PUSHER_PORT=443
   PUSHER_SCHEME=https
   PUSHER_APP_CLUSTER=mt1
   ```

2. **Install dependencies** (already included):
   ```bash
   composer require pusher/pusher-php-server
   npm install --save-dev laravel-echo pusher-js
   ```

3. **Update broadcasting configuration**:
   ```bash
   php artisan config:clear
   ```

The live update system:
- Broadcasts changes on private channels (`drawings.{id}`) for security
- Deduplicates updates from the same client to prevent infinite loops
- Automatically reconnects if the connection is lost
- Shows real-time changes without requiring page refresh

Behind the scenes, the app guards against runaway renders and browser warnings by:

- Normalising snapshots before persisting them so corrupted TLDraw payloads are rejected gracefully.
- Debouncing save operations and flushing pending writes when switching drawings.
- Overriding passive event listeners up-front so TLDraw can call `preventDefault()` without triggering console spam.
- Shipping regression tests (`DrawInfiniteLoopTest` and `DrawPassiveEventFixTest`) that enforce these guardrails during every CI run.

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

### Search Powered by Algolia

The Zettly project proudly uses Algolia to deliver fast, typo-tolerant search across todos, notes, and tags.

- Branding assets live in `public/images/`. The Algolia attribution and sponsor card now use the official full-blue SVG (`algolia.svg`), while the tldraw sponsor tile displays the latest community avatar (`tldraw.png`) sourced from GitHub. Keep these files intact to preserve required acknowledgements.

> **Dear Algolia Open Source Team,**
>
> My name is Mahatma Mahardhika. I lead a developer community in Indonesia focused on helping students and early-career developers learn programming through real, open-source projects that support the “Golden Indonesia 2045” vision.
>
> I’m developing Zettly — an open-source, privacy-first note-taking app that helps learners capture ideas, link notes using the Zettelkasten method, and organize tasks with the Eisenhower Matrix. It’s fully public, non-commercial, and designed as a teaching tool.
>
> - Main site: https://programinglive.com
> - Project: https://github.com/programinglive/zettly
> - Demo: https://zettly.programinglive.com
>
> Search is at the core of Zettly. We chose Algolia for its speed, typo tolerance, and developer-friendly API. Algolia would power global note search, tag and language filters, and “Did you mean” features—making it easier for students to explore their notes and learn how modern search works. We also plan to include clear integration examples in our open documentation for educational use.
>
> Zettly also includes a reusable open-source editor component, `@programinglive/zettly-editor`, built with TipTap and Shadcn UI for writing and formatting notes.
>
> - Editor: https://github.com/programinglive/zettly-editor
> - Demo: https://zettly-editor.programinglive.com
>
> Zettly is open, community-driven, and educational. We will display the “Search by Algolia” attribution and document the integration so contributors can learn from it. This project directly supports developer education and aligns with Algolia’s mission to empower open-source communities.
>
> Thank you for considering our request. Algolia’s support would greatly enhance how learners discover and connect knowledge through Zettly.
>
> Warm regards,
>
> Mahatma Mahardhika  
> mahatma.mahardhika@programinglive.com

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

## Algolia Search Configuration

Zettly uses Algolia for full-text search across todos, notes, and tags. The integration uses the native Algolia PHP v4 client (no Scout Extended dependency).

### Setup

1. **Create Algolia indexes** in your [Algolia Dashboard](https://www.algolia.com/dashboard):
   - `zettly_search`

2. **Set environment variables** in `.env`:
   ```env
   # Admin key (for server-side indexing)
   ALGOLIA_APP_ID=your_algolia_app_id
   ALGOLIA_ADMIN_KEY=your_algolia_admin_key

   # Search key (for client-side search)
   VITE_ALGOLIA_APP_ID=your_algolia_app_id
   VITE_ALGOLIA_SEARCH_KEY=your_algolia_search_key

   # Index names
   VITE_ALGOLIA_INDEX_TODOS=zettly_todos
   VITE_ALGOLIA_INDEX_NOTES=zettly_notes
   VITE_ALGOLIA_INDEX_TAGS=zettly_tags
   ```

3. **Import existing data** (one-time):
   ```bash
   php artisan algolia:import
   ```
   Use `--clear` to clear indexes before importing:
   ```bash
   php artisan algolia:import --clear
   ```

### How It Works

- **Server-side indexing**: Model observers (`TodoObserver`, `TagObserver`) automatically sync records to Algolia when created, updated, or deleted.
- **Client-side search**: The `NavbarSearch` component queries Algolia using the search-only API key, filtering by `user_id` for privacy.
- **Mobile & Desktop**: Search is available on both desktop (navbar center) and mobile (search icon in navbar, expands below).
- **Attribution**: The search dropdown displays a "Search by Algolia" badge linking to Algolia's site as required for open-source sponsorship.

### API Keys

- **Application ID & Admin Key**: Found in [Algolia Dashboard](https://www.algolia.com/dashboard) → **Settings > API Keys**. Use the **Admin API Key** for server-side indexing.
- **Search-Only API Key**: Use this for client-side queries (already restricted to search operations).

### Troubleshooting

- If search shows "Search unavailable", verify `VITE_ALGOLIA_*` variables are set and indexes exist.
- Run `php artisan algolia:import` to re-sync all data.
- Check Laravel logs for indexing errors.

## Gemini integration

- Ensure `GEMINI_API_KEY` (and optional `GEMINI_REQUEST_TIMEOUT`) are set before hitting the chat endpoint in `routes/web.php`.
- `GeminiTestController::chat()` now returns a `504` JSON response when the upstream request times out and logs the failure for later inspection.
- To verify the project has a stored API key in Google Cloud Secret Manager, run `gcloud secrets list`. If no secret is listed, create one (for example `gcloud secrets create gemini-api-key --data-file=-`) and reference it in your deployment pipeline or populate `.env` with `GEMINI_API_KEY`.

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
