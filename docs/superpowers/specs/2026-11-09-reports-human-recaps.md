# Design: Human-readable recaps + digest-first reports UX

Date: 2026-11-09 · Status: approved (decision delegated by the user)

## Problem

- Generated work recaps read like a machine template: `## Next actions —
  Continue from activity/ACTIVE.md.` with no sentence that tells you what
  actually happened.
- The `/reports` list is one endless scroll: every report is a full card with
  the same mechanical headline, so "where am I / what matters" takes seconds
  of scrolling to figure out.

## UX research basis

- Nielsen Norman Group, *Progressive Disclosure*: show only the most
  important options first; disclose details on request; keep the split
  "frequent need up front, rare need secondary"; label the next level so the
  payoff is obvious ("information scent"); max two disclosure levels.
- Established patterns for work/activity data: time-grouping (weeks/months),
  one-line digests on cards, and bounded "load more" lists (GitHub
  contribution/activity graphs group and cap what is visible at once).

## Decisions

### Language — digest-first summary (option A)

`ReportGenerator::render()` gains a `## Summary` section, placed **after**
the headline bullets and **before** `## Work by project` (placement is load
bearing: Discord `discordPayload` only reads metric bullets while the
section is empty, so all downstream contracts — Discord embed, CLI
formatter, redaction page, shape tests — stay byte-identical below the new
block).

The paragraph is templated from data already computed in `render()`
(deterministic, no LLM), 2–4 sentences, ≤ ~280 chars so the Discord
`chatPayload` (~1800 UTF-16 unit budget) still carries it:

- quiet period → "No recorded activity in this period."
- otherwise:
  1. *Time*: "You logged 43 minutes of active agent work on MMCH across 3 projects."
     (machines: list ≤2, "on X and Y"; 3+ → "across N machines")
  2. *Output*: "You completed 5 tasks, including "Merge reports UI" in zettly."
     (first completed session title, redacted to 60 chars; plus "and N
     recorded todos" when `$todosCompleted > 0`)
  3. *Open*: "2 tasks remain in progress or blocked, and 4 todos are still open."
     (each clause only when non-zero)

Old lines are never edited; only the new section is inserted.

### List UX — option C: month groups + digest card + bounded pages

`GET /reports` (Inertia payload changes):

- each card carries `digest` = first paragraph of `## Summary`, 140-char cap;
  legacy reports in the DB fall back to the current head-lines summary.
- pagination: `?page=N`, 30 per page, `has_more` flag; "Show older reports"
  is one click away, not an endless scroll.

`Reports/Index.jsx` changes:

- reports grouped by `period_start` month; newest group expanded, older
  groups collapsed behind "November 2026 · 30 reports" headers;
- card = kind chip + period label + one-line digest + generated time;
- kind tabs and Generate-now unchanged.

`Reports/Show.jsx` changes:

- lead area: period header + summary paragraph (always visible) + headline
  bullets as compact stats;
- everything after the summary block goes into a collapsed "Full details"
  toggle (progressive disclosure, default closed);
- legacy content without `## Summary` renders as before, no toggle.

## Constraints honored

- No new npm dependencies; no `dangerouslySetInnerHTML`.
- `reportParser.js` zero-dep shape is extended, not changed: free
  paragraph lines already parse to `p` blocks — a new parser test pins the
  summary-section shape.
- Discord delivery wording: the new block reads naturally there because
  `chatPayload` takes the head of the report; metric-embed extraction is
  guarded by a regression test.

## Test plan (TDD order)

1. `ReportGeneratorTest` — summary block present between bullets and
   "Work by project"; quiet-day sentence; completed/pending sentences;
   legacy lines unchanged.
2. `reportParser.test.js` — summary section parses to `h2 Summary` + `p`.
3. `ReportsUiTest` — digest = first summary paragraph (new shape); legacy
   fallback; pagination (`has_more`, `?page=2`, page beyond range).
4. `ReportDeliveryTest` — Discord embed still extracts metrics when a
   summary section is present; `chatPayload` truncation unchanged.

## Release

Conventional commits on `feat/reports-human-recaps`, merge to `main`,
`npm run release`; deploy to bw-app on the next explicit "lanjut".

## Extension: report_summaries table + visual recap (2026-11-09, same day)

Goal: pre-existing reports also show the new recap format without touching
their raw content, plus a visual layer grounded in Zettly's zettelkasten
data (tags on todos/notes, session projects/categories).

- `report_summaries` (one row per report): `digest` (human paragraph) plus
  structured fields `projects_minutes` (json: project -> active seconds),
  `categories` (json: session category -> seconds), `tags` (json: tag name
  -> count, from todos completed/open in period and todos linked from
  journal entries in period).
- `ReportGenerator::generate()` upserts the row; the row is derived data —
  `Report.content` is never rewritten by anything in this feature.
- `reports:backfill-summaries` (idempotent) recomputes rows for legacy
  reports from the raw data, so old reports read with the new format.
- Index cards prefer the table's digest; the detail page leads with the
  digest + an "At a glance" panel (pure CSS bars for project share, tag
  chips with counts) and keeps the raw content below, unchanged.
- The `## Summary` paragraph optionally mentions up to three top tags.
