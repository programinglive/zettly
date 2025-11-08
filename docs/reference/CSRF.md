---
title: CSRF Handling
---

# CSRF Handling in Zettly

This document collects all project-specific conventions for preventing `419 Page Expired` (CSRF token mismatch) errors.

## Global Strategy

1. `App\Http\Middleware\HandleInertiaRequests::share()` exposes the CSRF token to Inertia responses.
2. `resources/views/app.blade.php` sets the `<meta name="csrf-token">` tag.
3. `resources/js/app.jsx` registers a `router.on('before')` handler that injects the token into all Inertia requests.
4. `resources/js/bootstrap.js` configures Axios to send the token automatically for non-Inertia requests.

## Workspace Preference Fix (Nov 2025)

### Problem

Submitting the workspace preference from the profile page triggered a `419` because:
- The Inertia POST happens via `router.post()` without refreshing the CSRF cookie after a long idle period.
- When the session had expired but the frontend still cached an old token, Laravel's CSRF middleware rejected the request.

### Solution

`useWorkspacePreference()` now:
- Performs an optimistic UI update so the selector still feels instant.
- Attempts to POST via Axios.
- Automatically refreshes the CSRF cookie if the request fails with `419` and retries once.
- Rolls back the optimistic update if the second attempt fails.

### Files Updated
- `resources/js/hooks/useWorkspacePreference.js`
- `resources/js/utils/csrf.js`
- `tests/Feature/WorkspacePreferenceTest.php`

### Regression Test

`WorkspacePreferenceTest::test_workspace_preference_is_saved_to_database_via_inertia_request()` simulates an XMLHttpRequest with Inertia-style headers instead of manually injecting `_token`, ensuring CSRF coverage.

### Release Note Template
Update `docs/reference/RELEASE_NOTES.md`:

```
## vX.Y.Z
- fix: refresh CSRF token before persisting workspace preference, preventing 419 mismatch after idle sessions
```

## General Guidance

- **Do not** manually append `_token` to Inertia payloads unless absolutely necessary.
- **Always** send `X-Requested-With: XMLHttpRequest` for SPA POST/PUT/DELETE requests.
- Use `refreshCsrfToken()` helper (in `resources/js/utils/csrf.js`) before retrying failed requests.
- Tests that issue POST requests should call `$this->app['session']->start()` and pass the `X-CSRF-TOKEN` header, mirroring actual Inertia submissions.

## Troubleshooting Checklist

When encountering a new `419`:
1. Verify the frontend request includes `X-CSRF-TOKEN` and `X-Requested-With` headers.
2. Confirm the session cookie (`laravel_session`) is still valid.
3. If the request is sent outside of Inertia (fetch/XHR), ensure `credentials: 'same-origin'` (or Axios `withCredentials=true`).
4. Consider adding a single retry after hitting `/sanctum/csrf-cookie` for long-lived dashboard sessions.
