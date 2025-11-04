# Kanban Board Reordering

## Overview

The Kanban board supports drag-and-drop reordering of todos within and across columns. When a todo is dragged to a new position, its `kanban_order` value is updated to reflect the new position within the column.

## How It Works

### Frontend (React/Inertia)

The `KanbanBoard` component uses `@dnd-kit` for drag-and-drop functionality:

1. **Drag Detection**: When a user drags a todo card, the `handleDragEnd` event is triggered
2. **Column Resolution**: The target column is determined by:
   - If dropped directly on a column header, use that column
   - If dropped on another todo, use that todo's column
3. **State Update**: The todo's properties are updated based on the target column:
   - Q1 (Important + Urgent): `importance: 'important'`, `priority: 'urgent'`
   - Q2 (Important + Not Urgent): `importance: 'important'`, `priority: 'not_urgent'`
   - Q3 (Not Important + Urgent): `importance: 'not_important'`, `priority: 'urgent'`
   - Q4 (Not Important + Not Urgent): `importance: 'not_important'`, `priority: 'not_urgent'`
   - Completed: `is_completed: true`, `priority: null`, `importance: null`
4. **Server Sync**: A POST request to `/todos/reorder` is sent with:
   - `column`: The target column (q1, q2, q3, q4, or completed)
   - `todo_ids`: Array of todo IDs in their new order within the column

### Backend (Laravel)

The `TodoController::reorder()` method:

1. **Validates** the request (column must be valid, todo_ids must be integers)
2. **Filters** todos to only include:
   - Todos belonging to the authenticated user
   - Todos in the specified column
   - Non-archived todos
3. **Calculates** the final order:
   - Reordered todos come first (in the order specified)
   - Remaining todos follow (in their current order)
4. **Updates** `kanban_order` values in a database transaction
5. **Returns** a success response with the count of reordered todos

## Database Schema

The `todos` table includes:

- `kanban_order` (integer): Position within the column (1-indexed)
- `is_completed` (boolean): Whether the todo is completed
- `priority` (enum): 'urgent' or 'not_urgent' (null for completed todos)
- `importance` (enum): 'important' or 'not_important' (null for completed todos)

## API Endpoint

### POST `/todos/reorder`

**Request Body:**
```json
{
  "column": "q1",
  "todo_ids": [5, 3, 7, 1]
}
```

**Response (JSON):**
```json
{
  "message": "Todo order updated successfully",
  "ordered_count": 4,
  "column": "q1"
}
```

**Response (Redirect):**
Redirects back with session message: "Todo order updated successfully"

## Testing

### Backend Test

Located in `tests/Feature/KanbanDragDropTest.php`:

```php
public function test_user_can_reorder_todos_within_a_column(): void
{
    // Creates three todos in Q1 column
    // Reorders them by sending todo_ids in new order
    // Asserts kanban_order values are updated correctly
}
```

Run with:
```bash
php artisan test tests/Feature/KanbanDragDropTest.php
```

### Frontend Tests

Located in `tests/js/KanbanReorder.test.js`:

- Verifies `/todos/reorder` endpoint is called
- Checks payload includes `column` and `todo_ids`
- Confirms `getColumnKey` function determines target column
- Validates todo state is updated after drag

Run with:
```bash
npm test
```

## Common Issues

### Reordering Not Working

1. **Check Network Tab**: Verify the POST request to `/todos/reorder` is being sent
2. **Check Response**: Ensure the response is 200 OK
3. **Check Permissions**: User must own all todos being reordered
4. **Check Column**: Todos must be in the same column (or moving to a valid target column)

### Todos Reverting to Original Position

- This happens if the server request fails
- Check browser console for error messages
- Verify user is authenticated and has permission

## Implementation Details

### Column Key Resolution

The `getColumnKey()` function determines which column a todo belongs to:

```javascript
const getColumnKey = (todo) => {
    if (todo.is_completed) return 'completed';
    
    const importance = todo.importance ?? 'not_important';
    const priority = todo.priority ?? 'not_urgent';
    
    if (importance === 'important' && priority === 'urgent') return 'q1';
    if (importance === 'important' && priority === 'not_urgent') return 'q2';
    if (importance === 'not_important' && priority === 'urgent') return 'q3';
    return 'q4';
};
```

### Order Calculation

When reordering, the backend:

1. Gets all todos in the target column
2. Filters to only those in the `todo_ids` array (in order)
3. Appends remaining todos not in the array
4. Updates `kanban_order` starting from 1

Example:
- Current order: [A(1), B(2), C(3), D(4)]
- Request: `todo_ids: [B, A]`
- Result: [B(1), A(2), C(3), D(4)]

## Related Features

- **Drag-and-Drop**: Uses `@dnd-kit/core` and `@dnd-kit/sortable`
- **Priority Updates**: When moving between columns, priority/importance are updated
- **Completion Tracking**: Moving to "Completed" column marks todo as complete
- **Status Events**: Completion status changes are recorded in `todo_status_events`
