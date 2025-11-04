# Enable Reorder Debug Panel

## Quick Steps

1. **Open browser DevTools** (Press `F12`)
2. **Go to Console tab**
3. **Copy and paste this command:**

```javascript
localStorage.setItem('zettly-debug-mode', 'true');
window.dispatchEvent(new CustomEvent('zettly:debug-mode-changed', { detail: { enabled: true } }));
location.reload();
```

4. **Press Enter**
5. **Refresh the page** (or it will auto-refresh)

## What You'll See

A debug panel will appear in the **bottom-right corner** showing:
- 🎯 **Drag Events**: Count of drag operations
- 📤 **Reorder Requests**: Count of API calls
- **Live Logs**: Real-time events with timestamps

## How to Test

1. **Drag a todo card** to a different position
2. **Watch the debug panel** for:
   - "🎯 Drag started" message
   - "📤 Reorder request" message
   - "✅ Reorder successful" or "❌ Reorder error"

## Disable Debug Mode

```javascript
localStorage.setItem('zettly-debug-mode', 'false');
location.reload();
```

## Check Browser Console

Open DevTools Console (F12) and look for:
- `🔍 Debug mode initialized: true`
- `🔍 ReorderDebug component mounted`

These messages confirm the debug panel is active.

## If Debug Panel Still Doesn't Show

1. Check browser console for errors
2. Make sure localStorage is enabled
3. Try hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
4. Check that you're on the Dashboard page
