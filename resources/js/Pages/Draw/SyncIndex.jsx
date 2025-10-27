import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { Head } from '@inertiajs/react';
import {
    DefaultColorStyle,
    DefaultDashStyle,
    DefaultSizeStyle,
} from '@tldraw/editor';
import { useSync } from '@tldraw/sync';
import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import { Input } from '../../Components/ui/input';
import { Loader2, Plus, Users } from 'lucide-react';
import { useTLDrawSync, useTLDrawPresence } from '../../hooks/useTLDrawSync';

const TldrawComponent = lazy(() => import('tldraw').then((module) => ({ default: module.Tldraw })));

const TL_DRAW_LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY;

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

// Suppress passive event listener warnings from TLDraw
const originalConsoleError = console.error;
console.error = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && 
        (message.includes('Unable to preventDefault inside passive event listener') ||
         message.includes('passive event listener'))) {
        return; // Suppress passive event listener warnings
    }
    originalConsoleError(...args);
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

export default function DrawSyncIndex({ drawings: initialDrawings = [] }) {
    const [drawings, setDrawings] = useState(initialDrawings);
    const [activeId, setActiveId] = useState(initialDrawings[0]?.id ?? null);
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
    const [connectedUsers, setConnectedUsers] = useState([]);

    const editorRef = useRef(null);
    const blankSnapshotRef = useRef(null);
    const drawingCacheRef = useRef(new Map());

    // TLDraw sync integration
    const { store, isConnected, user } = useTLDrawSync(activeId);
    const { users: presenceUsers, updatePresence } = useTLDrawPresence(activeId);

    // Ensure event listeners are overridden and restore on cleanup
    useEffect(() => {
        overrideEventListeners();
        return () => {
            restoreEventListeners();
        };
    }, []);

    // Update connected users when presence changes
    useEffect(() => {
        setConnectedUsers(presenceUsers);
    }, [presenceUsers]);

    // Load drawing data
    const loadDrawing = useCallback(
        async (id) => {
            if (!id) {
                setActiveDrawing(null);
                return;
            }

            const cached = drawingCacheRef.current.get(id);
            if (cached) {
                setActiveDrawing(cached);
                return;
            }

            setLoadingDrawing(true);
            try {
                const { data } = await window.axios.get(route('draw.show', { drawing: id }));
                drawingCacheRef.current.set(id, data.drawing);
                setActiveDrawing(data.drawing);
            } catch (error) {
                console.error(error);
                setSaveStatus((prev) => ({
                    ...prev,
                    error: 'Unable to load this drawing. Please try again.',
                }));
            } finally {
                setLoadingDrawing(false);
            }
        },
        []
    );

    // Save drawing to backend
    const persistDrawing = useCallback(
        async (id, payload) => {
            if (!id) return;

            try {
                setSaveStatus((prev) => ({
                    ...prev,
                    isSaving: true,
                    error: null,
                }));

                const normalizedPayload = payload?.document
                    ? {
                          ...payload,
                          document: normalizeSnapshotForPersist(payload.document, payload.title),
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

                setSaveStatus({
                    isSaving: false,
                    lastSavedAt: data.drawing.updated_at,
                    error: null,
                });
            } catch (error) {
                console.error(error);
                setSaveStatus((prev) => ({
                    ...prev,
                    isSaving: false,
                    error: 'Failed to save drawing. Changes will retry shortly.',
                }));
            }
        },
        []
    );

    // Create new drawing
    const handleCreateDrawing = useCallback(async () => {
        if (!editorRef.current) return;

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
            setActiveDrawing(data.drawing);
        } catch (error) {
            console.error(error);
            setSaveStatus((prev) => ({
                ...prev,
                error: 'Unable to create a new drawing right now.',
            }));
        } finally {
            setCreating(false);
        }
    }, [drawings.length]);

    // Handle title change
    const handleTitleBlur = useCallback(async () => {
        if (!activeDrawing?.id) return;

        const trimmed = titleDraft.trim();
        if (!trimmed || trimmed === activeDrawing.title) {
            setTitleDraft(activeDrawing.title);
            return;
        }

        const currentSnapshot = editorRef.current?.getSnapshot() ?? activeDrawing.document;
        await persistDrawing(activeDrawing.id, {
            title: trimmed,
            document: normalizeSnapshotForPersist(currentSnapshot, trimmed),
        });
    }, [activeDrawing, persistDrawing, titleDraft]);

    // Handle editor mount
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
            console.warn('Could not clear TLDraw IndexedDB:', error);
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

        // Load active drawing if exists
        if (activeDrawing?.document) {
            const normalizedSnapshot = normalizeSnapshotForPersist(activeDrawing.document, activeDrawing.title);
            editor.loadSnapshot(cloneSnapshot(normalizedSnapshot));
        }
    }, [activeDrawing]);

    // Handle editor changes (sync with TLDraw sync)
    const handleEditorChange = useCallback((editor) => {
        if (!activeDrawing?.id || !isConnected) return;

        const snapshot = editor.getSnapshot();
        const normalized = normalizeSnapshotForPersist(snapshot, activeDrawing?.title);
        
        // Persist to backend
        persistDrawing(activeDrawing.id, { document: normalized });
    }, [activeDrawing?.id, activeDrawing?.title, isConnected, persistDrawing]);

    // Effects
    useEffect(() => {
        if (!activeId && drawings.length > 0) {
            setActiveId(drawings[0].id);
        }
    }, [activeId, drawings]);

    useEffect(() => {
        if (activeId) {
            loadDrawing(activeId);
        }
    }, [activeId, loadDrawing]);

    useEffect(() => {
        if (activeDrawing) {
            setTitleDraft(activeDrawing.title ?? '');
            setSaveStatus((prev) => ({
                ...prev,
                lastSavedAt: activeDrawing.updated_at ?? prev.lastSavedAt,
                error: null,
            }));
        }
    }, [activeDrawing]);

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
                        Drawings auto-save while you work and sync in real-time.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <CardTitle className="text-base font-medium">Your sketches</CardTitle>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleCreateDrawing}
                                disabled={creating || !editorReady}
                            >
                                {creating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="mr-2 h-4 w-4" />
                                )}
                                New drawing
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {drawings.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No drawings yet. Create your first drawing to get started.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {drawings.map((drawing) => {
                                        const isActive = drawing.id === activeId;

                                        return (
                                            <li key={drawing.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveId(drawing.id)}
                                                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-indigo-500 hover:bg-indigo-50/60 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10 ${
                                                        isActive
                                                            ? 'border-indigo-500 bg-indigo-50/80 font-medium dark:border-indigo-400 dark:bg-indigo-500/10'
                                                            : 'border-gray-200 dark:border-slate-800'
                                                    }`}
                                                >
                                                    <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                                                        {drawing.title}
                                                    </div>
                                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        Updated {formatTimestamp(drawing.updated_at)}
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="flex h-[75vh] flex-col overflow-hidden">
                        <CardHeader className="space-y-4 border-b border-gray-100 pt-4 pb-4 dark:border-slate-800">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                        {activeDrawing ? 'Canvas settings' : 'No drawing selected'}
                                    </CardTitle>
                                    <div className="flex items-center gap-4">
                                        {statusBadge}
                                        {isConnected && (
                                            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                Connected
                                            </span>
                                        )}
                                        {connectedUsers.length > 0 && (
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                <Users className="h-3 w-3" />
                                                {connectedUsers.length} user{connectedUsers.length !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {activeDrawing ? (
                                    <div className="flex w-full flex-col gap-2 text-sm lg:w-auto lg:flex-row lg:items-center">
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
                                            className="lg:w-64"
                                            placeholder="Name your drawing"
                                        />
                                    </div>
                                ) : null}
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
                                            onChange={handleEditorChange}
                                            store={store}
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
