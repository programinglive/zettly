import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const indexPath = join(__dirname, '..', 'Pages', 'Agent', 'Index.jsx');
const indexSource = readFileSync(indexPath, 'utf8');

test('coding agent index form does not chain form.transform with form.post', () => {
    assert.ok(
        !indexSource.includes('form.transform((data) => ({ ...data, client_request_id: requestId })).post'),
        'form.transform should NOT be chained directly with .post() because transform returns void in Inertia React'
    );
    assert.ok(
        indexSource.includes('form.transform((data) => ({ ...data, client_request_id: requestId }));'),
        'form.transform should be a separate statement ending with a semicolon'
    );
    assert.ok(
        indexSource.includes("form.post('/agent/jobs', {"),
        'form.post should be called as its own statement'
    );
});
