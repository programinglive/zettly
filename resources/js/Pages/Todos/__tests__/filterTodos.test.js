import test from 'node:test';
import assert from 'node:assert/strict';

import filterAndSortTodos from '../filterTodos.js';

test('returns empty array for non-array input', () => {
    const result = filterAndSortTodos(null, null, false);

    assert.deepEqual(result, []);
});

test('sorts tasks by completion status, priority, importance, and created_at', () => {
    const todos = [
        { id: 1, is_completed: false, priority: 'not_urgent', importance: 'important', created_at: '2025-10-20T10:00:00Z' },
        { id: 2, is_completed: true, priority: 'urgent', importance: 'important', created_at: '2025-10-21T09:00:00Z' },
        { id: 3, is_completed: false, priority: 'urgent', importance: 'not_important', created_at: '2025-10-19T12:00:00Z' },
        { id: 4, is_completed: false, priority: 'not_urgent', importance: 'not_important', created_at: '2025-10-22T08:00:00Z' },
    ];

    const result = filterAndSortTodos(todos, null, false);

    assert.deepEqual(result.map((todo) => todo.id), [3, 1, 4, 2]);
});

test('filters by urgent priority', () => {
    const todos = [
        { id: 1, is_completed: false, priority: 'urgent', importance: 'important', created_at: '2025-10-20T10:00:00Z' },
        { id: 2, is_completed: false, priority: 'not_urgent', importance: 'important', created_at: '2025-10-20T11:00:00Z' },
        { id: 3, is_completed: false, priority: 'urgent', importance: 'not_important', created_at: '2025-10-20T12:00:00Z' },
    ];

    const result = filterAndSortTodos(todos, 'urgent', false);

    assert.deepEqual(result.map((todo) => todo.id), [1, 3]);
});

test('filters by not urgent priority', () => {
    const todos = [
        { id: 1, is_completed: false, priority: 'urgent', importance: 'important', created_at: '2025-10-20T10:00:00Z' },
        { id: 2, is_completed: false, priority: 'not_urgent', importance: 'important', created_at: '2025-10-20T11:00:00Z' },
        { id: 3, is_completed: false, priority: 'not_urgent', importance: 'not_important', created_at: '2025-10-20T12:00:00Z' },
    ];

    const result = filterAndSortTodos(todos, 'not_urgent', false);

    assert.deepEqual(result.map((todo) => todo.id), [2, 3]);
});

test('filters by important importance', () => {
    const todos = [
        { id: 1, is_completed: false, priority: 'urgent', importance: 'important', created_at: '2025-10-20T10:00:00Z' },
        { id: 2, is_completed: false, priority: 'not_urgent', importance: 'not_important', created_at: '2025-10-20T11:00:00Z' },
        { id: 3, is_completed: false, priority: 'not_urgent', importance: 'important', created_at: '2025-10-20T12:00:00Z' },
    ];

    const result = filterAndSortTodos(todos, 'important', false);

    assert.deepEqual(result.map((todo) => todo.id), [1, 3]);
});

test('filters by not important importance', () => {
    const todos = [
        { id: 1, is_completed: false, priority: 'urgent', importance: 'not_important', created_at: '2025-10-20T10:00:00Z' },
        { id: 2, is_completed: false, priority: 'not_urgent', importance: 'not_important', created_at: '2025-10-20T11:00:00Z' },
        { id: 3, is_completed: false, priority: 'urgent', importance: 'important', created_at: '2025-10-20T12:00:00Z' },
    ];

    const result = filterAndSortTodos(todos, 'not_important', false);

    assert.deepEqual(result.map((todo) => todo.id), [1, 2]);
});

test('sorts notes by created_at descending', () => {
    const notes = [
        { id: 1, created_at: '2025-10-20T10:00:00Z' },
        { id: 2, created_at: '2025-10-21T10:00:00Z' },
        { id: 3, created_at: '2025-10-19T10:00:00Z' },
    ];

    const result = filterAndSortTodos(notes, null, true);

    assert.deepEqual(result.map((note) => note.id), [2, 1, 3]);
});
