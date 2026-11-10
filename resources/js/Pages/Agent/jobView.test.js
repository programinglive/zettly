import test from 'node:test';
import assert from 'node:assert/strict';
import {
    statusLabel,
    heartbeatLabel,
    canApprove,
    createRequestId,
    buildTodoSpecInstruction,
    filterJobsByStage,
} from './jobView.js';

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

test('buildTodoSpecInstruction formats todo description, checklist DoD, and repository checks', () => {
    const todo = {
        id: 508,
        title: 'Fix Sentry N+1 query in Clinic',
        description: '<p>Eager load patient relation on invoice index.</p>',
        checklist_items: [
            { title: 'Write regression test', is_completed: false },
            { title: 'Verify query count', is_completed: true },
        ],
    };
    const repoMeta = {
        slug: 'clinic',
        remote: 'beautyworld_repository/clinic',
        base: 'master',
        stack: 'Laravel',
        checks: 'vendor/bin/paratest --processes=4',
    };

    const spec = buildTodoSpecInstruction(todo, repoMeta);
    assert.match(spec, /# Task: Fix Sentry N\+1 query in Clinic \(Todo #508\)/);
    assert.match(spec, /Eager load patient relation on invoice index\./);
    assert.match(spec, /- \[ \] Write regression test/);
    assert.match(spec, /- \[x\] Verify query count/);
    assert.match(spec, /vendor\/bin\/paratest --processes=4/);
});

test('filterJobsByStage groups pipeline lanes accurately', () => {
    const jobs = [
        { id: 1, status: 'queued' },
        { id: 2, status: 'running' },
        { id: 3, status: 'review' },
        { id: 4, status: 'release_pending' },
        { id: 5, status: 'completed' },
        { id: 6, status: 'failed' },
    ];
    assert.equal(filterJobsByStage(jobs, 'all').length, 6);
    assert.deepEqual(filterJobsByStage(jobs, 'review').map((j) => j.id), [3, 4]);
    assert.deepEqual(filterJobsByStage(jobs, 'completed').map((j) => j.id), [5]);
    assert.deepEqual(filterJobsByStage(jobs, 'attention').map((j) => j.id), [6]);
});

