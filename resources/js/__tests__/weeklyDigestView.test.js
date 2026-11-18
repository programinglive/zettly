import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const source = readFileSync(join(__dirname, '..', 'Pages', 'Reports', 'Index.jsx'), 'utf8');

test('Reports page consumes the server-provided weekly digest prop', () => {
  assert.match(source, /weeklyDigest/);
  assert.ok(!/axios|fetch\(/.test(source), 'Reports page must stay Inertia-props-driven.');
});

test('the five digest sections are rendered in order with provenance', () => {
  const labels = [
    'Completed Work', 'Blocked Work', 'Important Decisions', 'Knowledge Captured', 'Next Actions',
  ];
  let cursor = -1;
  for (const label of labels) {
    const at = source.indexOf(label);
    assert.ok(at > cursor, `Expected ${label} after the previous section.`);
    cursor = at;
  }
  assert.ok(source.includes('provenance'));
});

test('missing metrics render the literal Not measured and empty sections use their message', () => {
  assert.match(source, /Not measured/);
  assert.match(source, /status\s*===\s*'no_data'/);
  assert.match(source, /\.message/);
});

test('truncation is surfaced explicitly instead of silently dropping items', () => {
  assert.match(source, /section\.truncated/);
  assert.match(source, /section\.message/);
});

test('legacy report list and detail links remain intact', () => {
  assert.match(source, /Show older reports/);
  assert.match(source, /\/reports\/view\//);
  assert.match(source, /Generate now|generateForm/);
});
