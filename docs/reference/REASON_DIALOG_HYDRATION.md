---
title: Reason Dialog Hydration Fix
last_updated: 2025-11-03
status: Implemented
---

## Overview
Fixed a critical issue where the reason dialog would show stale server validation errors from previous submissions even when the user entered new text. This affected all status transitions that require reasons: completing/pending todos, archiving/restoring todos, and updating priorities.

## Root Cause
The dialog component was displaying the previous submission's error message while the textarea had the new user input. This created a confusing UX where users would see "The reason field is required" even though they had entered text.

The issue occurred because:
1. Dialog opens with new error state from props
2. User enters text in textarea
3. User clicks Submit before component fully hydrated with new error state
4. Old error message still displays, causing validation to fail

## Solution

### 1. Hydration State Tracking
Added `isHydrated` state to `CompletionReasonDialog` that:
- Resets to `false` when dialog opens or error prop changes
- Sets to `true` after component renders with new state (via `setTimeout(..., 0)`)
- Disables submit button until `isHydrated === true`

**File:** `resources/js/Components/CompletionReasonDialog.jsx`

### 2. Form Transform Pattern
Updated all reason submission handlers to use Inertia's `transform()` method instead of `setData()`:
- Ensures the submitted payload always contains the current reason value from the dialog
- Prevents stale form data from being sent
- Applies consistently across all components

**Files Updated:**
- `resources/js/Components/ContextPanel.jsx` - Archive/restore actions
- `resources/js/Pages/Todos/Show.jsx` - Archive/restore actions
- `resources/js/Components/EisenhowerMatrix.jsx` - Toggle completion
- `resources/js/Components/KanbanBoard.jsx` - Toggle completion and priority updates

### 3. Transform Implementation Pattern
```javascript
form.transform(() => ({
    reason,
    _token: token ?? '',
}));

form.post(url, {
    onSuccess: () => {
        form.reset('reason');
        form.transform((data) => data); // Reset transform
    },
    onError: () => {
        form.transform(() => ({
            reason,
            _token: token ?? '',
        }));
    },
    onFinish: () => {
        form.transform((data) => data);
    },
});
```

## Testing
All reason dialog flows now have regression tests covering:
- Hydration state prevents premature submission
- Transform pattern used consistently
- Reason data submitted correctly on first attempt
- Error handling preserves user input

**Test File:** `resources/js/__tests__/dashboardWorkspace.test.js`

## Impact
- Users can now submit reasons on the first attempt without false validation errors
- Consistent UX across all status transition dialogs
- Prevents data loss from stale form submissions
