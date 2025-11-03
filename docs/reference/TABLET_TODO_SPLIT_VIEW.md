---
title: Tablet Todo Split View
last_updated: 2025-11-03
status: Draft
---

## Overview
The tablet experience for the Todos dashboard now keeps the list visible while rendering the selected todo in a right-hand context drawer. The detail panel mirrors the desktop detail view, including actions, attachments, and linked todos.

## Key Behaviors
- **Split layout:** On tablet breakpoints, the Eisenhower matrix and Kanban views keep the task list on the left and open the context drawer on the right.
- **Action bar:** All todo actions (complete/pending toggle, archive/restore, edit, delete) are now exposed as compact, icon-only buttons with accessible titles.
- **Dialogs:** Completion, archive, restore, and delete flows continue to use the existing reason dialog and confirmation modal to capture required metadata.
- **Attachments:** Drawing thumbnails and other attachments render inside the panel, reusing the same attachment card layout as desktop.

## Testing Notes
Run `npm test -- dashboardWorkspace.test.js` to verify the dashboard-specific assertions, including the presence of the icon-only action bar and attachments section.
