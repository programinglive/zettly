import test from 'node:test';
import assert from 'node:assert/strict';
import { statusLabel, heartbeatLabel, canApprove, createRequestId } from './jobView.js';

test('status labels are readable', () => {
    assert.equal(statusLabel('needs_input'), 'Needs input');
    assert.equal(statusLabel('release_pending'), 'Release pending');
});

test('stale heartbeat is surfaced', () => {
    assert.equal(heartbeatLabel('2026-01-01T00:00:00Z', Date.parse('2026-01-01T00:04:00Z')), 'Connection stale');
});

test('approval requires exact SHA and passing tests', () => {
    const job = { status: 'review', commit_sha: 'a'.repeat(40), tests_passed: true, target_environment: 'staging' };
    assert.equal(canApprove(job, 'a'.repeat(40), 'staging'), true);
    assert.equal(canApprove(job, 'b'.repeat(40), 'staging'), false);
    assert.equal(canApprove({ ...job, tests_passed: false }, 'a'.repeat(40), 'staging'), false);
});

test('a retry keeps its request id', () => {
    const id = createRequestId(() => 'stable-uuid');
    assert.equal(createRequestId(() => 'different-uuid', id), 'stable-uuid');
});
