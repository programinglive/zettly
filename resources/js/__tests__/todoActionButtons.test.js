import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const editPath = join(__dirname, '..', 'Pages', 'Todos', 'Edit.jsx');
const createPath = join(__dirname, '..', 'Pages', 'Todos', 'Create.jsx');

const editSource = readFileSync(editPath, 'utf8');
const createSource = readFileSync(createPath, 'utf8');

test('Todo edit form does not render secondary Save now button', () => {
    assert.ok(!editSource.includes('Save now'), 'Expected edit form to omit secondary Save now button');
    assert.ok(
        editSource.includes("Tip: Title and description are enough to update this entry."),
        'Expected edit form to keep guidance tip text.'
    );
});

test('Todo create form does not render secondary Save now button', () => {
    assert.ok(!createSource.includes('Save now'), 'Expected create form to omit secondary Save now button');
    assert.ok(
        createSource.includes('Tip: Title and description are enough to create a todo.'),
        'Expected create form to keep guidance tip text.'
    );
});
