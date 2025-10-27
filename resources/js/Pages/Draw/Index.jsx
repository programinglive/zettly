import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { Head } from '@inertiajs/react';
import {
    DefaultColorStyle,
    DefaultDashStyle,
    DefaultSizeStyle,
} from '@tldraw/editor';
import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import { Input } from '../../Components/ui/input';
import { Loader2, Plus } from 'lucide-react';

const TldrawComponent = lazy(() => import('tldraw').then((module) => ({ default: module.Tldraw })));

const TL_DRAW_LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY;

// Debug mode helper functions
const isDebugMode = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('zettly-debug-mode') === 'true';
    }
    return false;
};

const debugLog = (...args) => {
    if (isDebugMode()) {
        console.log(...args);
    }
};

const debugWarn = (...args) => {
    if (isDebugMode()) {
        console.warn(...args);
    }
};

const debugError = (...args) => {
    if (isDebugMode()) {
        console.error(...args);
    }
};

// Prevent passive event listener warnings globally for TLDraw
// This must run before TLDraw initializes
const originalAddEventListener = EventTarget.prototype.addEventListener;
let isEventListenerOverrideActive = false;

const overrideEventListeners = () => {
    if (isEventListenerOverrideActive) return;
    
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        // For touch, wheel, and pointer events that TLDraw uses, make them non-passive
        if (type === 'touchstart' || type === 'touchmove' || type === 'touchend' || 
            type === 'wheel' || type === 'mousewheel' || 
            type === 'pointerdown' || type === 'pointermove' || type === 'pointerup') {
            return originalAddEventListener.call(this, type, listener, { 
                ...options, 
                passive: false 
            });
        }
        return originalAddEventListener.call(this, type, listener, options);
    };
    isEventListenerOverrideActive = true;
};

const restoreEventListeners = () => {
    if (!isEventListenerOverrideActive) return;
    EventTarget.prototype.addEventListener = originalAddEventListener;
    isEventListenerOverrideActive = false;
};

// Override immediately
overrideEventListeners();

// Suppress passive event listener warnings from TLDraw (only in non-debug mode)
const originalConsoleError = console.error;
console.error = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && 
        (message.includes('Unable to preventDefault inside passive event listener') ||
         message.includes('passive event listener'))) {
        // Always suppress passive event listener warnings
        return;
    }
    // Only show other errors if debug mode is enabled
    if (isDebugMode()) {
        originalConsoleError(...args);
    }
};

const cloneSnapshot = (snapshot) => {
    if (!snapshot) {
        return snapshot;
    }

    if (typeof structuredClone === 'function') {
        return structuredClone(snapshot);
    }

    return JSON.parse(JSON.stringify(snapshot));
};

const normalizeSnapshotForPersist = (snapshot, nameFallback = 'Untitled drawing') => {
    if (!snapshot) {
        return null;
    }

    const fallback = typeof nameFallback === 'string' && nameFallback.trim() !== '' ? nameFallback : 'Untitled drawing';
    const next = cloneSnapshot(snapshot);

    if (!next.document || typeof next.document !== 'object') {
        next.document = { name: fallback };
    } else {
        next.document = { ...next.document };

        if (typeof next.document.name !== 'string' || next.document.name.trim() === '') {
            next.document.name = fallback;
        }

        if (next.document.store && typeof next.document.store === 'object') {
            const store = { ...next.document.store };
            
            // Fix image assets with null URLs
            Object.keys(store).forEach(key => {
                const asset = store[key];
                if (asset && asset.type === 'image' && asset.props && asset.props.url === null) {
                    // Remove or replace null URLs with empty string or placeholder
                    store[key] = {
                        ...asset,
                        props: {
                            ...asset.props,
                            url: '' // Set to empty string instead of null
                        }
                    };
                }
            });
            
            const documentNode = store['document:document'];
            if (documentNode && typeof documentNode === 'object') {
                const updatedNode = { ...documentNode };
                if (typeof updatedNode.name !== 'string' || updatedNode.name.trim() === '') {
                    updatedNode.name = fallback;
                }
                store['document:document'] = updatedNode;
            }
            next.document.store = store;
        }
    }

    return next;
};

const formatTimestamp = (value) => {
    if (!value) {
        return 'Never saved';
    }

    try {
        const date = new Date(value);

        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    } catch (_error) {
        return value;
    }
};

export default function DrawIndex({ drawings: initialDrawings = [] }) {
    const [drawings, setDrawings] = useState(initialDrawings);
    const [activeDrawing, setActiveDrawing] = useState(null);
    const [titleDraft, setTitleDraft] = useState('');
    const [loadingDrawing, setLoadingDrawing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [saveStatus, setSaveStatus] = useState({
        isSaving: false,
        lastSavedAt: null,
        error: null,
    });
    const [editorReady, setEditorReady] = useState(false);

    const editorRef = useRef(null);
    const blankSnapshotRef = useRef(null);
    const pendingSnapshotRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const pendingLoadRef = useRef(null);
    const drawingCacheRef = useRef(new Map());

    // Ensure event listeners are overridden and restore on cleanup
    useEffect(() => {
        overrideEventListeners();
        return () => {
            restoreEventListeners();
        };
    }, []);

    const persistDrawing = useCallback(
        async (id, payload, { announce = true } = {}) => {
            if (!id) {
                return;
            }

            const documentName =
                payload?.title ??
                drawingCacheRef.current.get(id)?.title ??
                activeDrawing?.title ??
                undefined;

            try {
                setSaveStatus((prev) => ({
                    ...prev,
                    isSaving: true,
                    error: null,
                }));

                const normalizedPayload = payload?.document
                    ? {
                          ...payload,
                          document: normalizeSnapshotForPersist(payload.document, documentName),
                      }
                    : payload;

                const { data } = await window.axios.patch(route('draw.update', { drawing: id }), normalizedPayload);

                drawingCacheRef.current.set(id, data.drawing);
                setActiveDrawing((previous) =>
                    previous && previous.id === id ? data.drawing : previous,
                );
                setDrawings((previous) =>
                    previous.map((item) =>
                        item.id === id
                            ? {
                                  ...item,
                                  title: data.drawing.title,
                                  updated_at: data.drawing.updated_at,
                              }
                            : item,
                    ),
                );

                if (announce) {
                    setSaveStatus({
                        isSaving: false,
                        lastSavedAt: data.drawing.updated_at,
                        error: null,
                    });
                } else {
                    setSaveStatus((prev) => ({ ...prev, isSaving: false }));
                }
            } catch (error) {
                debugError(error);
                setSaveStatus((prev) => ({
                    ...prev,
                    isSaving: false,
                    error: 'Failed to save drawing. Changes will retry shortly.',
                }));
            }
        },
        [activeDrawing?.document, activeDrawing?.title],
    );

    const flushPendingSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        if (pendingSnapshotRef.current && activeDrawing?.id) {
            const snapshot = pendingSnapshotRef.current;
            pendingSnapshotRef.current = null;
            persistDrawing(activeDrawing.id, { document: snapshot }, { announce: false });
        }
    }, [activeDrawing?.id, persistDrawing]);

    const queueSave = useCallback(
        (snapshot) => {
            if (!activeDrawing?.id) {
                return;
            }

            pendingSnapshotRef.current = snapshot;
            setSaveStatus((prev) => ({ ...prev, isSaving: true, error: null }));

            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
                const payload = pendingSnapshotRef.current;
                pendingSnapshotRef.current = null;

                persistDrawing(activeDrawing.id, { document: payload });
            }, 800);
        },
        [activeDrawing?.id, persistDrawing],
    );

    const loadDrawingIntoEditor = useCallback((drawing) => {
        const sanitizedDrawing = drawing
            ? {
                  ...drawing,
                  document: normalizeSnapshotForPersist(drawing.document, drawing.title),
              }
            : null;

        if (drawing?.id && sanitizedDrawing?.document !== drawing?.document) {
            drawingCacheRef.current.set(drawing.id, sanitizedDrawing);
            // Call persistDrawing directly without dependency to avoid infinite loop
            persistDrawing(drawing.id, { document: sanitizedDrawing.document }, { announce: false });
        }

        setActiveDrawing(sanitizedDrawing);
        setTitleDraft(sanitizedDrawing?.title ?? '');
        setSaveStatus((prev) => ({
            ...prev,
            lastSavedAt: sanitizedDrawing?.updated_at ?? prev.lastSavedAt,
            error: null,
        }));

        const editor = editorRef.current;
        if (!editor) {
            pendingLoadRef.current = sanitizedDrawing?.document ?? null;
            return;
        }

        const snapshot = sanitizedDrawing?.document ?? blankSnapshotRef.current;
        if (snapshot) {
            const normalizedSnapshot = normalizeSnapshotForPersist(snapshot, sanitizedDrawing?.title);
            editor.loadSnapshot(cloneSnapshot(normalizedSnapshot));
        }

        editor.history.clear();
    }, [persistDrawing]);

    const loadDrawing = useCallback(
        async (id) => {
            if (!id) {
                loadDrawingIntoEditor(null);
                return;
            }

            // Always load fresh data when switching drawings to avoid stale cache issues
            // But keep cache for performance optimization
            const cached = drawingCacheRef.current.get(id);
            if (cached && activeDrawing?.id === id) {
                // Only use cache if it's the currently active drawing (for saves/reloads)
                loadDrawingIntoEditor(cached);
                return;
            }

            setLoadingDrawing(true);
            try {
                const { data } = await window.axios.get(route('draw.show', { drawing: id }));
                const freshDrawing = data.drawing;
                
                // Update cache with fresh data
                drawingCacheRef.current.set(id, freshDrawing);
                loadDrawingIntoEditor(freshDrawing);
            } catch (error) {
                debugError('Failed to load drawing:', error);
                setSaveStatus((prev) => ({
                    ...prev,
                    error: 'Unable to load this drawing. Please try again.',
                }));
                // If network fails, try to use cached version as fallback
                if (cached) {
                    debugLog('Using cached version as fallback');
                    loadDrawingIntoEditor(cached);
                }
            } finally {
                setLoadingDrawing(false);
            }
        },
        [loadDrawingIntoEditor, activeDrawing?.id],
    );

    const handleCreateDrawing = useCallback(async () => {
        if (!editorRef.current) {
            return;
        }

        flushPendingSave();
        setCreating(true);

        try {
            const title = `Untitled sketch ${drawings.length + 1}`;
            const baseSnapshot = blankSnapshotRef.current ?? editorRef.current.getSnapshot();
            const defaultSnapshot = normalizeSnapshotForPersist(baseSnapshot, title);
            const { data } = await window.axios.post(route('draw.store'), {
                title,
                document: normalizeSnapshotForPersist(defaultSnapshot, title),
            });

            drawingCacheRef.current.set(data.drawing.id, data.drawing);
            setDrawings((prev) => [data.drawing, ...prev]);
            setActiveId(data.drawing.id);
            loadDrawingIntoEditor(data.drawing);
        } catch (error) {
            debugError(error);
            setSaveStatus((prev) => ({
                ...prev,
                error: 'Unable to create a new drawing right now.',
            }));
        } finally {
            setCreating(false);
        }
    }, [drawings.length, flushPendingSave, loadDrawingIntoEditor]);

    const handleTitleBlur = useCallback(async () => {
        if (!activeDrawing?.id) {
            return;
        }

        const trimmed = titleDraft.trim();
        if (!trimmed || trimmed === activeDrawing.title) {
            setTitleDraft(activeDrawing.title);
            return;
        }

        setActiveDrawing((prev) =>
            prev ? { ...prev, title: trimmed } : prev,
        );

        const currentSnapshot = editorRef.current?.getSnapshot() ?? activeDrawing.document;
        await persistDrawing(activeDrawing.id, {
            title: trimmed,
            document: normalizeSnapshotForPersist(currentSnapshot, trimmed),
        });
    }, [activeDrawing, persistDrawing, titleDraft]);

    const handleTitleKeyDown = useCallback(
        (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                event.target.blur();
            }
        },
        [],
    );

    const handleSelectDrawing = useCallback(
        (id) => {
            if (activeDrawing?.id === id) {
                return; // Already on this drawing
            }

            flushPendingSave();
            loadDrawing(id);
        },
        [activeDrawing?.id, flushPendingSave, loadDrawing],
    );

    const handleEditorMount = useCallback(async (editor) => {
        editorRef.current = editor;

        // Clear any corrupted TLDraw IndexedDB data
        try {
            const dbs = await window.indexedDB.databases();
            const tldrawDbs = dbs.filter(db => db.name && db.name.includes('TLDRAW'));
            for (const db of tldrawDbs) {
                window.indexedDB.deleteDatabase(db.name);
            }
        } catch (error) {
            debugWarn('Could not clear TLDraw IndexedDB:', error);
        }

        const rawSnapshot = editor.getSnapshot();
        const initialSnapshot = normalizeSnapshotForPersist(rawSnapshot, 'Untitled drawing');
        blankSnapshotRef.current = initialSnapshot;
        editor.loadSnapshot(cloneSnapshot(initialSnapshot));
        setEditorReady(true);

        editor.updateInstanceState({
            isGridMode: true,
            isPenMode: false,
        });
        editor.setStyleForNextShapes(DefaultColorStyle, 'black');
        editor.setStyleForNextShapes(DefaultDashStyle, 'draw');
        editor.setStyleForNextShapes(DefaultSizeStyle, 'm');
        editor.setCurrentTool('draw');

        if (pendingLoadRef.current) {
            const normalizedPending = normalizeSnapshotForPersist(
                pendingLoadRef.current,
                activeDrawing?.title ?? 'Untitled drawing',
            );
            editor.loadSnapshot(cloneSnapshot(normalizedPending));
            pendingLoadRef.current = null;
        }
    }, []);

    useEffect(() => {
        // Only load the first drawing once per session - no switching
        if (drawings.length > 0 && !activeDrawing) {
            loadDrawing(drawings[0].id);
        }
    }, [drawings, activeDrawing, loadDrawing]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !activeDrawing?.id) {
            return () => {};
        }

        const removeListener = editor.store.listen(
            () => {
                const snapshot = editor.getSnapshot();
                const normalized = normalizeSnapshotForPersist(snapshot, activeDrawing?.title);
                queueSave(normalized);
            },
            { scope: 'document', source: 'user' },
        );

        return () => {
            removeListener?.();
        };
    }, [activeDrawing?.id, activeDrawing?.title, queueSave]);

    // WebSocket listener for live updates
    useEffect(() => {
        if (!activeDrawing?.id || !window.Echo) {
            debugLog('[WebSocket] Skipping listener - activeDrawing:', !!activeDrawing?.id, 'Echo:', !!window.Echo);
            return () => {};
        }

        const channelName = `drawings.${activeDrawing.id}`;
        debugLog('[WebSocket] Setting up listener for channel:', channelName);
        
        const channel = window.Echo.private(channelName);

        // Log subscription success
        channel.subscribed(() => {
            debugLog('[WebSocket] Successfully subscribed to:', channelName);
        });

        // Log subscription error
        channel.error((error) => {
            debugError('[WebSocket] Subscription error for', channelName, ':', error);
        });

        channel.listen('.DrawingUpdated', (e) => {
            debugLog('[WebSocket] Received DrawingUpdated event:', e);
            
            // Don't update if this is the same drawing that was just saved by this client
            const lastSavedByThisClient = saveStatus.lastSavedAt;
            const serverUpdatedAt = new Date(e.updated_at);
            
            if (lastSavedByThisClient && serverUpdatedAt <= new Date(lastSavedByThisClient)) {
                debugLog('[WebSocket] Ignoring update from this client');
                return; // Ignore updates that are from this client
            }

            // Update the drawing if it's different from what we have
            if (e.document && JSON.stringify(e.document) !== JSON.stringify(activeDrawing.document)) {
                debugLog('[WebSocket] Updating drawing with new data');
                loadDrawingIntoEditor({
                    id: e.id,
                    title: e.title,
                    document: e.document,
                    updated_at: e.updated_at,
                });
            } else {
                debugLog('[WebSocket] No update needed - document is the same');
            }

            // Update the drawings list if title changed
            setDrawings(prev => prev.map(d => 
                d.id === e.id ? { ...d, title: e.title, updated_at: e.updated_at } : d
            ));
        });

        return () => {
            debugLog('[WebSocket] Cleaning up listener for:', channelName);
            channel.stopListening('.DrawingUpdated');
            window.Echo.leaveChannel(channelName);
        };
    }, [activeDrawing?.id, loadDrawingIntoEditor]);

    const statusBadge = useMemo(() => {
        if (saveStatus.isSaving) {
            return (
                <span className="inline-flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving changes…
                </span>
            );
        }

        if (saveStatus.error) {
            return (
                <span className="text-xs text-red-500 dark:text-red-400">
                    {saveStatus.error}
                </span>
            );
        }

        if (saveStatus.lastSavedAt) {
            return (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    Last saved {formatTimestamp(saveStatus.lastSavedAt)}
                </span>
            );
        }

        return null;
    }, [saveStatus]);

    return (
        <AppLayout title="Draw">
            <Head title="Draw" />

            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                        Draw
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Sketch ideas, plan projects, or brainstorm visually with the TLDraw canvas.
                        Drawings auto-save while you work.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-1">
                    <Card className="flex h-[75vh] flex-col overflow-hidden">
                        <CardHeader className="space-y-4 border-b border-gray-100 pt-4 pb-4 dark:border-slate-800">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                        Canvas
                                    </CardTitle>
                                    {statusBadge}
                                </div>
                                <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
                                    {/* Drawing Selector */}
                                    <div className="flex flex-col gap-1">
                                        <label
                                            htmlFor="drawing-selector"
                                            className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                                        >
                                            Sketch
                                        </label>
                                        <select
                                            id="drawing-selector"
                                            value={activeDrawing?.id || ''}
                                            onChange={(e) => handleSelectDrawing(e.target.value)}
                                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                        >
                                            {drawings.length === 0 ? (
                                                <option value="">No sketches</option>
                                            ) : (
                                                drawings.map((drawing) => (
                                                    <option key={drawing.id} value={drawing.id}>
                                                        {drawing.title}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                    
                                    {/* Title Input */}
                                    {activeDrawing ? (
                                        <div className="flex flex-col gap-1">
                                            <label
                                                htmlFor="drawing-title"
                                                className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                                            >
                                                Title
                                            </label>
                                            <Input
                                                id="drawing-title"
                                                value={titleDraft}
                                                onChange={(event) => setTitleDraft(event.target.value)}
                                                onBlur={handleTitleBlur}
                                                onKeyDown={handleTitleKeyDown}
                                                className="lg:w-64"
                                                placeholder="Name your drawing"
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="relative flex-1 overflow-hidden p-0">
                            <div className="relative h-full w-full overflow-hidden">
                                <Suspense
                                    fallback={(
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                        </div>
                                    )}
                                >
                                    <div
                                        className={`h-full w-full transition-opacity duration-200 ${
                                            drawings.length === 0 ? 'pointer-events-none opacity-0' : 'opacity-100'
                                        }`}
                                    >
                                        <TldrawComponent
                                            onMount={handleEditorMount}
                                            hideUi={false}
                                            inferDarkMode
                                            licenseKey={TL_DRAW_LICENSE_KEY || undefined}
                                        />
                                    </div>
                                </Suspense>

                                {drawings.length === 0 && !loadingDrawing ? (
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-950/70 text-center backdrop-blur-sm">
                                        <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
                                            {!editorReady ? (
                                                <>
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    Loading drawing workspace…
                                                </>
                                            ) : (
                                                'Ready to create your first drawing'
                                            )}
                                        </div>
                                        <p className="max-w-sm text-sm text-slate-200">
                                            Create a new drawing to start sketching. Your work will save automatically every few seconds.
                                        </p>
                                        <Button onClick={handleCreateDrawing} disabled={creating || !editorReady}>
                                            {creating ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Plus className="mr-2 h-4 w-4" />
                                            )}
                                            Create drawing
                                        </Button>
                                    </div>
                                ) : null}

                                {loadingDrawing ? (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                    </div>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
