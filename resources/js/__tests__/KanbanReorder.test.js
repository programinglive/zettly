import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

const kanbanPath = '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Components/KanbanBoard.jsx';

const read = (path) => fs.readFileSync(path, 'utf8');

test('KanbanBoard has reorder endpoint call', () => {
    const content = read(kanbanPath);

    assert.ok(
        content.includes("axios.post('/todos/reorder'"),
        'KanbanBoard should call /todos/reorder endpoint using axios'
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
        content.includes('const orderedNonArchived = [].concat(') &&
        content.includes('nextColumnLists.q1') &&
        content.includes('nextColumnLists.q2') &&
        content.includes('nextColumnLists.q3') &&
        content.includes('nextColumnLists.q4') &&
        content.includes('const completedOrdered = nextColumnLists.completed') &&
        content.includes('const newTodos = [...orderedNonArchived, ...completedOrdered'),
        'Should rebuild newTodos from nextColumnLists to reflect immediate per-column ordering'
    );
    assert.ok(
        content.includes('if (currentColumn === targetColumn') &&
        content.includes('activeIndexInCurrentColumn < overIndexInTargetColumnOriginal') &&
        content.includes('insertIndex = overIndex + 1'),
        'Should skip over target todo when dragging downward within same column'
    );
});

test('KanbanBoard uses optimistic UI updates without refreshing from server', () => {
    const content = read(kanbanPath);

    assert.ok(
        /then\(\(?response\)?\s*=>\s*{/.test(content),
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

test('KanbanBoard uses axios for JSON reorder endpoint', () => {
    const content = read(kanbanPath);

    assert.ok(
        content.includes("axios.post('/todos/reorder'"),
        'Should use axios for reorder endpoint'
    );
    assert.ok(
        !content.includes("'X-CSRF-TOKEN'"),
        'Should NOT manually include CSRF token (handled by axios)'
    );
});
