import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const source = readFileSync(join(__dirname, '..', 'Pages', 'Dashboard.jsx'), 'utf8');

test('Today page consumes every sourced block from the today prop', () => {
  for (const key of ['current_work', 'open_tasks', 'recent_activity', 'linked_notes']) {
    assert.ok(source.includes(`today?.${key}`) || source.includes(`today.${key}`), `Expected Today to render ${key}.`);
  }
  assert.match(source, /today\s*=\s*\{\s*\}\s*\)?/);
});

test('Today page never invents a Main Work or a ranking', () => {
  assert.ok(!source.includes('main_work'), 'P0 must not present a Main Work.');
  assert.ok(!/\.sort\(/.test(source), 'Today must not re-rank tasks client-side.');
  assert.ok(!source.includes('recommend'), 'Today must not render unsourced recommendations.');
});

test('every block has an honest no-data branch driven by the prop message', () => {
  const statusBranches = (source.match(/status\s*===\s*'no_data'/g) || []).length;
  assert.ok(statusBranches >= 4, `Expected at least four no-data branches, found ${statusBranches}.`);
  assert.ok((source.match(/\.message/g) || []).length >= 4);
});

test('missing today prop falls back to an honest message', () => {
  assert.match(source, /Today data unavailable/);
});

test('page title contract is unchanged', () => {
  assert.match(source, /<Head title="Dashboard" \/>/);
});
