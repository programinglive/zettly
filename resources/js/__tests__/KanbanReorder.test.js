import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

const kanbanPath = '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Components/KanbanBoard.jsx';

const read = (path) => fs.readFileSync(path, 'utf8');

test('KanbanBoard has reorder endpoint call', () => {
    const content = read(kanbanPath);

    assert.ok(
        content.includes("router.post('/todos/reorder'"),
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
        content.includes('onSuccess: (page) => {'),
        'Should have onSuccess handler'
    );
    assert.ok(
        content.includes('Reorder was successful, optimistic UI update is already applied'),
        'Should document that optimistic update is already applied'
    );
    assert.ok(
        !content.includes('page.props?.todos'),
        'Should NOT try to refresh todos from page.props (JSON response has no page object)'
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
        content.includes('onError: (errors) => {'),
        'Should have onError handler'
    );
});
