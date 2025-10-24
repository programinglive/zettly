import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dashboardPath = join(__dirname, '..', 'Pages', 'Dashboard.jsx');
const dashboardSource = readFileSync(dashboardPath, 'utf8');

test('dashboard workspace options and storage key exist', () => {
    assert.ok(
        dashboardSource.includes('const WORKSPACE_OPTIONS = ['),
        'Expected workspace options constant to be defined.'
    );

    assert.ok(
        dashboardSource.includes("'dashboard-workspace-view'"),
        'Expected workspace preference to persist via localStorage key.'
    );
});

test('dashboard conditionally renders matrix or kanban workspace', () => {
    const renderPattern = /workspaceView === 'matrix' \? renderMatrixWorkspace\(\) : renderKanbanWorkspace\(\)/;

    assert.ok(
        renderPattern.test(dashboardSource),
        'Expected workspace toggle to render matrix or kanban content.'
    );
});

test('dashboard passes tasks into TodosPanel in matrix layout', () => {
    assert.ok(
        dashboardSource.includes('<TodosPanel todos={tasks} allTags={availableTags} />'),
        'Expected TodosPanel to receive task list and available tags from dashboard.'
    );
});
