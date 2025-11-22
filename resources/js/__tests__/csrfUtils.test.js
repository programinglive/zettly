import test from 'node:test';
import assert from 'node:assert/strict';
import { router } from '@inertiajs/react';

// Mock globals required by csrf.js
if (!global.document) {
    global.document = {
        cookie: '',
        querySelector: () => null,
    };
}
if (!global.window) {
    global.window = {};
}

// Import the module under test
// We need to use dynamic import or ensure globals are set before static import
// But since we are in ESM, imports happen before execution.
// However, the globals are set above. Let's hope csrf.js doesn't read them at top level.
// It defines functions, so it should be fine.
import { resolveCsrfToken, getCookieCsrfToken, getMetaCsrfToken } from '../utils/csrf.js';

test('resolveCsrfToken prioritizes inertia page prop', () => {
    // Setup
    router.page = { props: { csrf_token: 'inertia-token' } };
    global.document.cookie = 'XSRF-TOKEN=cookie-token';

    // Act
    const token = resolveCsrfToken();

    // Assert
    assert.equal(token, 'inertia-token');
});

test('resolveCsrfToken falls back to meta tag if inertia prop missing', () => {
    // Setup
    router.page = { props: {} };
    global.document.cookie = 'XSRF-TOKEN=cookie-token';

    // Mock querySelector for meta tag
    const originalQuerySelector = global.document.querySelector;
    global.document.querySelector = (selector) => {
        if (selector === 'meta[name="csrf-token"]') {
            return { content: 'meta-token' };
        }
        return null;
    };

    // Act
    const token = resolveCsrfToken();

    // Assert
    assert.equal(token, 'meta-token');

    // Cleanup
    global.document.querySelector = originalQuerySelector;
});

test('resolveCsrfToken does NOT return cookie value if others missing', () => {
    // This is the critical regression test for the bug we fixed.
    // The bug was that it would return the encrypted cookie token if unencrypted tokens were missing.

    // Setup
    router.page = { props: {} };
    global.document.cookie = 'XSRF-TOKEN=encrypted-cookie-token';

    // Mock querySelector to return nothing
    const originalQuerySelector = global.document.querySelector;
    global.document.querySelector = () => null;

    // Act
    const token = resolveCsrfToken();

    // Assert
    // It should return null (or undefined), but definitely NOT the cookie token
    assert.notEqual(token, 'encrypted-cookie-token');
    assert.equal(token, null);

    // Cleanup
    global.document.querySelector = originalQuerySelector;
});

test('getCookieCsrfToken returns decoded cookie', () => {
    global.document.cookie = 'XSRF-TOKEN=encoded%20token';
    const token = getCookieCsrfToken();
    assert.equal(token, 'encoded token');
});
