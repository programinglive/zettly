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

test('Eisenhower reorder fetch includes credentials, Accept JSON, and CSRF header', () => {
  assert.ok(eisenhowerSrc.includes("fetch('/todos/reorder'"), 'Expected EisenhowerMatrix to call /todos/reorder');
  assert.ok(hasCredentialsSameOrigin(eisenhowerSrc), 'Expected credentials: same-origin on Eisenhower reorder fetch');
  assert.ok(hasAcceptJsonHeader(eisenhowerSrc), 'Expected Accept: application/json on Eisenhower reorder fetch');
  assert.ok(hasCsrfHeader(eisenhowerSrc), 'Expected X-CSRF-TOKEN header on Eisenhower reorder fetch');
});

test('Kanban reorder fetch includes credentials, Accept JSON, and CSRF header', () => {
  assert.ok(kanbanSrc.includes("fetch('/todos/reorder'"), 'Expected KanbanBoard to call /todos/reorder');
  assert.ok(hasCredentialsSameOrigin(kanbanSrc), 'Expected credentials: same-origin on Kanban reorder fetch');
  assert.ok(hasAcceptJsonHeader(kanbanSrc), 'Expected Accept: application/json on Kanban reorder fetch');
  assert.ok(hasCsrfHeader(kanbanSrc), 'Expected X-CSRF-TOKEN header on Kanban reorder fetch');
});
