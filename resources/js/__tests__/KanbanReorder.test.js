import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

const kanbanPath = '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Components/KanbanBoard.jsx';

const read = (path) => fs.readFileSync(path, 'utf8');

test('KanbanBoard has reorder endpoint call', () => {
    const content = read(kanbanPath);

    assert.ok(
        content.includes("fetch('/todos/reorder'"),
        'KanbanBoard should call /todos/reorder endpoint'
    );
});

test('KanbanBoard sends column and todo_ids in reorder payload', () => {
    const content = read(kanbanPath);

    assert.ok(
        content.includes('column: targetColumn'),
        'Payload should include column'
    );
    assert.ok(
        content.includes('todo_ids: nextColumnLists[targetColumn].map((todo) => todo.id)'),
        'Payload should include todo_ids array'
    );
});

test('KanbanBoard uses getColumnKey to determine target column', () => {
    const content = read(kanbanPath);

    assert.ok(
        content.includes('const getColumnKey = (todo) => {'),
        'Should define getColumnKey function'
    );
    assert.ok(
        content.includes('const targetColumn = resolveDropColumn()'),
        'Should resolve target column from drop event'
    );
});

test('KanbanBoard preserves todo order in state after drag', () => {
    const content = read(kanbanPath);

    assert.ok(
        content.includes('setTodos(newTodos)'),
        'Should update todos state with newTodos after drag'
    );
    assert.ok(
        content.includes('const newTodos = todos.map((todo) => {'),
        'Should map todos to create newTodos with updated dragged todo'
    );
});

test('KanbanBoard uses optimistic UI updates without refreshing from server', () => {
    const content = read(kanbanPath);

    assert.ok(
        content.includes('.then(data => {'),
        'Should have then handler for successful response'
    );
    assert.ok(
        content.includes('setTodos(newTodos)'),
        'Should apply optimistic update before sending request'
    );
    assert.ok(
        !content.includes('page.props?.todos'),
        'Should NOT try to refresh todos from page.props'
    );
});

test('KanbanBoard saves original state for error recovery', () => {
    const content = read(kanbanPath);

    assert.ok(
        content.includes('const originalTodos = todos;'),
        'Should save original todos before optimistic update'
    );
    assert.ok(
        content.includes('setTodos(originalTodos);'),
        'Should revert to original todos on error'
    );
    assert.ok(
        content.includes('.catch(error => {'),
        'Should have error handler'
    );
});

test('KanbanBoard uses fetch for JSON reorder endpoint', () => {
    const content = read(kanbanPath);

    assert.ok(
        content.includes("fetch('/todos/reorder'"),
        'Should use fetch API for reorder endpoint'
    );
    assert.ok(
        content.includes("'Content-Type': 'application/json'"),
        'Should set Content-Type to application/json'
    );
    assert.ok(
        content.includes("'X-CSRF-TOKEN'"),
        'Should include CSRF token in headers'
    );
    assert.ok(
        content.includes('JSON.stringify(payload)'),
        'Should stringify payload'
    );
});
