# Zettly CLI Design

## Goal

Provide a standalone `zettly` command line client for the authenticated Zettly product. It should expose the product's practical operations to scripts and terminal users while reusing the Laravel application as the source of authorization and business rules.

## Architecture

- `cli/` is an independently installable Node.js ESM package (Node 18+, built-in `fetch`, no runtime dependencies).
- CLI requests use the configured Zettly HTTPS origin and versioned `/api/v1` endpoints. It never connects to the database.
- Laravel keeps the current `/api` endpoints compatible; `/api/v1` is the stable CLI surface.
- Credentials are personal access tokens supplied interactively or from `ZETTLY_API_TOKEN`; on Windows the persisted token is encrypted with user-scoped DPAPI and never placed in the JSON config.
- Responses support readable tables/text and `--json`; failures use nonzero exit codes. Mutations with destructive impact require confirmation unless `--yes` is passed.

## Feature coverage

Expose account/profile and token state, todos and notes (including priority, importance, due date, checklists, tags, links, board status, archive/trash/recovery), tags, focus sessions, habits and statistics, organizations/members/invitations, drawing document JSON import/export, attachments, graph export/rebuild, push subscription status/actions, and admin-only system status/email diagnostics. Terminal drawing editing and browser push permission grants remain browser responsibilities; CLI can manage/export documents and existing push subscriptions.

## Security and compatibility

- All API operations require Sanctum authentication and preserve existing per-user and organization membership checks.
- Sensitive/admin operations require server-side role authorization; do not expose admin actions through a generic pass-through endpoint.
- No password login, token output by default, or credential logging.
- Existing web routes and `/api` consumers remain unaffected.
- Unsupported server operations must return a clear API error rather than silently succeeding.

## Acceptance criteria

- CLI has help, host configuration, token login/logout/status, JSON output, and command groups matching product areas.
- Existing API functions, task actions, habit operations, organization membership/admin operations, drawing JSON, attachment transfer, push calls, profile identity and system status are reachable through the CLI; remaining areas are listed as not yet supported in the package README.
- Package documentation describes installation, authentication, commands, output and browser-only limitations.
- Static syntax and diff checks pass. No test suite is added or run in this task.
