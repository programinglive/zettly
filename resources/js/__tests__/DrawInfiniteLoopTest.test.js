import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const drawIndexPath = join(__dirname, '..', 'Pages', 'Draw', 'Index.jsx');
const drawIndexSource = readFileSync(drawIndexPath, 'utf8');

test('Draw Index prevents infinite loop in loadDrawingIntoEditor', () => {
    // Check that loadDrawingIntoEditor has only persistDrawing dependency
    const loadDrawingIntoEditorMatch = drawIndexSource.match(
        /const loadDrawingIntoEditor = useCallback\([\s\S]*?\}, \[(.*?)\]/
    );
    
    assert.ok(
        loadDrawingIntoEditorMatch,
        'Expected to find loadDrawingIntoEditor useCallback with dependencies'
    );
    
    const dependencies = loadDrawingIntoEditorMatch[1].trim();
    assert.strictEqual(
        dependencies,
        'persistDrawing',
        'Expected loadDrawingIntoEditor to only have persistDrawing dependency to prevent infinite loop'
    );
});

test('Draw Index has proper useEffect dependencies for loadDrawing', () => {
    // Check that the useEffect calling loadDrawing only depends on drawings, activeDrawing, and loadDrawing
    const useEffectMatch = drawIndexSource.match(
        /useEffect\(\(\) => \{[\s\S]*?loadDrawing\(drawings\[0\]\.id\)[\s\S]*?\}, \[(.*?)\]/
    );
    
    assert.ok(
        useEffectMatch,
        'Expected to find useEffect that calls loadDrawing with dependencies'
    );
    
    const dependencies = useEffectMatch[1].split(',').map(d => d.trim());
    assert.ok(
        dependencies.includes('drawings'),
        'Expected useEffect to depend on drawings'
    );
    
    assert.ok(
        dependencies.includes('activeDrawing'),
        'Expected useEffect to depend on activeDrawing'
    );
    
    assert.ok(
        dependencies.includes('loadDrawing'),
        'Expected useEffect to depend on loadDrawing'
    );
});

test('Draw Index includes comment explaining infinite loop fix', () => {
    assert.ok(
        drawIndexSource.includes('Call persistDrawing directly without dependency to avoid infinite loop'),
        'Expected comment explaining the infinite loop fix'
    );
});
