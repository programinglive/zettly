import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wsPath = join(__dirname, '..', 'websocket.js');
const source = readFileSync(wsPath, 'utf8');

test('websocket uses custom authorizer with /broadcasting/auth', () => {
  assert.match(source, /authorizer:\s*\(/, 'Echo config should define a custom authorizer');
  assert.match(source, /broadcasting\/auth/, 'Authorizer should call /broadcasting/auth');
  assert.match(source, /axios\s*\.post\(\s*['\"]\/broadcasting\/auth['\"]/,
    'Authorizer should POST via axios to /broadcasting/auth');
});
