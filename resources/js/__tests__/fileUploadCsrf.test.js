import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const componentPath = join(__dirname, '..', 'Components', 'FileUpload.jsx');
const fileUploadSource = readFileSync(componentPath, 'utf8');

test('file upload appends csrf token when available', () => {
    assert.ok(
        fileUploadSource.includes('formData.append(\'_token\', csrfToken);'),
        'Expected file upload to append CSRF token into form data when present.'
    );
});

test('file upload sends csrf header when token exists', () => {
    assert.ok(
        fileUploadSource.includes("'X-CSRF-TOKEN': csrfToken"),
        'Expected file upload to include X-CSRF-TOKEN request header when token is present.'
    );
});
