import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const appPagePath = join(__dirname, '..', 'app.jsx');
const appSource = readFileSync(appPagePath, 'utf8');

test('app.jsx does not fallback to cookie token for header injection', () => {
    // The bug was: const headerToken = router?.page?.props?.csrf_token ?? getMetaCsrfToken() ?? cookieToken;
    // We want to ensure '?? cookieToken' is NOT present in that context.

    const bugPattern = /const\s+headerToken\s*=\s*.*?\?\?\s*cookieToken/;

    assert.equal(
        bugPattern.test(appSource),
        false,
        'Found regression: app.jsx seems to be falling back to cookieToken for headerToken. This causes 419 errors.'
    );

    // Verify the correct pattern is present
    const correctPattern = /const\s+headerToken\s*=\s*router\?\.page\?\.props\?\.csrf_token\s*\?\?\s*getMetaCsrfToken\(\)\s*;/;
    assert.ok(
        correctPattern.test(appSource),
        'Expected app.jsx to use only inertia props or meta token for headerToken.'
    );
});
