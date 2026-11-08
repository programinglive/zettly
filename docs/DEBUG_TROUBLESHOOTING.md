# Debug Panel Troubleshooting

## Debug Panel is Showing But No Events

### Issue: Drag Events Counter Not Incrementing

**Cause**: The drag events aren't being detected.

**Solution**:
1. Make sure you're dragging from the **drag handle** (⋮ icon)
2. Check browser console (F12) for these messages:
   - `🎯 Pointer down on draggable` - Should appear when you click the handle
   - `🎯 Drag started (pointer)` - Should appear when dragging

3. If you see these messages but counter doesn't increment:
   - Try refreshing the page
   - Check that debug panel is showing "Monitoring" (green button)

### Issue: Reorder Requests Counter Not Incrementing

**Cause**: The reorder API isn't being called.

**Solution**:
1. Check that drag events are working first (see above)
2. After dragging, check for these console messages:
   - `📤 Reorder request: column=q1, ids=[...]` - Request was sent
   - `✅ Reorder successful` - Request succeeded
   - `❌ Reorder error: ...` - Request failed

3. Check Network tab (DevTools → Network):
   - Look for POST request to `/todos/reorder`
   - Check response status (should be 200)
   - Check response body (should be JSON)

## Debug Panel Not Showing At All

### Issue: Debug Panel Invisible

**Cause**: Debug mode not enabled or panel is off-screen.

**Solution**:
1. Check browser console for:
   ```
   🔍 Debug mode initialized: true
   🔍 ReorderDebug component mounted
   ```

2. If you don't see these messages:
   - Re-run the enable command:
   ```javascript
   localStorage.setItem('zettly-debug-mode', 'true');
   window.dispatchEvent(new CustomEvent('zettly:debug-mode-changed', { detail: { enabled: true } }));
   location.reload();
   ```

3. If panel is off-screen:
   - Look in bottom-right corner
   - Try scrolling right on the page
   - Check if browser zoom is too high (try Ctrl+0 to reset)

### Issue: Debug Mode Won't Enable

**Cause**: localStorage might be disabled or there's a JavaScript error.

**Solution**:
1. Check browser console for errors (F12 → Console)
2. Verify localStorage is enabled:
   ```javascript
   localStorage.setItem('test', 'true');
   localStorage.getItem('test'); // Should return 'true'
   ```

3. Try clearing localStorage and re-enabling:
   ```javascript
   localStorage.clear();
   localStorage.setItem('zettly-debug-mode', 'true');
   location.reload();
   ```

## Console Messages Reference

### Expected Messages When Debug Starts
```
🔍 Debug mode initialized: true
🔍 ReorderDebug component mounted
✓ Router.post intercepted
```

### Expected Messages When Dragging
```
🎯 Pointer down on draggable
🎯 Drag started (pointer)
```

### Expected Messages When Reordering
```
📤 Reorder request: column=q1, ids=[1,2,3]
✅ Reorder successful
```

### Error Messages
```
❌ Reorder error: {"message":"..."}
```

## Testing Checklist

- [ ] Debug panel visible in bottom-right corner?
- [ ] "Monitoring" button shows green?
- [ ] Console shows `🔍 Debug mode initialized: true`?
- [ ] Console shows `✓ Router.post intercepted`?
- [ ] Drag handle (⋮) visible on todo cards?
- [ ] Clicking drag handle shows `🎯 Pointer down on draggable`?
- [ ] Dragging shows `🎯 Drag started (pointer)`?
- [ ] Dropping shows `📤 Reorder request`?
- [ ] Response shows `✅ Reorder successful`?

## Network Tab Inspection

1. Open DevTools (F12)
2. Go to Network tab
3. Drag a todo card
4. Look for POST request to `/todos/reorder`
5. Click on the request to see:
   - **Headers**: Should have `X-CSRF-TOKEN` and `X-Requested-With`
   - **Payload**: Should show `column` and `todo_ids`
   - **Response**: Should be JSON with `message` field

## Browser Console Commands

### Check Debug Status
```javascript
localStorage.getItem('zettly-debug-mode')
```

### Enable Debug Mode
```javascript
localStorage.setItem('zettly-debug-mode', 'true');
window.dispatchEvent(new CustomEvent('zettly:debug-mode-changed', { detail: { enabled: true } }));
location.reload();
```

### Disable Debug Mode
```javascript
localStorage.setItem('zettly-debug-mode', 'false');
location.reload();
```

### Check Router
```javascript
console.log('Router available:', !!window.router);
console.log('Router.post available:', typeof window.router?.post);
```

## PWA Installation & Banner Troubleshooting

### Check PWA State
```javascript
// Check if install banner is dismissed
console.log('PWA dismissed:', localStorage.getItem('zettly-pwa-install-dismissed'));

// Check service worker registration
navigator.serviceWorker.getRegistrations().then(r => console.log('SW count:', r.length));

// Reset install banner dismissal (to re-test banner display)
localStorage.removeItem('zettly-pwa-install-dismissed');
location.reload();
```

### Banner Lifecycle & Dismissal Rules
- **Standalone Mode**: If launched as installed PWA (`display-mode: standalone`), the install prompt is never rendered.
- **appinstalled Event**: When installation completes (either via browser omnibox or prompt dialog), `zettly-pwa-install-dismissed` is marked as `'1'`.
- **Dismissal Persistence**: Once dismissed via "Maybe later" or upon completing the install prompt, the banner remains hidden across reloads and browser sessions.

## Still Not Working?

1. **Check browser console** for any JavaScript errors
2. **Check Laravel logs** at `storage/logs/laravel.log`
3. **Try different browser** to rule out browser-specific issues
4. **Hard refresh** with Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
5. **Clear browser cache** and try again

## Related Documentation

- [ENABLE_DEBUG.md](./ENABLE_DEBUG.md) - How to enable debug mode
- [REORDER_DEBUG.md](./docs/reference/REORDER_DEBUG.md) - Complete debug guide
- [KANBAN_REORDERING.md](./docs/reference/KANBAN_REORDERING.md) - Reorder implementation

## WebSocket & Pusher Broadcasting Limits (Sentry TODOAPP-3F)

### Issue: Pusher HTTP 413 Payload Too Large
Pusher has a strict 10,240 byte (10 KB) limit on event broadcast bodies. When broadcasting large TLDraw or Draw canvases, JSON escaping of quotes and Unicode expands the raw document payload size by 20–30%.

### Solution:
1. **Conservative Backend Thresholds**:
   - `DrawingUpdated::MAX_DOCUMENT_BYTES` set to `4000` bytes.
   - `DrawingUpdated::MAX_EVENT_BYTES` set to `6500` bytes.
   - `TLDrawUpdated::MAX_DOCUMENT_BYTES` set to `4000` bytes.
   - `TLDrawUpdated::MAX_EVENT_BYTES` set to `6500` bytes.
   - When a document exceeds these bounds, `document` is stripped and broadcast with `document_too_large: true` and `error: 'payload_exceeds_limit'`.
2. **Frontend Large-Document Refetch Fallback**:
   - In `resources/js/Pages/Draw/Index.jsx` and `resources/js/hooks/useTLDrawSync.js`, when `document_too_large` or an omitted document is received, clients automatically refetch the full drawing via `GET /drawings/:id` to maintain real-time sync without exceeding Pusher's payload limits.

