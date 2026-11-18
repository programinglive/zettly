import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const source = readFileSync(join(__dirname, '..', 'Components', 'ContextPanel.jsx'), 'utf8');

test('ContextPanel treats canonical important value as Important', () => {
  assert.match(source, /selectedTask\.importance\s*===\s*'important'/);
});
