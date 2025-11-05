---
title: Todo Completion Entry Points
description: Reference for every place in the product that can complete or reopen a todo.
---

## Overview

Todos can flip between **pending** and **completed** from several surfaces. Each action now requires a reason, which is stored in `todo_status_events`. Use this guide to locate the relevant UI and backend code when adjusting completion behavior.

## Backend endpoints

| Action | Route | Controller method | Notes |
| ------ | ----- | ----------------- | ----- |
| Toggle status | `POST /todos/{todo}/toggle` | `TodoController::toggle` @app/Http/Controllers/TodoController.php#562-615 | Validates `reason`, flips status, creates `TodoStatusEvent`. Used by dialogs across the app.
| Update priority/status | `POST /todos/{todo}/update-priority` | `TodoController::updatePriority` @app/Http/Controllers/TodoController.php#630-692 | When payload includes `is_completed`, frontend supplies `reason`. Kanban drag-and-drop calls this.
| Update Eisenhower quadrant | `POST /todos/{todo}/update-eisenhower` | `TodoController::updateEisenhower` @app/Http/Controllers/TodoController.php#729-780 | Tasks only; rejects completed todos. Frontend callers should ensure a reason when converting to/from completed state.
| Full edit update | `POST /todos/{todo}` with `_method=PUT` | `TodoController::update` @app/Http/Controllers/TodoController.php#378-545 | Accepts `reason` when the todo is marked completed via edit form.
| Archive single todo | `POST /todos/{todo}/archive` | `TodoController::archive` @app/Http/Controllers/TodoController.php#934-972 | Requires `reason`, flips todo to archived, records status event from pending/completed → archived.
| Restore archived todo | `POST /todos/{todo}/restore` | `TodoController::restore` @app/Http/Controllers/TodoController.php#975-1000 | Requires `reason`, unarchives todo and records archived → pending/completed transition.
| Bulk archive completed todos | `POST /todos/archive-completed` | `TodoController::archiveCompleted` @app/Http/Controllers/TodoController.php#900-932 | Frontend collects a single reason that is stored once per todo via status events.

## Frontend entry points

### Todo detail page
- File: `resources/js/Pages/Todos/Show.jsx` @resources/js/Pages/Todos/Show.jsx#1-415
- The “Mark complete” / “Completed” chip opens `CompletionReasonDialog` and posts to `/todos/{id}/toggle`.
- The **Status history** panel (under “More details”) renders data from `statusEvents` shared by the controller. Each entry shows the transition, author, timestamp, and reason captured in `todo_status_events`.

### Todos index grid
- File: `resources/js/Pages/Todos/Index.jsx` @resources/js/Pages/Todos/Index.jsx#1-294
- Each card’s toggle button opens the reason dialog before calling the toggle endpoint.

### Completed todos list
- File: `resources/js/Pages/Todos/Completed.jsx` @resources/js/Pages/Todos/Completed.jsx#1-243
- “Mark as active” uses the same dialog to justify reopening a todo.

### Kanban board
- File: `resources/js/Components/KanbanBoard.jsx` @resources/js/Components/KanbanBoard.jsx#1-801
- Checkbox toggles open the dialog.
- Dragging into/out of Completed triggers the dialog and posts `/update-priority` with reason; optimistic UI reverts on failure.
- “Archive completed” now collects one reason applied to every completed todo in the bulk request.

### Edit form
- File: `resources/js/Pages/Todos/Edit.jsx` @resources/js/Pages/Todos/Edit.jsx#27-276
- Checking “Mark as completed” reveals a textarea that sends `reason` with the PUT request.

### Eisenhower matrix
- File: `resources/js/Components/EisenhowerMatrix.jsx`
- Dragging tasks uses `/todos/{id}/update-eisenhower` to move between quadrants. Completed todos are rejected and should be toggled back to pending (with reason) before repositioning.
- **CSRF Token Handling**: The component relies on Inertia's global middleware (`app.jsx`) to automatically inject the CSRF token into request headers. Do NOT manually add `_token` to the payload—this causes conflicts and results in 419 errors.

## Shared components & data

- Dialog component: `CompletionReasonDialog` @resources/js/Components/CompletionReasonDialog.jsx#1-98
- Status event model: `App\Models\TodoStatusEvent` @app/Models/TodoStatusEvent.php#1-22
- Relation: `Todo::statusEvents()` @app/Models/Todo.php#97-100
- Migration: `database/migrations/2025_11_02_153500_create_todo_status_events_table.php`
- Factory: `Database\Factories\TodoStatusEventFactory` @database/factories/TodoStatusEventFactory.php#1-49 (used for regression coverage)
- Feature test: `Tests\Feature\TodoTest::test_user_can_view_todo` @tests/Feature/TodoTest.php#237-270 now asserts the status history payload.

## Follow-up

- Pending tests: add feature tests covering reason validation and event creation for toggle/update flows.
- Keep this document updated as new completion surfaces are introduced.
