import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const createPath = join(__dirname, '..', 'Pages', 'Todos', 'Create.jsx');
const editPath = join(__dirname, '..', 'Pages', 'Todos', 'Edit.jsx');

const createSource = readFileSync(createPath, 'utf8');
const editSource = readFileSync(editPath, 'utf8');

test('Todo create screen no longer renders type toggle', () => {
    assert.ok(
        !createSource.includes("[{ value: 'todo', label: 'Todo' }"),
        'Expected type toggle options to be removed from create page.'
    );
    assert.ok(
        !createSource.includes('handleTypeChange'),
        'Expected create page to omit handleTypeChange helper.'
    );
    assert.ok(
        createSource.includes('type: initialType'),
        'Expected create page to keep initial type for backend submission.'
    );
});

test('Todo edit screen no longer renders type toggle', () => {
    assert.ok(
        !editSource.includes("[{ value: 'todo', label: 'Todo' }"),
        'Expected type toggle options to be removed from edit page.'
    );
    assert.ok(
        !editSource.includes('handleTypeChange'),
        'Expected edit page to omit handleTypeChange helper.'
    );
    assert.ok(
        editSource.includes('type: initialType'),
        'Expected edit page to still rely on initial type data.'
    );
});
