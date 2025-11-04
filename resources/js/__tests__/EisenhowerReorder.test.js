import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

const file = '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Components/EisenhowerMatrix.jsx';
const src = fs.readFileSync(file, 'utf8');

test('EisenhowerMatrix posts reorder payload to /todos/reorder', () => {
  assert.ok(
    src.includes("router.post('/todos/reorder', payload, {") &&
      src.includes("column: targetQuadrant") &&
      src.includes("todo_ids: lists[targetQuadrant].map(t => t.id)"),
    'Expected EisenhowerMatrix to call /todos/reorder with column and todo_ids'
  );
});

test('EisenhowerMatrix chains reorder after update-eisenhower when quadrant changes', () => {
  assert.ok(
    src.includes("/todos/${draggedTodo.id}/update-eisenhower") &&
      src.includes('onSuccess: () => {') &&
      (src.includes('postReorder();') || src.includes("router.post('/todos/reorder'")),
    'Expected EisenhowerMatrix to chain reorder after successful update-eisenhower'
  );
});
