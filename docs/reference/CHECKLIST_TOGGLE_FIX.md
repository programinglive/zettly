# Checklist Toggle Endpoint Fix

## Summary
- Added `toggleChecklistItem` action in `TodoController` to flip checklist item completion state while enforcing todo ownership.
- Endpoint responds with JSON for API clients and redirects for web flows.
- New feature test `test_user_can_toggle_checklist_item_completion` ensures the route toggles state twice reliably.

## Route
```
PATCH /todos/{todo}/checklist/{checklistItem}/toggle
```

## Behaviour
1. Verifies authenticated user owns the parent todo (403 otherwise).
2. Validates checklist item belongs to todo (404 if mismatched).
3. Toggles `is_completed`, persists, and returns:
   - JSON payload `{ message, id, is_completed }` for API consumers.
   - Redirect with success flash for Inertia/browser usage.

## Regression Coverage
Located in `tests/Feature/TodoTest.php` the new test covers:
- Initial false -> true transition
- Subsequent true -> false transition

Run `php artisan test tests/Feature/TodoTest.php` to validate.
