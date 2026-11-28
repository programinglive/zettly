# Zettly UI/UX Batch 2 — Alignment and Phone Verification (2026-11-28)

## Scope

Todo #1121 / workflow Todo #1284 aligned the following pages with ZET-UI-001/002/003:

- `/agent/jobs` (`Pages/Agent/Index.jsx`)
- `/agent/jobs/{id}` (`Pages/Agent/Show.jsx`)
- `/agent/jobs/{id}/monitor` (`Pages/Agent/Monitor.jsx`)
- `/agent/setup` (`Pages/Agent/Setup.jsx`)
- `/agent/intelligence` (`Pages/Agent/Intelligence.jsx`)
- `/developer` (`Pages/Developer.jsx`)
- `/docs` (`Pages/Docs.jsx`)
- `/engineering` (`Pages/Engineering/Index.jsx`)
- `/admin/system-monitor` (`Pages/Admin/SystemMonitor.jsx`)
- Shared header user menu (`Layouts/AppLayout.jsx`)

## Changes

- Replaced every narrow page-level container (`max-w-3xl/4xl/5xl/6xl/7xl`) with a full-width `w-full` wrapper so `AppLayout` owns the fluid container.
- Added Tailwind arbitrary variants `[&_button]:min-h-[44px]` and `[&_a]:min-h-[44px]` to every target container; the shared header user menu now also has `min-h-[44px]`.
- Reduced oversized headings to `text-2xl font-semibold` and oversized cards (`rounded-3xl`, `rounded-[2.5rem]`) to `rounded-lg`.
- Replaced emoji glyphs with Lucide icons (`Settings2`, `BarChart3`, `Package`, `FlaskConical`, `ListChecks`, `ClipboardList`, `Loader2`, `Sparkles`, `Radio`, `Zap`, `FolderGit2`, `Bot`, `Compass`, `UserRound`, `Pin`, `Rocket`, `GitPullRequest`, `FileText`, `MessageSquare`, `Clock3`, `ExternalLink`, `BookOpen`, `Puzzle`). Guide icons in `Docs.jsx` are now component references instead of emoji strings.

## Verification

- Guard test: `resources/js/__tests__/uiBatch2.test.js` (6 tests) asserts no narrow container, no oversized heading/radius, no `Extended_Pictographic` glyph, a fluid wrapper and 44px variants on all nine pages.
- `php artisan test`: 817 passed, 1 skipped (4256 assertions).
- `npm test`: 182 JS tests + 35 CLI tests passed.
- `npm run build`: Vite production build and atomic `public/build.next -> public/build` swap succeeded.
- Phone viewport: Playwright at **390 x 844 CSS px** on the local dev server, authenticated as the local verification user, on all nine routes above. For every page: `document.documentElement.scrollWidth === 390` (no horizontal scrolling), all visible `button` / `a.inline-flex` controls measured at least 44px tall, and computed `h1` font-size was 18-24px. Screenshot evidence: `ui-batch2-docs-390px.png`.

Local-only setup used for the browser check (not committed): temporary `CODING_AGENT_*` entries in `.env`, a local `super_admin` verification user, migrated local SQLite tables and one placeholder coding-agent job. The `.env` entries were removed afterwards.

## Constraints

- No production deployment was performed by this task. Any future release must still go through the CI/CD webhook path only.
- No other AI session owns the `zettly` repository; the two active sessions work in `clinic`.
