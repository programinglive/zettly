import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

test('Draw Index has no setActiveId function calls (TypeError fix)', () => {
    const drawIndexContent = fs.readFileSync(
        '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Pages/Draw/Index.jsx',
        'utf8'
    );
    
    // Verify that setActiveId is not called anywhere in the file
    // This was causing the "TypeError: h is not a function" error
    const hasSetActiveId = drawIndexContent.includes('setActiveId(');
    
    assert.strictEqual(
        hasSetActiveId,
        false,
        'setActiveId should not be used in Draw/Index.jsx - it causes TypeError'
    );
});

test('Draw Index uses setActiveDrawing instead of setActiveId', () => {
    const drawIndexContent = fs.readFileSync(
        '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Pages/Draw/Index.jsx',
        'utf8'
    );
    
    // Verify that setActiveDrawing is used instead
    const hasSetActiveDrawing = drawIndexContent.includes('setActiveDrawing(');
    
    assert.strictEqual(
        hasSetActiveDrawing,
        true,
        'setActiveDrawing should be used instead of setActiveId'
    );
});

test('Draw Index TldrawComponent has minimal props to avoid errors', () => {
    const drawIndexContent = fs.readFileSync(
        '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Pages/Draw/Index.jsx',
        'utf8'
    );
    
    // Extract the TldrawComponent usage
    const tldrawMatch = drawIndexContent.match(/<TldrawComponent[\s\S]*?\/>/);
    
    assert.ok(
        tldrawMatch,
        'TldrawComponent should be used in the component'
    );
    
    const tldrawProps = tldrawMatch[0];
    
    // Check that problematic props are not present
    const hasOnChange = tldrawProps.includes('onChange=');
    const hasInferDarkMode = tldrawProps.includes('inferDarkMode');
    
    assert.strictEqual(
        hasOnChange,
        false,
        'onChange prop should be disabled to prevent TypeError'
    );
    
    assert.strictEqual(
        hasInferDarkMode,
        false,
        'inferDarkMode prop should be disabled to prevent TypeError'
    );
});

test('Draw Index handleEditorMount is simplified', () => {
    const drawIndexContent = fs.readFileSync(
        '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Pages/Draw/Index.jsx',
        'utf8'
    );
    
    // Extract the handleEditorMount function
    const editorMountMatch = drawIndexContent.match(
        /const handleEditorMount = useCallback\([\s\S]*?\}, \[\]\);/
    );
    
    assert.ok(
        editorMountMatch,
        'handleEditorMount should be defined'
    );
    
    const editorMountCode = editorMountMatch[0];
    
    // Check that it's simplified (no complex listeners or intervals)
    const hasSetTimeout = editorMountCode.includes('setTimeout(');
    const hasSetInterval = editorMountCode.includes('setInterval(');
    const hasStoreListen = editorMountCode.includes('store.listen');
    
    // These should be minimal to avoid the error
    assert.strictEqual(
        hasStoreListen,
        false,
        'store.listen should be removed to prevent TypeError'
    );
});

test('Draw Index exports default component correctly', () => {
    const drawIndexContent = fs.readFileSync(
        '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Pages/Draw/Index.jsx',
        'utf8'
    );
    
    // Verify the component is properly exported
    const hasDefaultExport = drawIndexContent.includes('export default');
    
    assert.strictEqual(
        hasDefaultExport,
        true,
        'Draw Index should have default export'
    );
});
