# Zettly UI/UX Batch 1 — ZET-UI-003 alignment (2026-11-28)

## Intent

Bring the five core daily-workspace pages into line with ZET-UI-003 so the layout is calm, full-width and usable one-handed on a phone. This is Todo #1120 in focus 207 (weekend UI/UX remediation), deliberately chosen instead of the two tasks owned by the active HELLOWORLD sessions.

## Goals

- Journal, Calendar, Focus Board, Todo Board and Report Detail use the full-width container supplied by `AppLayout`/`DashboardLayout` instead of adding their own narrow `max-w-*` wrapper.
- Headings are compact (`text-xl` / `text-2xl`, `font-semibold`) instead of oversized.
- Calendar and Focus Board stop striking through todo titles; completion stays visible through colour, a check icon and a status label.
- Phone controls have at least 44x44px touch targets, verified at a 390px viewport.
- Regression tests guard these properties.

## Non-goals

- No data model, API or route contract changes.
- No changes to the HELLOWORLD-owned Clinic or staging-decommission work.
- No new frontend framework or design system; existing Tailwind classes are reused.

## Constraints

- The repo already has `AppLayout` and `DashboardLayout` providing `w-full px-4 sm:px-6 lg:px-8`; page-level narrow wrappers are redundant.
- New AGENTS.md rule: mobile-first design and verification at 360-390px with 44x44px touch targets before desktop.

## Approaches considered

1. **Replace the page-level wrappers and headings in place (chosen).** Small, reversible diff; keeps each page's structure and behaviour; directly removes the violation classes. Trade-off: five similar edits plus shared header controls.
2. **Introduce a shared `<FluidPage>` component.** More DRY, but a larger refactor across five pages with higher regression risk for a cosmetic batch. Rejected for this small change.
3. **Override with global CSS.** Would hide the violations from source-level tests and could affect unrelated pages. Rejected.

## Decision

Approach 1. All modified production files carry `@zettly-code` annotations; `resources/js/__tests__/uiBatch1.test.js` is the regression guard.

## Builder notes

- The 390px browser check covered `/journal`, `/calendar` and `/focus`: no horizontal scrolling and zero sub-44px targets.
- `/todos/board` could not be rendered in this local checkout because `resources/js/Pages/Todos/Board.jsx` is missing from the Vite manifest (pre-existing local build-input gap); its source-level assertions still pass.
- `/reports` index also has pre-existing small filter buttons outside this batch's five target files.
- Rollback: revert the nine source files and the test file; no schema, data or secrets are involved.
