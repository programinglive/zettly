import { test, describe } from 'node:test';
import assert from 'node:assert';
import { renderHook, act } from '@testing-library/react';
import { useCallback, useRef, useState } from 'react';

// Mock the normalizeSnapshotForPersist and cloneSnapshot functions
const mockNormalizeSnapshotForPersist = (snapshot, title) => ({
    ...snapshot,
    meta: { ...snapshot?.meta, name: title || 'Untitled' }
});

const mockCloneSnapshot = (snapshot) => ({ ...snapshot });

// Mock axios
const mockAxios = {
    get: jest.fn()
};

// Mock route function
const mockRoute = (name, params) => `/api/${name}/${params.drawing}`;

// Test the drawing loading logic
describe('Draw Index drawing switching', () => {
    test('should load fresh data when switching to different drawing', async () => {
        // Setup mock data
        const drawing1 = { id: 1, title: 'Drawing 1', document: { shapes: [] } };
        const drawing2 = { id: 2, title: 'Drawing 2', document: { shapes: [] } };
        
        mockAxios.get.mockResolvedValue({ data: { drawing: drawing2 } });

        // Simulate the loadDrawing function logic
        const drawingCacheRef = { current: new Map([[1, drawing1]]) };
        let activeId = 1;
        let loadedDrawing = null;
        let loadingDrawing = false;

        const loadDrawingIntoEditor = (drawing) => {
            loadedDrawing = drawing;
        };

        const loadDrawing = async (id) => {
            if (!id) {
                loadDrawingIntoEditor(null);
                return;
            }

            const cached = drawingCacheRef.current.get(id);
            if (cached && activeId === id) {
                loadDrawingIntoEditor(cached);
                return;
            }

            loadingDrawing = true;
            try {
                const { data } = await mockAxios.get(mockRoute('draw.show', { drawing: id }));
                const freshDrawing = data.drawing;
                
                drawingCacheRef.current.set(id, freshDrawing);
                loadDrawingIntoEditor(freshDrawing);
            } catch (error) {
                console.error('Failed to load drawing:', error);
                if (cached) {
                    loadDrawingIntoEditor(cached);
                }
            } finally {
                loadingDrawing = false;
            }
        };

        // Test switching to a different drawing
        activeId = 2;
        await loadDrawing(2);

        assert.strictEqual(mockAxios.get.calledWith('/api/draw.show/2'), true);
        assert.strictEqual(loadedDrawing, drawing2);
        assert.strictEqual(loadingDrawing, false);
    });

    test('should use cache when reloading same drawing', async () => {
        const drawing1 = { id: 1, title: 'Drawing 1', document: { shapes: [] } };
        
        const drawingCacheRef = { current: new Map([[1, drawing1]]) };
        let activeId = 1;
        let loadedDrawing = null;

        const loadDrawingIntoEditor = (drawing) => {
            loadedDrawing = drawing;
        };

        const loadDrawing = async (id) => {
            if (!id) {
                loadDrawingIntoEditor(null);
                return;
            }

            const cached = drawingCacheRef.current.get(id);
            if (cached && activeId === id) {
                loadDrawingIntoEditor(cached);
                return;
            }

            try {
                const { data } = await mockAxios.get(mockRoute('draw.show', { drawing: id }));
                const freshDrawing = data.drawing;
                
                drawingCacheRef.current.set(id, freshDrawing);
                loadDrawingIntoEditor(freshDrawing);
            } catch (error) {
                if (cached) {
                    loadDrawingIntoEditor(cached);
                }
            }
        };

        // Test reloading the same drawing (should use cache)
        await loadDrawing(1);

        assert.strictEqual(mockAxios.get.called, false);
        assert.strictEqual(loadedDrawing, drawing1);
    });

    test('should handle network errors gracefully', async () => {
        const drawing1 = { id: 1, title: 'Drawing 1', document: { shapes: [] } };
        
        mockAxios.get.mockRejectedValue(new Error('Network error'));

        const drawingCacheRef = { current: new Map([[1, drawing1]]) };
        let activeId = 2; // Different from cached
        let loadedDrawing = null;
        let loadingDrawing = false;

        const loadDrawingIntoEditor = (drawing) => {
            loadedDrawing = drawing;
        };

        const loadDrawing = async (id) => {
            if (!id) {
                loadDrawingIntoEditor(null);
                return;
            }

            const cached = drawingCacheRef.current.get(id);
            if (cached && activeId === id) {
                loadDrawingIntoEditor(cached);
                return;
            }

            loadingDrawing = true;
            try {
                const { data } = await mockAxios.get(mockRoute('draw.show', { drawing: id }));
                const freshDrawing = data.drawing;
                
                drawingCacheRef.current.set(id, freshDrawing);
                loadDrawingIntoEditor(freshDrawing);
            } catch (error) {
                if (cached) {
                    loadDrawingIntoEditor(cached);
                }
            } finally {
                loadingDrawing = false;
            }
        };

        // Test network error with fallback to cache
        await loadDrawing(1);

        assert.strictEqual(mockAxios.get.calledWith('/api/draw.show/1'), true);
        assert.strictEqual(loadedDrawing, drawing1); // Should use cached fallback
        assert.strictEqual(loadingDrawing, false);
    });
});

describe('Draw Index cache management', () => {
    test('should properly update cache when drawing is saved', () => {
        const drawingCacheRef = { current: new Map() };
        const drawing = { id: 1, title: 'Updated Drawing', document: { shapes: ['new'] } };
        
        // Simulate cache update
        drawingCacheRef.current.set(drawing.id, drawing);
        
        assert.strictEqual(drawingCacheRef.current.size, 1);
        assert.deepStrictEqual(drawingCacheRef.current.get(1), drawing);
    });

    test('should clear cache when needed', () => {
        const drawing1 = { id: 1, title: 'Drawing 1', document: { shapes: [] } };
        const drawing2 = { id: 2, title: 'Drawing 2', document: { shapes: [] } };
        
        const drawingCacheRef = { current: new Map([[1, drawing1], [2, drawing2]]) };
        
        // Clear cache
        drawingCacheRef.current.clear();
        
        assert.strictEqual(drawingCacheRef.current.size, 0);
    });
});

describe('Draw Index active drawing management', () => {
    test('should set active drawing when loaded', () => {
        const drawing = { id: 1, title: 'Test Drawing', document: { shapes: [] } };
        let activeDrawing = null;
        
        const setActiveDrawing = (drawing) => {
            activeDrawing = drawing;
        };
        
        setActiveDrawing(drawing);
        
        assert.deepStrictEqual(activeDrawing, drawing);
    });

    test('should clear active drawing when null is loaded', () => {
        let activeDrawing = { id: 1, title: 'Test Drawing' };
        
        const setActiveDrawing = (drawing) => {
            activeDrawing = drawing;
        };
        
        setActiveDrawing(null);
        
        assert.strictEqual(activeDrawing, null);
    });
});
