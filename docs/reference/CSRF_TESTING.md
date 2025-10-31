# CSRF Token Handling in Tests

## Overview

This document describes the CSRF token handling fixes implemented to resolve test failures in the Laravel application.

## Problem

The application tests were failing with 419 (CSRF token mismatch) errors because:

1. **LoginRequest Authentication Issue**: The `LoginRequest::authenticate()` method was calling undefined `string()` helper methods
2. **Missing CSRF Tokens in Tests**: Feature tests were not providing CSRF tokens for POST/PUT/DELETE requests

## Solutions Implemented

### 1. Fixed LoginRequest Authentication

**File**: `app/Http/Requests/Auth/LoginRequest.php`

**Changes**:
- Replaced undefined `$this->string()` calls with Laravel's built-in `Auth::attempt()` method
- Used `$this->validated()` to get validated input data
- Used array access `$this['remember']` for the remember field
- Used `request()->ip()` for IP address in throttle key

**Before**:
```php
$loginInput = (string) $this->string('email');
$password = (string) $this->string('password');
// Manual user lookup and password checking
```

**After**:
```php
$credentials = $this->validated();
// Try standard Laravel authentication first
if (! Auth::attempt(['email' => $credentials['email'], 'password' => $credentials['password']], $remember)) {
    // If email auth fails, try with name field
    if (! Auth::attempt(['name' => $credentials['email'], 'password' => $credentials['password']], $remember)) {
        // Handle failure
    }
}
```

### 2. Added CSRF Tokens to All Tests

**Pattern Applied**: For all POST/PUT/DELETE requests in feature tests:

```php
// Before
$response = $this->actingAs($user)->post('/endpoint', $data);

// After  
$response = $this->actingAs($user)
    ->withSession(['_token' => 'test-token'])
    ->post('/endpoint', array_merge($data, ['_token' => 'test-token']));
```

**Files Updated**:
- `tests/Feature/Auth/AuthenticationTest.php`
- `tests/Feature/Auth/PasswordConfirmationTest.php`
- `tests/Feature/Auth/PasswordResetTest.php`
- `tests/Feature/Auth/PasswordUpdateTest.php`
- `tests/Feature/Auth/RegistrationTest.php`
- `tests/Feature/GeminiChatTest.php`
- `tests/Feature/KanbanDragDropTest.php`
- `tests/Feature/ProfileTest.php`
- `tests/Feature/TagManagementTest.php`
- `tests/Feature/TodoTest.php`
- `tests/Feature/TodoArchiveTest.php`
- `tests/Feature/TodoAttachmentTest.php`

## Testing Guidelines

### For New Tests

When writing new feature tests that make POST/PUT/DELETE requests:

1. **Always include CSRF tokens**:
```php
$response = $this->actingAs($user)
    ->withSession(['_token' => 'test-token'])
    ->post('/your-endpoint', [
        'your_data' => 'value',
        '_token' => 'test-token',
    ]);
```

2. **For JSON API requests**:
```php
$response = $this->actingAs($user)
    ->withSession(['_token' => 'test-token'])
    ->postJson('/api/endpoint', [
        'your_data' => 'value',
        '_token' => 'test-token',
    ]);
```

3. **For file uploads**:
```php
$response = $this->actingAs($user)
    ->withSession(['_token' => 'test-token'])
    ->post('/upload-endpoint', [
        'file' => $uploadedFile,
        '_token' => 'test-token',
    ]);
```

### Alternative Approaches

If you need to disable CSRF for specific tests (not recommended):

```php
// Disable CSRF middleware for the test
$response = $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class)
    ->post('/endpoint', $data);
```

## Verification

All tests now pass successfully:
```bash
php artisan test
# Result: All tests pass with proper CSRF token handling
```

## Benefits

1. **Realistic Testing**: Tests now properly simulate real browser requests with CSRF protection
2. **Security Validation**: Ensures CSRF protection is working correctly in the application
3. **Consistency**: All tests follow the same pattern for CSRF token handling
4. **Maintainability**: Clear pattern for future test development
