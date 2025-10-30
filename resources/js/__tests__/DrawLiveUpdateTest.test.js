import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const drawIndexPath = join(__dirname, '..', 'Pages', 'Draw', 'Index.jsx');
const drawIndexSource = readFileSync(drawIndexPath, 'utf8');

test('Draw Index includes WebSocket listener for live updates', () => {
    // Check that WebSocket listener is implemented
    assert.ok(
        drawIndexSource.includes('window.Echo.private(') &&
        drawIndexSource.includes('drawings.${activeDrawing.id}'),
        'Expected to find WebSocket private channel listener for drawing updates'
    );
    
    // Check that DrawingUpdated event is handled
    assert.ok(
        drawIndexSource.includes('.DrawingUpdated'),
        'Expected to listen for DrawingUpdated events'
    );
    
    // Check that channel cleanup is implemented
    assert.ok(
        drawIndexSource.includes('window.Echo.leaveChannel'),
        'Expected to properly clean up WebSocket channels on unmount'
    );
    
    // Check that debugging logs are added
    assert.ok(
        drawIndexSource.includes('[WebSocket]') &&
        drawIndexSource.includes('console.log'),
        'Expected to include WebSocket debugging logs'
    );
});

test('Draw Index includes client update deduplication', () => {
    // Check that updates from the same client are ignored to prevent loops
    assert.ok(
        drawIndexSource.includes('lastSavedByThisClient') && 
        drawIndexSource.includes('serverUpdatedAt <= new Date(lastSavedByThisClient)'),
        'Expected to implement client update deduplication to prevent infinite loops'
    );
});

test('Backend broadcasts drawing updates', () => {
    const controllerPath = join(__dirname, '..', '..', '..', 'app', 'Http', 'Controllers', 'DrawingController.php');
    const controllerSource = readFileSync(controllerPath, 'utf8');
    
    // Check that DrawingUpdated event is imported
    assert.ok(
        controllerSource.includes('use App\\Events\\DrawingUpdated;'),
        'Expected DrawingUpdated event to be imported in controller'
    );
    
    // Check that events are broadcast on store and update with change metadata
    assert.ok(
        controllerSource.includes('broadcast(new DrawingUpdated($drawing->fresh(), true));'),
        'Expected create action to broadcast DrawingUpdated with document change flag'
    );

    assert.ok(
        controllerSource.includes('broadcast(new DrawingUpdated($drawing, $documentChanged));'),
        'Expected update action to broadcast DrawingUpdated with document change flag'
    );
});
