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

test('FocusGreeting appears before secondary recent_activity and linked_notes blocks', () => {
  const focusPos = source.indexOf('<FocusGreeting');
  const recentPos = source.indexOf('Recent activity');
  const linkedPos = source.indexOf('Linked notes');
  assert.ok(focusPos !== -1 && recentPos !== -1 && linkedPos !== -1);
  assert.ok(focusPos < recentPos, 'FocusGreeting should appear before Recent activity.');
  assert.ok(focusPos < linkedPos, 'FocusGreeting should appear before Linked notes.');
});

test('Current work and Open tasks items are actionable links', () => {
  assert.match(source, /href=\{\`\/focus\/\$\{item\.id\}\`\}/);
  assert.match(source, /href=\{\`\/todos\/\$\{item\.id\}\`\}/);
});
