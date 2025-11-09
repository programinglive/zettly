# Kanban Workspace

**Introduced in:** v0.4.0 (2025-10-18)

## Overview

Kanban workspace with drag-and-drop reordering and optimistic UI updates, allowing users to organize todos in a visual column-based layout.

## Core Features

### 1. Kanban Board

- **Columns** — Customizable status columns (Todo, In Progress, Done, etc.)
- **Cards** — Todos displayed as draggable cards
- **Drag & Drop** — Reorder todos within and between columns
- **Optimistic Updates** — UI updates immediately before server confirmation
- **Error Recovery** — Revert to original state if reorder fails

### 2. Column Management

- **Create Columns** — Add custom status columns
- **Rename Columns** — Update column names
- **Delete Columns** — Remove columns (with confirmation)
- **Reorder Columns** — Drag columns to change order
- **Column Settings** — Configure per-column behavior

### 3. Card Operations

- **View Details** — Click card to open full todo
- **Quick Edit** — Inline editing for title/description
- **Status Change** — Drag between columns to update status
- **Bulk Actions** — Select multiple cards for batch operations
- **Filtering** — Filter cards by tag, project, assignee

### 4. Persistence

- **Database Sync** — Reorder updates saved to database
- **Kanban Order Column** — `kanban_order` tracks position
- **Legacy Support** — Guard clauses for missing column
- **Concurrent Updates** — Handle simultaneous reorders

## Database Schema

### todos table (additions)
```sql
ALTER TABLE todos ADD COLUMN kanban_order INT DEFAULT 0;
ALTER TABLE todos ADD COLUMN kanban_column VARCHAR(255);
```

### kanban_columns table
```sql
CREATE TABLE kanban_columns (
    id BIGINT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    position INT DEFAULT 0,
    color VARCHAR(7),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/workspaces/{id}/kanban` | Get kanban board |
| POST | `/todos/reorder` | Update todo order |
| POST | `/kanban/columns` | Create column |
| PATCH | `/kanban/columns/{id}` | Update column |
| DELETE | `/kanban/columns/{id}` | Delete column |
| POST | `/kanban/columns/reorder` | Reorder columns |

## Frontend Components

### Pages
- **Pages/Workspaces/Kanban.jsx** — Main kanban board view

### Components
- **KanbanBoard.jsx** — Board container and layout
- **KanbanColumn.jsx** — Individual column
- **KanbanCard.jsx** — Todo card with drag handle
- **KanbanColumnHeader.jsx** — Column title and actions
- **KanbanFilters.jsx** — Filter controls

## Features by Version

### v0.4.0 — Foundation
- Basic kanban board layout
- Column structure
- Card display

### v0.4.1-v0.4.11 — Development
- Drag and drop implementation
- Backend reorder endpoint
- UI refinements

### v0.8.12 — JSON Response Fix
- Changed reorder endpoint to return JSON instead of redirect
- Prevents page reload on successful reorder

### v0.8.13 — Success Handling
- Fixed onSuccess handler to rely on optimistic updates
- Removed assumption of Inertia page props

### v0.8.14 — Error Recovery
- Save original state before optimistic update
- Revert to original on error

### v0.8.16 — Fetch API
- Switched to Fetch API for reorder requests
- Proper JSON/CSRF header handling

### v0.8.18 — Sync Improvements
- Sync local todo ordering immediately after drag
- UI reflects updated sequence without reload

### v0.9.0 — Drag Ordering Fix
- Fixed downward drag insertion logic
- Optimistic updates now match persisted order

## Testing

Run kanban tests:

```bash
php artisan test --filter=KanbanTest
npm test -- kanban.test.js
```

Coverage includes:
- Drag and drop operations
- Reorder persistence
- Error recovery
- Column management
- Concurrent updates
- Legacy database support

## Key Bug Fixes

### v0.8.12 — Reorder Endpoint
**Problem:** Endpoint returned redirect, causing page reload
**Solution:** Changed to JSON response

### v0.8.13 — Success Handler
**Problem:** onSuccess tried to refresh from page.props
**Solution:** Rely on optimistic updates already applied

### v0.8.14 — Error Recovery
**Problem:** Todos reverted to wrong state on error
**Solution:** Save original state before optimistic update

### v0.8.16 — CSRF Handling
**Problem:** Inertia response parsing errors
**Solution:** Use Fetch API with proper headers

### v0.9.0 — Drag Ordering
**Problem:** Downward drags inserted at wrong position
**Solution:** Fixed insertion logic to match persisted order

## Files Modified

- `app/Models/Todo.php` — Added kanban_order and kanban_column
- `app/Http/Controllers/TodoController.php` — Reorder endpoint
- `resources/js/Pages/Workspaces/Kanban.jsx` — Main page
- `resources/js/Components/KanbanBoard.jsx` — Board component
- `resources/js/Components/KanbanColumn.jsx` — Column component
- `resources/js/Components/KanbanCard.jsx` — Card component
- `database/migrations/*_add_kanban_to_todos.php` — Schema changes
- `tests/Feature/KanbanTest.php` — Test coverage

## Configuration

### Environment Variables
```env
KANBAN_COLUMNS_DEFAULT=todo,in_progress,done
KANBAN_CARD_HEIGHT=120
KANBAN_ANIMATION_DURATION=200
```

## Related Features

- v0.7.0 — Eisenhower Matrix (alternative workspace)
- v0.4.5 — Workspace switcher
- v0.10.6 — Todo creation emails

## Future Enhancements

- Column templates
- Card templates
- Swimlanes (group by assignee/project)
- Burndown charts
- Cycle time metrics
- Integration with external services
