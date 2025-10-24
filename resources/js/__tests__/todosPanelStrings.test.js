import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const componentPath = join(__dirname, '..', 'Components', 'NotesPanel.jsx');
const componentSource = readFileSync(componentPath, 'utf8');

test('todos panel header and create link', () => {
    assert.match(
        componentSource,
        /<h2[^>]*>Todos<\/h2>/,
        'Expected todos sidebar to render a "Todos" heading.'
    );

    assert.match(
        componentSource,
        /href="\/todos\/create"/,
        'Expected quick-create link to point at the todo creation route.'
    );
});

test('todos panel search placeholder', () => {
    assert.ok(
        componentSource.includes('placeholder="Search todos..."'),
        'Search input should guide users to search todos.'
    );
});

test('todos panel empty state message', () => {
    assert.ok(
        componentSource.includes('No todos match your filters'),
        'Empty state should reference todos rather than notes.'
    );
});
