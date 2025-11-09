# Eisenhower Matrix

**Introduced in:** v0.7.0 (2025-10-22)

## Overview

Eisenhower Matrix workspace with drag-and-drop reordering and optimistic UI updates, allowing users to prioritize todos by urgency and importance.

## Core Features

### 1. Matrix Layout

- **Four Quadrants:**
  - **Do First** (Urgent & Important) — Crisis management, deadlines
  - **Schedule** (Important, Not Urgent) — Planning, prevention, improvement
  - **Delegate** (Urgent, Not Important) — Interruptions, some calls/emails
  - **Eliminate** (Neither) — Time wasters, pleasant activities

- **Visual Organization** — Color-coded quadrants
- **Drag & Drop** — Move todos between quadrants
- **Optimistic Updates** — UI updates immediately

### 2. Completion Reason Tracking

- **Reason Modal** — Prompt when completing todos
- **Reason Capture** — Document why work was completed
- **Audit Trail** — Track completion reasons in database
- **History** — Review past completion reasons

### 3. Quadrant Management

- **Reorder Within Quadrant** — Prioritize todos
- **Move Between Quadrants** — Update priority
- **Bulk Operations** — Select multiple todos
- **Quick Actions** — Complete, snooze, delete

### 4. Persistence

- **Database Sync** — Quadrant position saved
- **Order Tracking** — Maintain priority order
- **Status Updates** — Reflect in todo status

## Database Schema

### todos table (additions)
```sql
ALTER TABLE todos ADD COLUMN eisenhower_quadrant VARCHAR(50);
ALTER TABLE todos ADD COLUMN eisenhower_order INT DEFAULT 0;
```

### todo_status_events table
```sql
CREATE TABLE todo_status_events (
    id BIGINT PRIMARY KEY,
    todo_id BIGINT NOT NULL,
    event_type ENUM('completed', 'reopened', 'abandoned'),
    reason TEXT,
    created_at TIMESTAMP,
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
);
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/workspaces/{id}/eisenhower` | Get matrix |
| POST | `/todos/update-eisenhower` | Update quadrant |
| POST | `/todos/{id}/complete` | Complete with reason |
| POST | `/todos/{id}/reopen` | Reopen todo |

## Frontend Components

### Pages
- **Pages/Workspaces/Eisenhower.jsx** — Main matrix view

### Components
- **EisenhowerMatrix.jsx** — Matrix container
- **EisenhowerQuadrant.jsx** — Individual quadrant
- **EisenhowerCard.jsx** — Todo card
- **CompletionReasonDialog.jsx** — Reason capture modal
- **EisenhowerFilters.jsx** — Filter controls

## Features by Version

### v0.7.0 — Foundation
- Eisenhower matrix layout
- Drag and drop between quadrants
- Completion reason tracking
- Database-backed audit trails

### v0.7.1-v0.7.5 — Development
- Drag-and-drop harness tests
- Backend feature tests
- UI refinements
- Tag placement fixes

### v0.8.10 — Fetch API
- Switched to Fetch API for reorder requests
- Proper JSON/CSRF header handling
- Prevents Inertia response parsing errors

### v0.8.11 — CSRF Fix
- Removed manual token injection
- Rely on Inertia's global CSRF middleware
- Eliminates 419 errors

### v0.8.12 — JSON Response
- Reorder endpoint returns JSON instead of redirect
- Prevents page reload on successful reorder

### v0.8.20 — Response Handling
- Returned JSON responses for quadrant moves
- Eliminated "plain JSON response" redirect error

## Testing

Run Eisenhower tests:

```bash
php artisan test --filter=EisenhowerTest
npm test -- eisenhower.test.js
```

Coverage includes:
- Drag and drop between quadrants
- Reorder persistence
- Completion reason capture
- CSRF token handling
- Error recovery
- Keyboard navigation

## Key Bug Fixes

### v0.8.10 — Fetch API
**Problem:** Inertia response parsing errors on reorder
**Solution:** Use Fetch API with proper JSON/CSRF headers

### v0.8.11 — CSRF Token
**Problem:** Manual token injection causing 419 errors
**Solution:** Rely on Inertia's global CSRF middleware

### v0.8.12 — JSON Response
**Problem:** Redirect response causing page reload
**Solution:** Return JSON to maintain optimistic UI

### v0.8.20 — Response Handling
**Problem:** "Plain JSON response" error in production
**Solution:** Proper JSON response handling for quadrant moves

## Files Modified

- `app/Models/Todo.php` — Added eisenhower_quadrant and eisenhower_order
- `app/Models/TodoStatusEvent.php` — New model for reason tracking
- `app/Http/Controllers/TodoController.php` — Eisenhower endpoints
- `resources/js/Pages/Workspaces/Eisenhower.jsx` — Main page
- `resources/js/Components/EisenhowerMatrix.jsx` — Matrix component
- `resources/js/Components/EisenhowerQuadrant.jsx` — Quadrant component
- `resources/js/Components/EisenhowerCard.jsx` — Card component
- `resources/js/Components/CompletionReasonDialog.jsx` — Reason modal
- `database/migrations/*_add_eisenhower_to_todos.php` — Schema changes
- `tests/Feature/EisenhowerTest.php` — Test coverage

## Configuration

### Environment Variables
```env
EISENHOWER_ANIMATION_DURATION=200
EISENHOWER_REASON_REQUIRED=true
EISENHOWER_REASON_MIN_LENGTH=10
```

### Quadrant Colors
- Do First: Red (#EF4444)
- Schedule: Blue (#3B82F6)
- Delegate: Yellow (#FBBF24)
- Eliminate: Gray (#9CA3AF)

## Related Features

- v0.4.0 — Kanban workspace (alternative view)
- v0.4.5 — Workspace switcher
- v0.10.6 — Todo creation emails
- v0.2.0 — Completion reason tracking

## Future Enhancements

- Quadrant templates
- Auto-categorization by due date
- Priority scoring algorithm
- Time tracking per quadrant
- Quadrant analytics
- Team matrix collaboration
