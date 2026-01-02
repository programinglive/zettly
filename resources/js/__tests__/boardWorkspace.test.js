import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const boardPath = join(__dirname, '..', 'Pages', 'Todos', 'Board.jsx');
const profilePath = join(__dirname, '..', 'Pages', 'Profile', 'Edit.jsx');
const constantsPath = join(__dirname, '..', 'constants', 'workspace.js');
const controllerPath = join(__dirname, '..', '..', '..', 'app', 'Http', 'Controllers', 'TodoController.php');
const contextPanelPath = join(__dirname, '..', 'Components', 'ContextPanel.jsx');
const todoShowPath = join(__dirname, '..', 'Pages', 'Todos', 'Show.jsx');

const boardSource = readFileSync(boardPath, 'utf8');
const profileSource = readFileSync(profilePath, 'utf8');
const constantsSource = readFileSync(constantsPath, 'utf8');
const controllerSource = readFileSync(controllerPath, 'utf8');
const contextPanelSource = readFileSync(contextPanelPath, 'utf8');
const todoShowSource = readFileSync(todoShowPath, 'utf8');

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

test('board uses shared workspace preference hook', () => {
    assert.ok(
        boardSource.includes("import useWorkspacePreference from '../../hooks/useWorkspacePreference';"),
        'Expected board to use the shared workspace preference hook.'
    );

    // Matches the actual implementation in Board.jsx
    assert.ok(
        boardSource.includes("const [workspaceView] = useWorkspacePreference(preferences?.workspace_view);"),
        'Expected board to derive workspace view from the shared hook.'
    );

    assert.ok(
        !boardSource.includes('setWorkspaceView('),
        'Expected workspace selector UI to be removed from the board.'
    );
});

test('board conditionally renders matrix or kanban workspace', () => {
    assert.ok(
        boardSource.includes("workspaceView === 'matrix' ? (") &&
        boardSource.includes('<EisenhowerMatrix') &&
        boardSource.includes('<KanbanBoard'),
        'Expected workspace toggle to render matrix or kanban content.'
    );
});

test('board context drawer provides accessible title', () => {
    assert.ok(
        boardSource.includes('<DrawerTitle className="sr-only">Task context details</DrawerTitle>'),
        'Expected context drawer to include a visually hidden title for screen readers.'
    );
});

test('board does not render legacy dashboard workspace card', () => {
    assert.ok(
        !/Workspace\s*<\/p>/.test(boardSource),
        'Expected board workspace card markup to be absent.'
    );
});

test('profile settings page renders workspace preferences section', () => {
    assert.ok(
        profileSource.includes("import { WORKSPACE_OPTIONS } from '../../constants/workspace';"),
        'Expected profile settings to import workspace options constants.'
    );

    assert.ok(
        profileSource.includes('Workspace View'),
        'Expected workspace preference heading to be present on profile settings.'
    );

    assert.ok(
        profileSource.includes('useWorkspacePreference'),
        'Expected profile settings to use the workspace preference hook.'
    );
});

test('board matrix layout keeps three-column arrangement on wide screens', () => {
    assert.ok(
        boardSource.includes("import { Drawer, DrawerContent, DrawerClose, DrawerBody, DrawerTitle, DrawerDescription } from '../../Components/ui/drawer';") &&
        boardSource.includes('open={Boolean(selectedTask)}') &&
        boardSource.includes('<Drawer'),
        'Expected board to render the context drawer using shadcn primitives anchored to the right when a task is selected.'
    );
});

test('todo controller includes attachments when hydrating context drawer', () => {
    assert.ok(
        controllerSource.includes("->with(['tags', 'relatedTodos', 'linkedByTodos', 'attachments'])"),
        'Expected todo controller to eager load attachments for todos.'
    );
});

test('context drawer archive actions require reason dialog', () => {
    assert.ok(
        contextPanelSource.includes('const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);') &&
        contextPanelSource.includes("onClick={() => openArchiveDialog('archive')}") &&
        contextPanelSource.includes('onSubmit={handleArchiveSubmit}') &&
        contextPanelSource.includes("form.transform(() => ({") &&
        contextPanelSource.includes("reason,"),
        'Expected context panel to open a reason dialog and submit trimmed reason with CSRF token for archive/restore actions.'
    );
});

test('todo detail page archive actions reuse reason dialog', () => {
    assert.ok(
        todoShowSource.includes("onClick={() => openArchiveDialog('archive')}") &&
        todoShowSource.includes('onSubmit={handleArchiveSubmit}') &&
        todoShowSource.includes("form.transform(() => ({") &&
        todoShowSource.includes("reason,"),
        'Expected todo detail page to require a reason when archiving or restoring.'
    );
});

test('completion reason dialog includes hydration state to prevent premature submission', () => {
    const completionReasonPath = join(__dirname, '..', 'Components', 'CompletionReasonDialog.jsx');
    const completionReasonSource = readFileSync(completionReasonPath, 'utf8');

    assert.ok(
        completionReasonSource.includes('const [isHydrated, setIsHydrated] = useState(false);') &&
        completionReasonSource.includes('setIsHydrated(false);') &&
        completionReasonSource.includes('setIsHydrated(true)') &&
        completionReasonSource.includes('disabled={processing || !isHydrated}'),
        'Expected completion reason dialog to track hydration state and disable submit until hydrated.'
    );
});
