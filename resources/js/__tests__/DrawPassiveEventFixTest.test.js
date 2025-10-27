import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const drawIndexPath = join(__dirname, '..', 'Pages', 'Draw', 'Index.jsx');
const drawIndexSource = readFileSync(drawIndexPath, 'utf8');

test('Draw Index suppresses passive event listener warnings', () => {
    // Check that console.error is overridden to suppress passive event listener warnings
    assert.ok(
        drawIndexSource.includes('Unable to preventDefault inside passive event listener'),
        'Expected to find code that suppresses passive event listener warnings'
    );
    
    // Check that console.error is overridden at module level (before component mount)
    assert.ok(
        drawIndexSource.includes('const originalConsoleError = console.error'),
        'Expected to override console.error at module level'
    );
    
    // Check that the suppression includes broader passive event listener patterns
    assert.ok(
        drawIndexSource.includes('passive event listener'),
        'Expected to suppress broader passive event listener warnings'
    );
});

test('Draw Index configures non-passive event listeners', () => {
    // Check that EventTarget.prototype.addEventListener is overridden
    assert.ok(
        drawIndexSource.includes('EventTarget.prototype.addEventListener'),
        'Expected to override EventTarget.prototype.addEventListener'
    );
    
    // Check that touch, wheel, and pointer events are made non-passive
    assert.ok(
        drawIndexSource.includes('passive: false'),
        'Expected to make touch and wheel events non-passive'
    );
    
    // Check that the override happens at module level (immediately)
    assert.ok(
        drawIndexSource.includes('overrideEventListeners();'),
        'Expected to override event listeners immediately at module level'
    );
    
    // Check that pointer events are included in the override
    assert.ok(
        drawIndexSource.includes('pointerdown') && drawIndexSource.includes('pointermove') && drawIndexSource.includes('pointerup'),
        'Expected to include pointer events in non-passive override'
    );
});
