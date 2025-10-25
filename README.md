# Zettly Application

Zettly is a modern, full-stack todo list application built with Laravel 12, React, Inertia.js, TailwindCSS, and shadcn/ui. Create, manage, and track your todos with a beautiful and responsive interface.

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
  vendor\\bin\\phpunit --stop-on-failure
  ```
- **Frontend filtering helper** (Node test runner)
  ```bash
  node --test resources/js/Pages/Todos/__tests__/filterTodos.test.js
  ```

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

## Open Source Resources

The project follows standard open-source practices. Refer to the following documents:

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [MIT License](./LICENSE)

### Editor Credits
- Built with the [@programinglive/zettly-editor](https://github.com/programinglive/zettly-editor) package — explore the editor source and examples in that repository.

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
2. When the in-app banner appears, click **Install app** or use the browser’s menu (usually `⋮` → **Install app**).
3. The app opens in its own window and will update automatically on the next publish.

#### Install on iPhone / iPad (Safari requirement)
Apple Safari does not fire the `beforeinstallprompt` event, so the banner inside Zettly provides manual guidance instead. To complete the install:
1. Open the site in Safari (Chrome/Firefox on iOS cannot add PWAs to the home screen).
2. Tap the **Share** button (square with the ↑ arrow).
3. Choose **Add to Home Screen** and optionally rename the shortcut.
4. Tap **Add**. The Zettly icon should now appear on your home screen.

> ℹ️ **Troubleshooting**
> - Ensure you are using HTTPS (or a LAN IP while testing)  – iOS will not install PWAs from `http://localhost`.
> - Disable Private Browsing; the Add to Home Screen option is hidden there.
> - Confirm the icon loads by visiting `/apple-touch-icon.png`. If it 404s, Safari will skip the install icon.
> - If the option is missing, remove any previous shortcut created for the same domain and refresh.

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
