# Zettly Application

Zettly is a modern, full-stack todo list application built with Laravel 12, React, Inertia.js, TailwindCSS, and shadcn/ui. Create, manage, and track your todos with a beautiful and responsive interface.

## Bug Fixes

### Draw TypeError on navigation (2025-10-28)

**Problem**: Returning to the `/draw` gallery triggered a runtime `TypeError: h is not a function`, crashing the TLDraw canvas.

**Solution**:
- Replaced the stale `setActiveId` call with the existing `setActiveDrawing` setter
- Simplified the TLDraw component integration by removing problematic props (`onChange`, `inferDarkMode`)
- Reduced the editor mount logic to essential setup to avoid invalid listener hookups
- Added targeted Node-based regression tests under `tests/js/Draw.test.js`

**Files Changed**:
- `resources/js/Pages/Draw/Index.jsx`
- `tests/js/Draw.test.js`

### Infinite Loop in Drawing Editor (2025-10-27)

**Problem**: The drawing page (`/draw`) was causing infinite re-renders due to a dependency chain in React hooks:
- `loadDrawingIntoEditor` depended on `persistDrawing`
- `persistDrawing` recreated when `activeDrawing` changed
- This caused `loadDrawing` to recreate, triggering the useEffect infinitely

**Solution**: 
- Removed `persistDrawing` from the dependency array of `loadDrawingIntoEditor` 
- Added explanatory comment about the fix
- Created regression tests to prevent future infinite loops

**Files Changed**:
- `resources/js/Pages/Draw/Index.jsx` - Fixed useCallback dependencies
- `resources/js/__tests__/DrawInfiniteLoopTest.test.js` - Added regression tests

### Passive Event Listener Warnings in Drawing Editor (2025-10-27)

**Problem**: TLDraw was generating "Unable to preventDefault inside passive event listener" warnings in the console, which occurs when canvas-based applications try to prevent default behavior on passive event listeners.

**Solution**:
- Moved event listener override to module level to run before TLDraw initializes
- Added comprehensive console.error suppression for all passive event listener warnings
- Configured touch, wheel, and pointer events to be non-passive to allow preventDefault
- Added proper cleanup functions to restore original behavior when component unmounts
- Added regression tests to ensure the fix remains in place

**Files Changed**:
- `resources/js/Pages/Draw/Index.jsx` - Added module-level passive event listener handling
- `resources/js/__tests__/DrawPassiveEventFixTest.test.js` - Added regression tests

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

5. **Start development server**
   ```bash
   composer run dev
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
- ✅ **Dashboard Overview** - Focused workspace for prioritizing todos. The home view merges your actionable todos with the Eisenhower Matrix workspace by default, while the Kanban board remains available when the saved preference is set to `kanban`.
  - Todos panel on the left for daily/recent tasks with search and tag filtering
  - Eisenhower Matrix in the center (drag tasks between quadrants; urgency/importance auto-adjust)
  - Context panel on the right that surfaces linked todos and metadata for the selected task
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

## Open Source Resources

The project follows standard open-source practices. Refer to the following documents:

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [MIT License](./LICENSE)

### Editor Credits
- Built with the [@programinglive/zettly-editor](https://github.com/programinglive/zettly-editor) package — explore the editor source and examples in that repository.

### Search Powered by Algolia

The Zettly project proudly uses Algolia to deliver fast, typo-tolerant search across todos, notes, and tags.

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
