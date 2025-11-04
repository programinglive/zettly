# Kanban Board Reorder Debug Guide

This guide explains how to debug and test the Kanban board reordering functionality.

## Quick Start

### Enable Debug Mode (Super Admins Only)

1. Open browser DevTools (F12)
2. Run in console:
```javascript
localStorage.setItem('zettly-debug-mode', 'true');
window.dispatchEvent(new CustomEvent('zettly:debug-mode-changed', { detail: { enabled: true } }));
```
3. Refresh the page
4. A debug panel will appear in the bottom-right corner

### Disable Debug Mode

```javascript
localStorage.setItem('zettly-debug-mode', 'false');
window.dispatchEvent(new CustomEvent('zettly:debug-mode-changed', { detail: { enabled: false } }));
```

## Debug Panel Features

The ReorderDebug component provides real-time monitoring of:

- **Drag Events**: Counts how many drag operations have been initiated
- **Reorder Requests**: Counts how many reorder API calls have been made
- **Live Logs**: Shows detailed logs of all drag and reorder events
- **Error Logging**: Captures and displays any errors that occur

### Log Types

- 🎯 **Info**: General drag start/end events
- 📤 **Request**: Reorder API requests with column and todo IDs
- ✅ **Success**: Successful reorder responses
- ❌ **Error**: Failed reorder requests with error details

## Console Debug Script

For manual testing without the UI, use the console script:

```javascript
// Load the debug script
const script = document.createElement('script');
script.src = '/debug-reorder.js';
document.head.appendChild(script);
```

### Manual Reorder Test

```javascript
// Test reordering todos in Q1 column with IDs 1, 2, 3
window.testReorder('q1', [1, 2, 3]);
```

## What to Check When Reordering Doesn't Work

### 1. Check Network Request

1. Open DevTools → Network tab
2. Drag a todo card
3. Look for POST request to `/todos/reorder`
4. Check response:
   - **Status 200**: Request succeeded
   - **Status 401**: Not authenticated
   - **Status 403**: Permission denied
   - **Status 422**: Validation error (check response body)
   - **Status 500**: Server error

### 2. Check Response Format

The response should be JSON:
```json
{
  "message": "Todo order updated successfully",
  "ordered_count": 4,
  "column": "q1"
}
```

### 3. Check Browser Console

Look for error messages:
- `Reorder failed: ...` - API error
- `Drag started/ended` - Drag events firing
- CORS errors - Cross-origin issues

### 4. Check Database

Verify the `kanban_order` was actually updated:

```bash
php artisan tinker
$user = User::first();
$todos = $user->todos()->where('importance', 'important')->where('priority', 'urgent')->orderBy('kanban_order')->get(['id', 'title', 'kanban_order']);
$todos->each(fn($t) => echo $t->id . ': ' . $t->title . ' (order: ' . $t->kanban_order . ")\n");
```

## Common Issues & Solutions

### Issue: Todos revert to original position after drag

**Cause**: The reorder request is failing or the response isn't being handled correctly.

**Solution**:
1. Check the Network tab for the `/todos/reorder` request
2. Verify the response status is 200
3. Check the response body is valid JSON
4. Look for error messages in the console

### Issue: Drag events not firing

**Cause**: Drag-and-drop listeners aren't attached or are being blocked.

**Solution**:
1. Check that the drag handle (⋮) is visible on todo cards
2. Verify you're dragging from the handle, not the card itself
3. Check browser console for JavaScript errors
4. Try refreshing the page

### Issue: Request fails with 422 validation error

**Cause**: Invalid data being sent to the server.

**Solution**:
1. Check the request payload in Network tab
2. Verify `column` is one of: q1, q2, q3, q4, completed
3. Verify `todo_ids` is an array of integers
4. Check that all todo IDs belong to the current user

### Issue: Request fails with 500 error

**Cause**: Server-side error in the reorder logic.

**Solution**:
1. Check Laravel logs: `storage/logs/laravel.log`
2. Look for database transaction errors
3. Verify the `kanban_order` column exists in the database
4. Run migrations if needed: `php artisan migrate`

## Testing Checklist

- [ ] Debug panel shows "Monitoring" status
- [ ] Drag event counter increments when dragging
- [ ] Reorder request counter increments after drop
- [ ] Network tab shows 200 status for `/todos/reorder`
- [ ] Response contains valid JSON
- [ ] Todo position persists after page refresh
- [ ] Database `kanban_order` values are correct
- [ ] No errors in browser console
- [ ] No errors in Laravel logs

## Performance Monitoring

The debug panel helps identify performance issues:

- **High drag event count**: May indicate duplicate listeners or event bubbling
- **Failed reorder requests**: Check network tab and server logs
- **Slow responses**: Check database query performance

## Disabling Debug Mode in Production

Debug mode is only available to super admins and is disabled by default. To ensure it's disabled:

```bash
# Clear localStorage on all clients
# Or set in .env:
DEBUG_MODE_ENABLED=false
```

## Related Documentation

- [KANBAN_REORDERING.md](./KANBAN_REORDERING.md) - Implementation details
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API endpoint reference
