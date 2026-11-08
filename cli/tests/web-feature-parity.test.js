import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  groups,
  resolvePayload,
  resolveEndpoint,
  formatRecordView
} from '../src/cli.js';

test('groups definition contains complete web parity entities', () => {
  assert.ok(groups.journal, 'journal group must be defined');
  assert.ok(groups.agent, 'agent group must be defined');
  assert.ok(groups.reports, 'reports group must be defined');
  assert.deepEqual(groups.journal, ['journal/entries']);
  assert.deepEqual(groups.agent, ['agent/sessions']);
  assert.deepEqual(groups.reports, ['reports']);
});

test('resolveEndpoint resolves restore-deleted and unlink for todos', () => {
  const restoreDeleted = resolveEndpoint('todos', 'restore-deleted', '42', []);
  assert.equal(restoreDeleted.method, 'POST');
  assert.equal(restoreDeleted.path, 'todos/42/restore-deleted');

  const unlink = resolveEndpoint('todos', 'unlink', '42', []);
  assert.equal(unlink.method, 'POST');
  assert.equal(unlink.path, 'todos/42/unlink');
});

test('resolveEndpoint resolves agent and journal operations', () => {
  const journalList = resolveEndpoint('journal', 'list', null, []);
  assert.equal(journalList.method, 'GET');
  assert.equal(journalList.path, 'journal/entries');

  const journalShow = resolveEndpoint('journal', 'show', '15', []);
  assert.equal(journalShow.method, 'GET');
  assert.equal(journalShow.path, 'journal/entries/15');

  const agentSessions = resolveEndpoint('agent', 'sessions', null, []);
  assert.equal(agentSessions.method, 'GET');
  assert.equal(agentSessions.path, 'agent/sessions');

  const agentEvent = resolveEndpoint('agent', 'record-event', 'sess-123', []);
  assert.equal(agentEvent.method, 'POST');
  assert.equal(agentEvent.path, 'agent/sessions/sess-123/events');
});

test('resolveEndpoint resolves reports and report channels', () => {
  const reportsList = resolveEndpoint('reports', 'list', null, []);
  assert.equal(reportsList.method, 'GET');
  assert.equal(reportsList.path, 'reports');

  const reportsGenerate = resolveEndpoint('reports', 'generate', null, []);
  assert.equal(reportsGenerate.method, 'POST');
  assert.equal(reportsGenerate.path, 'reports/generate');

  const reportsDeliver = resolveEndpoint('reports', 'deliver', null, []);
  assert.equal(reportsDeliver.method, 'POST');
  assert.equal(reportsDeliver.path, 'reports/deliver');

  const channelsList = resolveEndpoint('reports', 'channels', null, []);
  assert.equal(channelsList.method, 'GET');
  assert.equal(channelsList.path, 'report-channels');

  const channelAdd = resolveEndpoint('reports', 'channel-add', null, []);
  assert.equal(channelAdd.method, 'POST');
  assert.equal(channelAdd.path, 'report-channels');

  const channelDelete = resolveEndpoint('reports', 'channel-delete', '7', []);
  assert.equal(channelDelete.method, 'DELETE');
  assert.equal(channelDelete.path, 'report-channels/7');
});

test('resolvePayload loads raw markdown file via --content-file without JSON error', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'zettly-test-'));
  const filePath = join(tempDir, 'note.md');
  const markdownContent = '# My Header\n\nThis is a raw markdown note with [links](https://example.com).';
  await writeFile(filePath, markdownContent, 'utf8');

  try {
    const flags = { 'content-file': filePath, title: 'Test Markdown Note' };
    const payload = await resolvePayload(flags, [], null, 'notes');
    assert.equal(payload.title, 'Test Markdown Note');
    assert.equal(payload.description, markdownContent);
    assert.equal(payload.type, 'note');

    const journalFlags = { 'content-file': filePath, title: 'Journal Entry' };
    const journalPayload = await resolvePayload(journalFlags, [], null, 'journal');
    assert.equal(journalPayload.title, 'Journal Entry');
    assert.equal(journalPayload.content, markdownContent);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('formatRecordView formats single note/journal into readable terminal text', () => {
  const record = {
    id: 328,
    title: 'Handover Release Blocker',
    description: '# Section 1\nDetails here.\n\n- item a\n- item b',
    created_at: '2026-11-08T05:00:00Z',
    tags: [{ name: 'dev' }, { name: 'release' }]
  };

  const output = formatRecordView(record, 'notes');
  assert.ok(output.includes('#328 Handover Release Blocker'));
  assert.ok(output.includes('Tags: dev, release'));
  assert.ok(output.includes('# Section 1'));
  assert.ok(output.includes('Details here.'));
});

test('formatRecordView formats checklist items, completion status, related todos, and attachments', () => {
  const record = {
    id: 101,
    title: 'Deploy microservice to cluster',
    is_completed: false,
    completed_at: null,
    priority: 'urgent',
    importance: 'important',
    created_at: '2026-11-08T05:00:00Z',
    description: 'Implementation details',
    tags: [{ name: 'dev' }],
    checklist_items: [
      { id: 1, title: 'Write unit tests', is_completed: true },
      { id: 2, title: 'Configure ingress TLS', is_completed: false }
    ],
    related_todos: [
      { id: 85, title: 'Cluster setup' }
    ],
    attachments: [
      { id: 3, original_name: 'architecture.png', size: 102400 }
    ]
  };

  const output = formatRecordView(record, 'todos');
  assert.ok(output.includes('#101 Deploy microservice to cluster'));
  assert.ok(output.includes('Status: pending'));
  assert.ok(output.includes('[x] #1 Write unit tests'));
  assert.ok(output.includes('[ ] #2 Configure ingress TLS'));
  assert.ok(output.includes('Related: #85 Cluster setup'));
  assert.ok(output.includes('Attachments: architecture.png (100.0 KB)'));
});

test('resolveEndpoint resolves checklist-toggle and checklist-add for todos', () => {
  const toggle = resolveEndpoint('todos', 'checklist-toggle', '101', ['5']);
  assert.equal(toggle.method, 'PATCH');
  assert.equal(toggle.path, 'todos/101/checklist/5/toggle');
});
