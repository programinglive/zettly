# CSRF Token Troubleshooting Guide

## Problem: 419 "Page Expired" on DELETE Requests

When deleting todos or other resources, users may encounter a 419 "Page Expired" error. This indicates a CSRF token mismatch.

## Root Causes

### 1. **Test vs. Real-World Mismatch**
- **Tests** use `withSession(['_token' => 'test-token'])` which bypasses CSRF validation
- **Browser** requires a valid CSRF token that matches the server session
- Tests passing does NOT guarantee the feature works in production

### 2. **Token Staleness**
- CSRF tokens are regenerated on login/logout
- If the browser's token is stale, the request will fail
- The global middleware in `app.jsx` should handle this, but may not catch all cases

### 3. **Missing Token in Request**
- Inertia's `router.delete()` relies on the global `router.on('before')` middleware
- If the middleware doesn't run or the token isn't injected, the request fails

## Debugging Steps

### Step 1: Check Browser Console
Open DevTools (F12) → Network tab → Find the failed DELETE request:
- Look for the request to `/todos/{id}`
- Check the request headers for `X-CSRF-TOKEN`
- Check the request payload for `_token`

### Step 2: Verify Token Exists
In browser console, run:
```javascript
// Check cookie token
const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
console.log('Cookie token:', match ? decodeURIComponent(match[1]) : 'NOT FOUND');

// Check meta tag token
console.log('Meta token:', document.querySelector('meta[name="csrf-token"]')?.content);

// Check Inertia token
console.log('Inertia token:', window.location.href); // Check page props in Inertia
```

### Step 3: Check Middleware
Verify `app.jsx` middleware is running:
```javascript
// In app.jsx, add logging:
router.on('before', (event) => {
    console.log('Inertia before hook:', event.detail.visit.method, event.detail.visit.url);
    // Token injection happens here
});
```

### Step 4: Check Server Logs
Run `php artisan pail` and look for:
- `TokenMismatchException` - CSRF token doesn't match
- `MethodNotAllowedException` - Wrong HTTP method
- Other validation errors

## Solutions

### Solution 1: Ensure Token is in Cookie
The global middleware prioritizes the `XSRF-TOKEN` cookie. Make sure:
1. After login, the cookie is set: `Set-Cookie: XSRF-TOKEN=...`
2. The cookie persists across requests
3. The cookie value matches the server session token

### Solution 2: Force Token Refresh
If the token is stale, refresh the page:
```javascript
window.location.reload();
```

### Solution 3: Manual Token Injection (Last Resort)
If the global middleware isn't working, manually inject the token:
```javascript
const getCookieCsrfToken = () => {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
};

const token = getCookieCsrfToken();
router.delete(`/todos/${todo.id}`, { _token: token });
```

## Testing Improvements Needed

The current test in `tests/Feature/TodoTest.php::test_user_can_delete_todo` is insufficient because:

1. **It bypasses CSRF validation** using `withSession(['_token' => 'test-token'])`
2. **It doesn't test the real CSRF flow** that happens in the browser
3. **A passing test doesn't guarantee the feature works**

### Recommended Test Update
```php
public function test_user_can_delete_todo_with_valid_csrf(): void
{
    Mail::fake();

    $user = User::factory()->create();
    $todo = Todo::factory()->asTask()->create(['user_id' => $user->id]);

    // Get a real CSRF token from the session
    $this->get(route('todos.show', $todo));
    $token = $this->app['session.store']->token();

    $response = $this->actingAs($user)
        ->delete(route('todos.destroy', $todo), ['_token' => $token]);

    $response->assertRedirect();
    $this->assertSoftDeleted('todos', ['id' => $todo->id]);
    Mail::assertQueued(TodoDeleted::class);
}
```

## Configuration Checklist

- [ ] `config/session.php` - Session driver is configured correctly
- [ ] `app/Http/Middleware/VerifyCsrfToken.php` - CSRF middleware is active
- [ ] `resources/js/app.jsx` - Global CSRF middleware is registered
- [ ] `.env` - `SESSION_DRIVER` and `SESSION_LIFETIME` are set
- [ ] Browser cookies are enabled
- [ ] No browser extensions blocking cookies

## Related Files

- `resources/js/app.jsx` - Global CSRF token injection
- `app/Http/Middleware/VerifyCsrfToken.php` - Server-side CSRF validation
- `resources/js/Pages/Todos/Show.jsx` - Delete handler
- `app/Http/Controllers/TodoController.php` - Delete endpoint
- `tests/Feature/TodoTest.php` - Delete test

## Known Issue: DELETE Requests Failing with 419

### Current Status
- **Tests**: ✅ Passing (using real CSRF tokens)
- **Browser**: ❌ Failing with 419 "Page Expired"

### Investigation Steps

1. **Open DevTools** (F12) → Console tab
2. **Look for errors** before the 419 page appears
3. **Check Network tab**:
   - Find the DELETE request to `/todos/{id}`
   - Check if request headers include `X-CSRF-TOKEN`
   - Check if request payload includes `_token`
   - Check response status and headers

4. **Run in console**:
```javascript
// Check if Inertia middleware is running
router.on('before', (event) => {
    console.log('DELETE request headers:', event.detail.visit.headers);
    console.log('DELETE request data:', event.detail.visit.data);
});

// Then try deleting again and check console output
```

### Possible Root Causes

1. **Inertia middleware not injecting token for DELETE**
   - Check `resources/js/app.jsx` line 107-126
   - The middleware should inject token for all non-GET methods

2. **Token not in cookie or meta tag**
   - Browser doesn't have `XSRF-TOKEN` cookie
   - Meta tag `csrf-token` is empty or missing

3. **Session mismatch**
   - Server session token ≠ client token
   - Session was regenerated but client still has old token

### Next Steps

1. Check browser console for actual error message
2. Verify `XSRF-TOKEN` cookie exists and has a value
3. Compare cookie token with meta tag token
4. Check if token changes after page refresh
5. Review Laravel logs for `TokenMismatchException`

## Last Updated

2025-11-08
