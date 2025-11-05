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

test('EisenhowerMatrix does NOT manually add CSRF token to update-eisenhower payload', () => {
  // Extract the quadrantChanged block
  const quadrantChangedMatch = src.match(/if \(quadrantChanged\) \{[\s\S]*?router\.post\(\s*`\/todos\/\$\{draggedTodo\.id\}\/update-eisenhower`/);
  
  assert.ok(
    quadrantChangedMatch,
    'Expected to find quadrantChanged block with update-eisenhower call'
  );
  
  const quadrantBlock = quadrantChangedMatch[0];
  
  // Verify that _token is NOT manually added to updatePayload
  assert.ok(
    !quadrantBlock.includes('updatePayload._token') && 
    !quadrantBlock.includes('_token: token'),
    'CSRF token should NOT be manually added to updatePayload - let Inertia middleware handle it'
  );
});
