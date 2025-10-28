import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

test('WebSocketTest diagnostics helpers use valid Pusher socket ids', () => {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const filePath = join(testDir, '..', 'Pages', 'Draw', 'WebSocketTest.jsx');
  const source = readFileSync(filePath, 'utf8');

  assert.match(
    source,
    /socket_id:\s*'\d+\.\d+'/,
    'Expected socket_id to be numeric.numeric for Pusher compatibility',
  );

  assert.ok(
    !source.includes("'test.socket.id'"),
    'Legacy invalid socket id placeholder should not be present',
  );
});
