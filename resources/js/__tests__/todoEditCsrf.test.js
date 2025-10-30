import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const editPagePath = join(__dirname, '..', 'Pages', 'Todos', 'Edit.jsx');
const editSource = readFileSync(editPagePath, 'utf8');

test('todo edit form appends csrf token when submitting', () => {
    assert.ok(
        editSource.includes("const csrfToken = document.querySelector('meta[name=\"csrf-token\"]')?.content;"),
        'Expected edit page to read csrf token from meta tag.'
    );
    assert.ok(
        editSource.includes("formData.append('_token', csrfToken);"),
        'Expected edit page to append csrf token into form data when present.'
    );
});
