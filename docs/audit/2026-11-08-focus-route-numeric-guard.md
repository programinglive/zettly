# Focus Route Numeric Guard Audit & Fix (Sentry Issue 7809625290)

**Date**: 2026-11-08  
**Author**: Antigravity Assistant & MMCH Agent  
**Target Issue**: Sentry `todoapp` #7809625290 (`SQLSTATE[22P02]: Invalid text representation: 7 ERROR: invalid input syntax for type bigint: "undefined"`)  
**Affected Endpoint**: `POST /api/v1/focus/{focus}/complete`  

## Root Cause
When client applications inadvertently send non-numeric string literals like `"undefined"` or `"null"` as the `{focus}` route parameter, Laravel route model binding attempts to execute a query against PostgreSQL:
```sql
SELECT * FROM foci WHERE id = 'undefined' LIMIT 1;
```
Because the `id` column in PostgreSQL is typed as `bigint`, PostgreSQL immediately aborts the query with fatal error `SQLSTATE[22P02]`, throwing an unhandled `Illuminate\Database\QueryException` and returning HTTP 500.

## Solution
1. **Global Route Patterns**:
   Registered `Route::pattern('focus', '[0-9]+');` and `Route::pattern('todo', '[0-9]+');` in `app/Providers/AppServiceProvider.php` inside `boot()`.
2. **Explicit Route Constraints**:
   Added `->whereNumber('focus')` on:
   - `PUT /focus/{focus}`, `POST /focus/{focus}/complete`, `DELETE /focus/{focus}` in `routes/web.php`
   - `PUT /focus/{focus}`, `POST /focus/{focus}/complete`, `DELETE /focus/{focus}` in `routes/api.php`
   - `GET /api/v1/focus/{focus}`, `PUT /api/v1/focus/{focus}`, `DELETE /api/v1/focus/{focus}`, `POST /api/v1/focus/{focus}/complete` in `routes/api.php`
3. **Verification**:
   Any non-numeric focus ID is now rejected at the routing layer and returns HTTP 404 Not Found immediately without triggering any database queries.

## Test Coverage
- `tests/Feature/FocusRouteValidationTest.php`:
  - `test_non_numeric_focus_id_returns_404_without_executing_database_query`: Verifies 404 response and zero DB queries on `/api/v1/focus/undefined/complete`.
  - `test_all_focus_endpoints_reject_non_numeric_ids`: Tests 10 distinct GET, PUT, POST, DELETE endpoints with `undefined`.
  - `test_valid_numeric_focus_id_routes_properly`: Verifies numeric IDs continue to route and complete focuses as expected.
