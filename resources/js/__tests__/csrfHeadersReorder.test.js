import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eisenhowerPath = join(__dirname, '..', 'Components', 'EisenhowerMatrix.jsx');
const kanbanPath = join(__dirname, '..', 'Components', 'KanbanBoard.jsx');

const eisenhowerSrc = readFileSync(eisenhowerPath, 'utf8');
const kanbanSrc = readFileSync(kanbanPath, 'utf8');

const hasCredentialsSameOrigin = (src) => /credentials:\s*['"]same-origin['"]/m.test(src);
const hasAcceptJsonHeader = (src) => /Accept:\s*['"]application\/json['"]/m.test(src);
const hasCsrfHeader = (src) => /'X-CSRF-TOKEN':/m.test(src);

test('Eisenhower reorder uses axios and does NOT manually set CSRF header', () => {
  assert.ok(eisenhowerSrc.includes("axios.post('/todos/reorder'"), 'Expected EisenhowerMatrix to call /todos/reorder with axios');
  assert.ok(!hasCsrfHeader(eisenhowerSrc), 'Expected NO manual X-CSRF-TOKEN header on Eisenhower reorder (handled by axios)');
});

test('Kanban reorder uses axios and does NOT manually set CSRF header', () => {
  assert.ok(kanbanSrc.includes("axios.post('/todos/reorder'"), 'Expected KanbanBoard to call /todos/reorder with axios');
  assert.ok(!hasCsrfHeader(kanbanSrc), 'Expected NO manual X-CSRF-TOKEN header on Kanban reorder (handled by axios)');
});
