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
const controllerPath = join(__dirname, '..', '..', '..', 'app', 'Http', 'Controllers', 'DashboardController.php');
const contextPanelPath = join(__dirname, '..', 'Components', 'ContextPanel.jsx');

const dashboardSource = readFileSync(dashboardPath, 'utf8');
const profileSource = readFileSync(profilePath, 'utf8');
const constantsSource = readFileSync(constantsPath, 'utf8');
const controllerSource = readFileSync(controllerPath, 'utf8');
const contextPanelSource = readFileSync(contextPanelPath, 'utf8');

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
    assert.ok(
        dashboardSource.includes('workspaceView === \'matrix\' ? renderMatrixWorkspace() : renderKanbanWorkspace()'),
        'Expected workspace toggle to render matrix or kanban content.'
    );
});

test('dashboard context drawer provides accessible title', () => {
    assert.ok(
        dashboardSource.includes('<DrawerTitle className="sr-only">Task context details</DrawerTitle>'),
        'Expected context drawer to include a visually hidden title for screen readers.'
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

test('profile settings page renders workspace preferences section', () => {
    assert.ok(
        profileSource.includes("import { WORKSPACE_OPTIONS } from '../../constants/workspace';"),
        'Expected profile settings to import workspace options constants.'
    );

    assert.ok(
        profileSource.includes('Workspace View Preference'),
        'Expected workspace preference heading to be present on profile settings.'
    );

    assert.ok(
        profileSource.includes('useWorkspacePreference'),
        'Expected profile settings to use the workspace preference hook.'
    );
});

test('dashboard matrix layout keeps three-column arrangement on wide screens', () => {
    assert.ok(
        dashboardSource.includes("import { Drawer, DrawerContent, DrawerClose, DrawerBody, DrawerTitle } from '../Components/ui/drawer';") &&
        dashboardSource.includes('side="right"') &&
        dashboardSource.includes('<Drawer'),
        'Expected dashboard to render the context drawer using shadcn primitives anchored to the right when a task is selected.'
    );
});

test('dashboard includes attachments when hydrating context drawer', () => {
    assert.ok(
        controllerSource.includes("->with(['tags', 'relatedTodos', 'linkedByTodos', 'attachments'])"),
        'Expected dashboard controller to eager load attachments for todos.'
    );

    assert.ok(
        controllerSource.includes('->each(function (Todo $todo) {'),
        'Expected dashboard context panel to read attachments from the selected task.'
    );

    assert.ok(
        contextPanelSource.includes('const attachments = Array.isArray(selectedTask.attachments)'),
        'Expected context panel to compute attachments array from the selected task in the selectedTask attachments section.'
    );

    assert.ok(
        contextPanelSource.includes('Attachments ({attachments.length})') && contextPanelSource.includes('<Paperclip'),
        'Expected attachments section markup to render with paperclip icon and count.'
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
