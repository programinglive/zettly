# Zettly Release Notes (Compact)

Centralized history of notable changes, fixes, and enhancements to the Zettly platform. See [Full Release Notes](RELEASE_NOTES_FULL.md) for detailed per-version documentation.

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 0.12.13 | 2026-11-09 | record v0.12.12 release notes entry (70b7c9f) |
| 0.12.12 | 2026-11-09 | record v0.12.11 release notes entry (e6bca63) |
| 0.12.11 | 2026-11-09 | record v0.12.10 release notes entry (ccb1a4f) |
| 0.12.10 | 2026-11-09 | record v0.12.9 release notes entry (03ed672) |
| 0.12.9 | 2026-11-09 | **reports:** structured report_summaries recap store with visuals and backfill (287a2d8) |
| 0.12.8 | 2026-11-09 | record v0.12.7 release notes and guard the legacy report link (fa693b2) |
| 0.12.7 | 2026-11-09 | **cli:** add checklist subtasks, related links, attachments, and status shortcuts (bb996a0) |
| 0.12.5 | 2026-11-07 | cleanup after release (a8afd3a) |
| 0.12.4 | 2026-01-21 | cleanup after release (a4042cb) |
| 0.12.3 | 2026-01-02 | cleanup after release (e340f2d) |
| 0.12.2 | 2026-01-02 | resolve test failures in DrawGalleryTest and boardWorkspace.test.js (32cfdd2) |
| 0.12.1 | 2026-01-02 | cleanup after release (95c25c5) |
| 0.12.0 | 2026-01-01 | See CHANGELOG for details. |
| 0.11.14 | 2026-01-01 | revamp profile settings with minimal black/white design (7643e35) |

| 0.11.13 | 2026-01-01 | cleanup post release (215a8aa) |
| 0.11.12 | 2025-12-28 | **gemini:** enhance chat UI and live tests (982f1aa) |
| 0.11.11 | 2025-12-24 | **graph:** allow production origin in graph service CORS (d74cc20) |
| 0.11.10 | 2025-12-24 | **graph:** add flexible URL config for production websocket and api (3efeec4) |
| 0.11.9 | 2025-12-24 | **build:** make husky optional during installation to avoid server build failures (4dba928) |
| 0.11.8 | 2025-12-24 | **pwa:** improve install prompt behavior and fix search input accessibility (e422dbc) |
| 0.11.7 | 2025-12-24 | **tooling:** setup commiter and clean tsconfig types (e0f31ff) |
| 0.11.6 | 2025-12-07 | update documentation 0.11.5 (0efb951) |
| 0.11.5 | 2025-12-02 | use standard vite build command to ensure env vars are loaded (e503e8d) |
| 0.11.4 | 2025-12-02 | force https scheme in production (c4a9d9d) |
| 0.11.3 | 2025-12-02 | make husky installation optional in production (78f27cc) |
| 0.11.2 | 2025-12-02 | add database sync command for production to local sync (29fb811) |
| 0.11.1 | 2025-12-02 | cleanup project structure and update dependencies (85858e5) |
| 0.10.21 | 2025-11-27 | **feat:** Focus edit functionality and history auto-update |
| 0.10.20 | 2025-11-26 | **fix:** CSRF token mismatch - Refactored to use Axios with cookie-based CSRF protection |
| 0.10.19 | 2025-11-22 | **deps-dev:** bump js-yaml from 4.1.0 to 4.1.1 (754d0f7) |
















## 0.12.13 – 📝 Documentation

Released on **2026-11-09**.

- record v0.12.12 release notes entry (70b7c9f)
- **journal:** add D:/code/zettly to the OpenCode plugin's hook search paths (85e636f)

## 0.12.12 – 📝 Documentation

Released on **2026-11-09**.

- record v0.12.11 release notes entry (e6bca63)
- **agent-api:** make started_at optional so client Stop updates are accepted (8b7ae0b)

## 0.12.11 – 📝 Documentation

Released on **2026-11-09**.

- record v0.12.10 release notes entry (ccb1a4f)
- **reports:** repair agent-session active time and harden sparse comparison (c5ca3c9)

## 0.12.10 – 📝 Documentation

Released on **2026-11-09**.

- record v0.12.9 release notes entry (03ed672)
- **reports:** replace placeholder historical comparison with real data (63204de)

## 0.12.9 – 📝 Documentation

Released on **2026-11-09**.

- record v0.12.8 release notes entry (a98ab9c)
- **reports:** structured report_summaries recap store with visuals and backfill (287a2d8)

## 0.12.8 – 📝 Documentation

Released on **2026-11-09**.

- record v0.12.7 release notes and guard the legacy report link (fa693b2)
- **reports:** human-readable recaps and digest-first reports UX (3d3880e)

## 0.12.7 – ✨ Features

Released on **2026-11-09**.

- **cli:** add checklist subtasks, related links, attachments, and status shortcuts (bb996a0)
- **reports:** add in-app reports workspace for work recaps (67f41b5)
- **deps:** lock marked, which package.json declares but the lockfile missed (c95f524)
- **cli:** allow mutable assignment for positional id shorthand and resolve endpoint (22b448f)
- **reports:** write-only catch-up for missed nights and deterministic nightly tests (3bcab57)
- **routes:** move the in-app report detail under /reports/view (62abfa3)

## 0.12.5 – 🧹 Chores

Released on **2026-11-07**.

- cleanup after release (a8afd3a)
- cleanup after release (a4042cb)
- **deps:** bump paragonie/sodium_compat from 2.4.0 to 2.5.0 (2c68918)
- **deps:** bump qs from 6.14.0 to 6.14.1 in /graph-service (c60b408)
- ignore __pycache__ in Zettly repo (a73e604)
- **kanban:** stop logging the whole board on every drag (a983097)
- **release:** 0.12.4 🚀 (e7d7b9d)
- remove committed __pycache__, add Python bytecode to .gitignore (7849938)
- **security:** keep real credentials out of .env files in the public repo (e406117)
- **testing:** remove unused GEMINI_API_KEY from .env.testing (5343dd1)
- **dashboard:** stop shipping the todo list to a page that never read it (6afb12a)
- **db:** index user_id on the eight tables that filter by it (87a9c50)
- **graph:** sync graph events through the queue (debbab1)
- **habits:** stop querying once per habit when listing habits (f53e3ce)
- **reports:** enqueue deliveries in one pass instead of one report at a time (bbf0f87)
- run the suite without a built frontend (01fd7c5)
- **tldraw:** add integration test covering the shared token class (0dfdd51)
- clarify hook file location before journal repo removal (0891a3b)
- close out Zettly CLI rollout (#11) (f59ea7c)
- **deploy:** expose the atomic build as npm run build:atomic (9513f07)
- **env:** contoh konfigurasi Reverb, buang Gemini dan Algolia (c3abb81)
- **env:** warn that APP_DEBUG must be off in production (c8f0422)
- **graph:** explain how the service runs, and why it re-seeds (b8937dc)
- journal consolidation setup and deprecation checklist (d1e926a)
- **journal:** stop telling people env vars are enough, and mark the repo checklist done (164a6d0)
- **notifications:** document and verify discord rich embed formatting (db52a98)
- refresh README for current Zettly app (b2f611d)
- **accounts:** add guarded owner merge command (5c9c5e7)
- add focus api endpoints and insomnia collection (38bbace)
- **cli:** add TLDraw shape operations (#9) (433605c)
- **cli:** add Zettly command-line client (#7) (66e4e5b)
- **errors:** give 403/404/405/419/500/503 a real page (4c7d181)
- **hook:** add cross-platform Codex hook installer + setup doc (e393346)
- **hook:** move codex_journal.py + tests + Codex setup guide into Zettly (f7e81d4)
- **journal:** add agent session ingest service with redaction and categorisation (024a3df)
- **journal:** add agent session, journal entry, and report tables (98541e6)
- **journal:** add journal entry API (2ff6561)
- **journal:** add journal models, relations, and factories (f975ece)
- **journal:** add report delivery service and queued jobs (c304d3c)
- **journal:** add report generation and channel management API (0dc3904)
- **journal:** add server-side report generator with WIB period boundaries (a1df770)
- **journal:** add the missing /journal page (0d84974)
- **journal:** add the OpenCode plugin and stop recommending env-only setup (803bd16)
- **journal:** expose agent session ingest API (93c9e75)
- **journal:** import legacy SQLite and Markdown journal data (3bfafd6)
- **journal:** schedule daily report generation and delivery (03c0ab5)
- **notifications:** format discord reports with clean structured rich embeds (3d6ebe4)
- **ops:** add queue-worker watchdog loop script (9f3611a)
- **reports:** include journal entries and todos so imported history is not blank (b8fc1ac)
- **ui:** render markdown and preserve formatting in sanitized html (26faeba)
- **zettly:** ganti Pusher dengan Reverb, hapus Algolia dan Gemini (fd84dc7)
- **accounts:** back up the resolved database connection (508995f)
- **accounts:** verify fresh backup and transferred ownership (7c7e11f)
- **api:** stop the resource wildcard from swallowing literal routes (6f6352b)
- **auth:** make GET /logout sign the user out instead of returning 405 (378bf24)
- **authz:** close three cross-user write holes (0574982)
- **build:** resolve rollup win32 module and tiptap version mismatch (c2e5af3)
- **cli:** keep attachment metadata independent of storage (#10) (e621800)
- **cli:** register Sanctum abilities middleware (#8) (99dbed5)
- **debug:** require super admin for the debug panel, and restore router.post (f34ea06)
- **deploy:** build assets beside the live directory, then swap (ffbba5c)
- **deps:** patch security advisories in composer and npm lockfiles (75a9b55)
- **deps:** unpin the Windows-only rollup binary (5e62f62)
- **errors:** show an error page instead of JSON when the database is down (8708e0d)
- **graph:** actually run the graph service (a0b63a6)
- **hook:** correct session_payload arg order + add Stop regression tests (6e52150)
- implement kanban board setting in dashboard (2bd2f83)
- **journal-hook:** stop losing events when the API token is rejected (71151d1)
- **journal:** address code-review findings on the consolidation branch (f6add34)
- **journal:** record the machine name on macOS and Linux, and fix the PS 5.1 installer (b7226c9)
- **journal:** stop dropping the body of every entry (baedba1)
- **journal:** stop printing "[object Object]" in the entry count (9bc7e7a)
- **kanban:** keep the success handler the reorder test requires (6cffbdf)
- **notifications:** deliver readable bounded digests with private report links (162345c)
- **queue:** catch graph service connection exceptions and format test suite (c940a12)
- **queue:** handle graph service connection exceptions gracefully in SyncGraphEvent (d3755c2)
- remove completed column from kanban board (bc771ff)
- remove todo board header from dashboard (6620d43)
- **reports:** bind report windows in UTC so late-night WIB sessions are included (f1b86d3)
- **reports:** cap the outstanding backlog and label it as current (764d1e6)
- **reports:** count completed work even when completed_at is missing (575b463)
- **reports:** dispatch delivery job on generate; add config-file fallback to the journal hook (d6aed76)
- **reports:** make a history backfill safe by default (44956c7)
- **reports:** make weekly and monthly requests cover their real period (6f818ec)
- **reports:** say how many completions have no date instead of hiding them (c7f1852)
- **reports:** stop attributing decades-old todos to the import day; make a stuck outbox visible (6e3aa4f)
- **reports:** stop the Discord summary from dropping the journal and projects (1982433)
- **reports:** stop the nightly job from backfilling every past period (3f9fb03)
- **security:** hapus rute dan controller debug Pusher tanpa auth (e332bf9)
- **security:** remove the diagnostic upload page (d7e5690)
- **session:** make the session cookie Secure by default in production (dc2576d)
- **system-status:** keep environment details for super admins (35870b8)
- **tldraw:** make the WebSocket handshake token actually verifiable (f5d02d0)
- **user:** stop shipping the 2FA seed to the browser (deb7cdb)

## 0.12.4 – 🧹 Chores

Released on **2026-01-21**.

- cleanup after release (a4042cb)
- **deps:** bump paragonie/sodium_compat from 2.4.0 to 2.5.0 (2c68918)
- **deps:** bump qs from 6.14.0 to 6.14.1 in /graph-service (c60b408)
- **build:** resolve rollup win32 module and tiptap version mismatch (c2e5af3)
- implement kanban board setting in dashboard (2bd2f83)
- remove completed column from kanban board (bc771ff)
- remove todo board header from dashboard (6620d43)
- add focus api endpoints and insomnia collection (38bbace)

## 0.12.3 – 🧹 Chores

Released on **2026-01-02**.

- cleanup after release (e340f2d)
- remove platform-specific dependencies and refine tag layout (012ad3e)

## 0.12.2 – 🐛 Bug Fixes

Released on **2026-01-02**.

- resolve test failures in DrawGalleryTest and boardWorkspace.test.js (32cfdd2)

## 0.12.1 – 🧹 Chores

Released on **2026-01-02**.

- cleanup after release (95c25c5)
- improve notes page layout (c937b63)
- cleanup after release (6a79ca9)
- **sidebar:** prevent multiple active links by using most specific path match (8270142)
- extract manage tags to standalone page and revamp UI宣 (401fe24)
- revamp habits module with hero headers and applayout standardization (599ebff)
- revamp todo board with premium centered layout and refined components (8541415)
- revamp todo list page with premium centered layout (1aaf271)
- **sidebar:** move todo board below dashboard for better flow (1c65bf7)
- standardize notes and drawings gallery with premium hero headers (d590176)
- standardize organization pages with premium centered layout (3a09b3e)
- standardize profile, docs, and developer portal with hero styling (9a2a140)
- standardize tags page and fix container width consistency (4f322f5)
- standardize todo module with premium hero layout and centered containers (c6edd89)

## 0.12.0

Released on **2026-01-01**.

- See CHANGELOG for details.

## 0.11.14 – ♻️ Refactors

Released on **2026-01-01**.

- revamp profile settings with minimal black/white design (7643e35)
- profile settings react warnings and accessibility issues (84aee21)
- **Habit Streaks**: Monitor your progress with the brand new habit streaks visualization.
- **Premium Notes Page**: Reimagined "My Notes" with a premium hero header, tag-based filtering, and a masonry-style card layout.
- **Organization Onboarding**: Improved invitation flow for team members joining new workspaces.
- add todo board view and fix profile menu items (bdaa1d3)
- **dashboard:** total revamp with premium hero layout and centered content (2b2d647)
- extract todo board to dedicated page and refine dashboard (32820ed)
