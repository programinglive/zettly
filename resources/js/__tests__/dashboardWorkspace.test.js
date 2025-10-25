import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dashboardPath = join(__dirname, '..', 'Pages', 'Dashboard.jsx');
const profilePath = join(__dirname, '..', 'Pages', 'Profile', 'Edit.jsx');
const constantsPath = join(__dirname, '..', 'constants', 'workspace.js');

const dashboardSource = readFileSync(dashboardPath, 'utf8');
const profileSource = readFileSync(profilePath, 'utf8');
const constantsSource = readFileSync(constantsPath, 'utf8');

test('workspace constants expose options and storage key', () => {
    assert.ok(
        constantsSource.includes('export const WORKSPACE_OPTIONS = ['),
        'Expected workspace options constant to be defined.'
    );

    assert.ok(
        constantsSource.includes("export const WORKSPACE_STORAGE_KEY = 'dashboard-workspace-view'"),
        'Expected workspace preference storage key to be exported.'
    );

    assert.ok(
        constantsSource.includes("export const DEFAULT_WORKSPACE_VIEW = 'matrix'"),
        'Expected default workspace view to be exported.'
    );
});

test('dashboard uses shared workspace preference hook', () => {
    assert.ok(
        dashboardSource.includes("import useWorkspacePreference from '../hooks/useWorkspacePreference';"),
        'Expected dashboard to use the shared workspace preference hook.'
    );

    assert.ok(
        dashboardSource.includes("const [workspaceView] = useWorkspacePreference(preferences?.workspace_view);"),
        'Expected dashboard to derive workspace view from the shared hook without exposing UI toggle.'
    );

    assert.ok(
        !dashboardSource.includes('setWorkspaceView('),
        'Expected workspace selector UI to be removed from the dashboard.'
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

test('dashboard no longer renders workspace selector card', () => {
    assert.ok(
        !/{!isDesktop && \(\s*<Link\s*href="\/profile"/.test(dashboardSource),
        'Expected profile settings link related to workspace switching to be removed.'
    );

    assert.ok(
        !/Workspace\s*<\/p>/.test(dashboardSource),
        'Expected dashboard workspace card markup to be removed.'
    );
});

test('profile settings page no longer renders workspace preferences section', () => {
    assert.ok(
        !profileSource.includes("import { WORKSPACE_OPTIONS } from '../../constants/workspace';"),
        'Expected profile settings to remove workspace options constants import.'
    );

    assert.ok(
        !profileSource.includes('Workspace Preferences'),
        'Expected workspace preferences section to be removed from profile settings.'
    );

    assert.ok(
        !profileSource.includes('useWorkspacePreference'),
        'Expected profile settings to stop using the workspace preference hook.'
    );
});

test('dashboard tablet layout keeps three-column workspace and flexible stats bar', () => {
    assert.ok(
        dashboardSource.includes('2xl:grid-cols-[minmax(260px,320px)_minmax(0,1.1fr)_minmax(260px,320px)]'),
        'Expected matrix workspace to switch to three columns at the 2xl breakpoint.'
    );

    assert.ok(
        dashboardSource.includes('md:flex md:flex-wrap md:items-stretch'),
        'Expected stats bar to switch from grid to flex layout on tablets.'
    );
});

test('workspace preference hook syncs changes across instances via custom events', () => {
    const hookSource = readFileSync(join(__dirname, '..', 'hooks', 'useWorkspacePreference.js'), 'utf8');

    assert.ok(
        hookSource.includes('const WORKSPACE_CHANGE_EVENT = \'workspace-preference-changed\''),
        'Expected custom event constant for workspace changes.'
    );

    assert.ok(
        hookSource.includes('window.dispatchEvent('),
        'Expected hook to dispatch custom events when workspace preference changes.'
    );

    assert.ok(
        hookSource.includes('window.addEventListener(WORKSPACE_CHANGE_EVENT'),
        'Expected hook to listen for workspace preference changes from other instances.'
    );

    assert.ok(
        hookSource.includes('return [workspaceView, setWorkspaceView];'),
        'Expected hook to continue exposing setter for persistence logic.'
    );
});
