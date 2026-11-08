import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAction, resolvePayload, parse } from '../src/cli.js';

test('normalizeAction maps aliases to canonical CRUD actions', () => {
  assert.equal(normalizeAction('get'), 'show');
  assert.equal(normalizeAction('read'), 'show');
  assert.equal(normalizeAction('detail'), 'show');
  assert.equal(normalizeAction('ls'), 'list');
  assert.equal(normalizeAction('all'), 'list');
  assert.equal(normalizeAction('add'), 'create');
  assert.equal(normalizeAction('new'), 'create');
  assert.equal(normalizeAction('edit'), 'update');
  assert.equal(normalizeAction('patch'), 'update');
  assert.equal(normalizeAction('modify'), 'update');
  assert.equal(normalizeAction('rm'), 'delete');
  assert.equal(normalizeAction('del'), 'delete');
  assert.equal(normalizeAction('remove'), 'delete');
  assert.equal(normalizeAction('destroy'), 'delete');
  assert.equal(normalizeAction('custom'), 'custom');
});

test('parse splits positionals and flags with inline and boolean flags', () => {
  const parsed = parse(['todos', 'create', '{"title":"Test"}', '--priority=urgent', '--json', '--due-date', '2026-11-10']);
  assert.deepEqual(parsed.positionals, ['todos', 'create', '{"title":"Test"}']);
  assert.equal(parsed.flags.priority, 'urgent');
  assert.equal(parsed.flags.json, true);
  assert.equal(parsed.flags['due-date'], '2026-11-10');
});

test('resolvePayload parses inline JSON from rest argument for update', async () => {
  const flags = { json: true };
  const rest = ['{"is_completed":true,"priority":"urgent"}'];
  const payload = await resolvePayload(flags, rest);
  assert.deepEqual(payload, { is_completed: true, priority: 'urgent' });
});

test('resolvePayload parses inline JSON from id argument for create', async () => {
  const flags = { json: true };
  const rest = [];
  const inlineJson = '{"title":"Direct task creation"}';
  const payload = await resolvePayload(flags, rest, inlineJson);
  assert.deepEqual(payload, { title: 'Direct task creation' });
});

test('resolvePayload falls back to kebab-case to snake_case flag transformation', async () => {
  const flags = { 'due-date': '2026-11-12', priority: 'urgent', json: true, yes: true };
  const payload = await resolvePayload(flags, []);
  assert.deepEqual(payload, { due_date: '2026-11-12', priority: 'urgent' });
});

test('resolvePayload prioritizes --data over positional JSON', async () => {
  const flags = { data: '{"title":"From data flag"}' };
  const rest = ['{"title":"Positional"}'];
  const payload = await resolvePayload(flags, rest);
  assert.deepEqual(payload, { title: 'From data flag' });
});
