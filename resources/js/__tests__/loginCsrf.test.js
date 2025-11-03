import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loginPagePath = join(__dirname, '..', 'Pages', 'Auth', 'Login.jsx');
const loginSource = readFileSync(loginPagePath, 'utf8');

test('login form relies on global inertia csrf handler', () => {
    assert.ok(
        loginSource.includes("post(route('login')"),
        'Expected login form to use Inertia post method.'
    );
    assert.ok(
        !loginSource.includes("transform((formData) => ({"),
        'Login form should NOT manually transform CSRF tokens - global handler does this.'
    );
    assert.ok(
        !loginSource.includes("document.querySelector('meta[name=\"csrf-token\"]')"),
        'Login form should NOT manually extract CSRF token - global handler does this.'
    );
});
