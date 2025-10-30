import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loginPagePath = join(__dirname, '..', 'Pages', 'Auth', 'Login.jsx');
const loginSource = readFileSync(loginPagePath, 'utf8');

test('login form injects csrf token before posting', () => {
    assert.ok(
        loginSource.includes("transform((formData) => ({"),
        'Expected login form to customize payload via transform.'
    );
    assert.ok(
        loginSource.includes("...(csrfToken ? { _token: csrfToken } : {}),"),
        'Expected login form to append csrf token when present.'
    );
});
