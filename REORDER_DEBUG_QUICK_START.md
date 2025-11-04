# Quick Start: Debug Kanban Reorder

## Enable Debug Panel (Super Admin Only)

Open browser console (F12) and run:

```javascript
localStorage.setItem('zettly-debug-mode', 'true');
window.dispatchEvent(new CustomEvent('zettly:debug-mode-changed', { detail: { enabled: true } }));
location.reload();
```

A debug panel will appear in the bottom-right corner of the dashboard.

## What to Look For

### 1. Drag Events Counter
- Should increment when you drag a todo card
- If it doesn't increment, drag-and-drop isn't working

### 2. Reorder Requests Counter
- Should increment after you drop a todo
- If it doesn't, the request isn't being sent

### 3. Live Logs
- 🎯 Drag started/ended
- 📤 Reorder request sent (shows column and todo IDs)
- ✅ Reorder successful
- ❌ Reorder failed (shows error)

### 4. Network Tab
1. Open DevTools → Network tab
2. Drag a todo
3. Look for POST `/todos/reorder`
4. Check response status (should be 200)
5. Check response body (should be JSON)

## Common Issues

| Issue | Check |
|-------|-------|
| Todos revert after drag | Network tab - is request 200? |
| Drag not working | Is drag handle (⋮) visible? |
| Request fails | Network tab - what's the error status? |
| Database not updating | Check Laravel logs |

## Manual Test

```javascript
// Test reordering todos in Q1 column
window.testReorder('q1', [1, 2, 3]);
```

## Full Documentation

See `docs/reference/REORDER_DEBUG.md` for complete troubleshooting guide.
