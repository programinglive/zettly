import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    DefaultColorStyle,
    DefaultDashStyle,
    DefaultSizeStyle,
} from '@tldraw/editor';
import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import { Input } from '../../Components/ui/input';
import { ChevronLeft, Download, Loader2, Plus, Trash2, Check, Edit, Eye } from 'lucide-react';
import * as Sentry from '@sentry/react';

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

// Simple production logger for important events only
const prodLog = (...args) => {
    if (!isDebugMode()) {
        console.log('[ZETTLY]', ...args);
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

// Gallery view component
const DrawingGallery = ({ drawings, onDrawingClick, onDeleteDrawing, onEditTitle, creating }) => {
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    // Local debounce for title autosave in gallery
    const galleryTitleSaveTimeoutRef = useRef(null);

    const autoSaveGalleryTitle = useCallback((id, title) => {
        if (galleryTitleSaveTimeoutRef.current) {
            clearTimeout(galleryTitleSaveTimeoutRef.current);
        }
        galleryTitleSaveTimeoutRef.current = setTimeout(() => {
            const current = drawings.find(d => d.id === id)?.title ?? '';
            const trimmed = title.trim();
            if (trimmed && trimmed !== current) {
                onEditTitle(id, trimmed);
            }
        }, 1000);
    }, [drawings, onEditTitle]);

    const handleEdit = (drawing) => {
        setEditingId(drawing.id);
        setEditTitle(drawing.title);
    };

    const handleSave = async (id) => {
        if (editTitle.trim() && editTitle !== drawings.find(d => d.id === id)?.title) {
            await onEditTitle(id, editTitle.trim());
        }
        setEditingId(null);
        setEditTitle('');
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditTitle('');
    };

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {drawings.map((drawing) => (
                <Card key={drawing.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="p-4 pb-2">
                        <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center mb-3 overflow-hidden">
                            {drawing.thumbnail ? (
                                <img
                                    src={drawing.thumbnail}
                                    alt={`${drawing.title} preview`}
                                    className="h-full w-full object-contain"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="text-gray-400 dark:text-gray-500 text-sm text-center px-4">
                                    {drawing.title}
                                </div>
                            )}
                        </div>
                        <div className="flex items-start justify-between gap-2">
                            {editingId === drawing.id ? (
                                <Input
                                    value={editTitle}
                                    onChange={(e) => {
                                    setEditTitle(e.target.value);
                                    autoSaveGalleryTitle(drawing.id, e.target.value);
                                }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(drawing.id);
                                        if (e.key === 'Escape') handleCancel();
                                    }}
                                    onBlur={() => handleSave(drawing.id)}
                                    className="text-sm h-7"
                                    autoFocus
                                />
                            ) : (
                                <CardTitle 
                                    className="text-sm font-medium truncate flex-1"
                                    onClick={() => onDrawingClick(drawing.id)}
                                >
                                    {drawing.title}
                                </CardTitle>
                            )}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(drawing)}
                                    className="h-7 w-7 p-0"
                                >
                                    <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onDeleteDrawing(drawing.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Last updated {formatTimestamp(drawing.updated_at)}</span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDrawingClick(drawing.id)}
                                className="h-6 px-2 text-xs"
                            >
                                <Eye className="h-3 w-3 mr-1" />
                                Open
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default function DrawIndex({ drawings: initialDrawings = [] }) {
    const { props } = usePage();
    const isGallery = !props.drawing; // If no drawing prop, we're on the gallery page
    const [drawings, setDrawings] = useState(initialDrawings);
    const [activeDrawing, setActiveDrawing] = useState(props.drawing || null);
    const [titleDraft, setTitleDraft] = useState('');
    const lastActiveIdRef = useRef(null);
    const [loadingDrawing, setLoadingDrawing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [saveStatus, setSaveStatus] = useState({
        isSaving: false,
        lastSavedAt: null,
        error: null,
    });
    const [editorReady, setEditorReady] = useState(false);

    const editorRef = useRef(null);
    const suppressAutosaveRef = useRef(false);
    const blankSnapshotRef = useRef(null);
    const pendingSnapshotRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const pendingLoadRef = useRef(null);
    const changeCheckIntervalRef = useRef(null);
    const lastQueuedSnapshotRef = useRef(null);
    const lastPersistedSnapshotRef = useRef(null);
    const drawingCacheRef = useRef(new Map());
    const lastGeneratedThumbnailRef = useRef(null);

    // Ensure event listeners are overridden and restore on cleanup
    useEffect(() => {
        overrideEventListeners();
        return () => {
            restoreEventListeners();
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return () => {};
        }

        const handleWindowError = (event) => {
            if (!event) return;
            const error = event.error || new Error(event.message || 'Unknown window error');
            debugError('[Draw] Capturing window error for Sentry:', error);
            Sentry.captureException(error, {
                tags: {
                    component: 'DrawIndex',
                    source: 'window.error',
                },
                extra: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                },
            });
        };

        const handleUnhandledRejection = (event) => {
            if (!event) return;
            const reason = event.reason instanceof Error ? event.reason : new Error(`Unhandled rejection: ${event.reason}`);
            debugError('[Draw] Capturing unhandled rejection for Sentry:', reason);
            Sentry.captureException(reason, {
                tags: {
                    component: 'DrawIndex',
                    source: 'window.unhandledrejection',
                },
            });
        };

        window.addEventListener('error', handleWindowError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleWindowError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    const generateThumbnailFromEditor = useCallback(async () => {
        if (!editorRef.current || isGallery) {
            return null;
        }

        try {
            const editor = editorRef.current;
            const currentShapeIdsRaw = editor.getCurrentPageShapeIds();
            const shapeIds = Array.isArray(currentShapeIdsRaw)
                ? currentShapeIdsRaw
                : Array.from(currentShapeIdsRaw ?? []);

            if (!shapeIds.length) {
                debugLog('[Draw] Thumbnail generation skipped - no shapes on canvas');
                return null;
            }

            const { url } = await editor.toImageDataUrl(shapeIds, {
                format: 'png',
                background: false,
                padding: 32,
                scale: 1,
            });

            debugLog('[Draw] Generated thumbnail from editor');
            return url;
        } catch (error) {
            debugWarn('[Draw] Failed to generate thumbnail:', error);
            return null;
        }
    }, [isGallery]);

    const persistDrawing = useCallback(
        async (id, payload, { announce = true } = {}) => {
            debugLog('[Draw] persistDrawing called:', { id, payloadKeys: Object.keys(payload), announce });
            prodLog('Drawing save started');
            
            if (!id) {
                debugLog('[Draw] No drawing ID provided, skipping persist');
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
                    ? normalizeSnapshotForPersist(payload.document, documentName)
                    : null;

                const thumbnail = payload?.thumbnail ?? lastGeneratedThumbnailRef.current ?? null;

                debugLog('[Draw] Sending to server:', {
                    id,
                    hasDocument: !!normalizedPayload,
                    documentType: typeof normalizedPayload,
                    documentKeys: normalizedPayload ? Object.keys(normalizedPayload) : [],
                    hasStore: !!normalizedPayload?.store,
                    storeKeys: normalizedPayload?.store ? Object.keys(normalizedPayload.store) : [],
                    shapeCount: normalizedPayload?.store ? 
                        Object.keys(normalizedPayload.store).filter(key => key.startsWith('shape:')).length : 0
                });

                const payloadToSend = {
                    ...(payload?.title ? { title: payload.title } : {}),
                    ...(normalizedPayload ? { document: normalizedPayload } : {}),
                    ...(thumbnail ? { thumbnail } : {}),
                };

                const { data } = await window.axios.patch(route('draw.update', { drawing: id }), payloadToSend);
                
                debugLog('[Draw] ✅ SUCCESS! Server response:', data.status, data);
                prodLog('Drawing saved successfully');
                
                // DISABLED: Don't update cache
                // drawingCacheRef.current.set(id, data.drawing);
                setActiveDrawing((previous) =>
                    previous && previous.id === id ? data.drawing : previous,
                );
                setDrawings((prev) =>
                    prev.map((drawing) =>
                        drawing.id === id
                            ? {
                                  ...drawing,
                                  title: data.drawing.title,
                                  updated_at: data.drawing.updated_at,
                                  thumbnail: data.drawing.thumbnail,
                              }
                            : drawing,
                    ),
                );
                lastGeneratedThumbnailRef.current = null;
                if (normalizedPayload) {
                    lastPersistedSnapshotRef.current = JSON.stringify(normalizedPayload);
                    lastQueuedSnapshotRef.current = lastPersistedSnapshotRef.current;
                }
                setSaveStatus((prev) => ({
                    ...prev,
                    isSaving: false,
                    lastSavedAt: data.drawing.updated_at,
                    error: null,
                }));
            } catch (error) {
                debugError('[Draw] Failed to persist drawing:', error);
                Sentry.captureException(error, {
                    tags: {
                        component: 'DrawIndex',
                        action: 'persistDrawing',
                    },
                    extra: {
                        drawingId: id,
                        hasDocument: !!payload?.document,
                    },
                });
                setSaveStatus((prev) => ({
                    ...prev,
                    isSaving: false,
                    error: 'Failed to save drawing. Changes will retry shortly.',
                }));
                saveTimeoutRef.current = null;
            }
        },
        [activeDrawing?.title],
    );

    const queueSave = useCallback(
        (snapshot) => {
            debugLog('[Draw] queueSave called');
            
            if (suppressAutosaveRef.current) {
                debugLog('[Draw] ⏸️ queueSave suppressed (initial load or cleanup)');
                return;
            }

            if (!editorRef.current || isGallery || !activeDrawing?.id) {
                debugLog('[Draw] ⏸️ queueSave blocked - missing editor or in gallery');
                return;
            }

            const editor = editorRef.current;
            const currentSnapshot = snapshot || editor.getSnapshot();
            if (!currentSnapshot) {
                debugWarn('[Draw] queueSave skipped - no snapshot available');
                return;
            }

            const normalized = normalizeSnapshotForPersist(
                currentSnapshot,
                activeDrawing?.title || currentSnapshot?.document?.name || 'Untitled drawing'
            );
            const serialized = JSON.stringify(normalized);

            if (serialized === lastQueuedSnapshotRef.current) {
                debugLog('[Draw] 🔁 queueSave skipped - snapshot already queued');
                return;
            }

            debugLog('[Draw] 🚨 queueSave TRIGGERED!', {
                hasSnapshot: !!snapshot,
                normalizedKeys: Object.keys(normalized || {}),
                timestamp: new Date().toISOString(),
            });

            prodLog('Drawing change detected');
            lastQueuedSnapshotRef.current = serialized;
            pendingSnapshotRef.current = normalized;
            setSaveStatus((prev) => ({ ...prev, isSaving: true, error: null }));

            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(async () => {
                if (!editorRef.current || isGallery || suppressAutosaveRef.current) {
                    debugLog('[Draw] ⏸️ Save cancelled - editor cleaned up or suppressed');
                    return;
                }

                const snapshotToPersist = pendingSnapshotRef.current || normalized;
                pendingSnapshotRef.current = null;

                debugLog('[Draw] Executing queued save with normalized snapshot');
                let thumbnailPayload = {};
                const generatedThumbnail = await generateThumbnailFromEditor();
                if (generatedThumbnail && generatedThumbnail !== activeDrawing?.thumbnail) {
                    lastGeneratedThumbnailRef.current = generatedThumbnail;
                    thumbnailPayload = { thumbnail: generatedThumbnail };
                }

                await persistDrawing(activeDrawing.id, {
                    document: snapshotToPersist,
                    ...thumbnailPayload,
                });
                saveTimeoutRef.current = null;
            }, 1000);
        },
        [activeDrawing?.id, activeDrawing?.title, activeDrawing?.thumbnail, generateThumbnailFromEditor, isGallery, persistDrawing]
    );

    const flushPendingSave = useCallback(async () => {
        debugLog('[Draw] flushPendingSave called');
        
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
            
            if (pendingSnapshotRef.current && activeDrawing?.id) {
                const snapshot = pendingSnapshotRef.current;
                pendingSnapshotRef.current = null;
                debugLog('[Draw] Flushing pending save immediately');
                const generatedThumbnail = await generateThumbnailFromEditor();
                const thumbnailPayload = generatedThumbnail && generatedThumbnail !== activeDrawing?.thumbnail
                    ? { thumbnail: generatedThumbnail }
                    : {};
                if (generatedThumbnail && generatedThumbnail !== activeDrawing?.thumbnail) {
                    lastGeneratedThumbnailRef.current = generatedThumbnail;
                }
                await persistDrawing(activeDrawing.id, {
                    document: snapshot,
                    ...thumbnailPayload,
                });
            }
        } else {
            debugLog('[Draw] No pending save to flush');
        }
    }, [activeDrawing?.id, activeDrawing?.thumbnail, persistDrawing, generateThumbnailFromEditor]);

    const loadDrawingIntoEditor = useCallback(
        (drawing, editorInstance = null) => {
            debugLog('[Draw] loadDrawingIntoEditor called with drawing:', drawing?.id || 'null');
            
            // Use the passed editor instance or fall back to the ref
            const editor = editorInstance || editorRef.current;
            if (!editor) {
                debugLog('[Draw] Editor not ready, setting pending load');
                pendingLoadRef.current = { drawing };
                return;
            }

            debugLog('[Draw] Original drawing document structure:', {
                hasDocument: !!drawing?.document,
                documentType: typeof drawing?.document,
                hasNestedDocument: !!drawing?.document?.document,
                hasStore: !!drawing?.document?.document?.store,
                storeKeys: drawing?.document?.document?.store ? Object.keys(drawing.document.document.store) : [],
                shapeCount: drawing?.document?.document?.store ? 
                    Object.keys(drawing.document.document.store).filter(key => key.startsWith('shape:')).length : 0
            });

            // Extract the actual TLDraw document from the nested structure
            const tldrawDocument = drawing?.document?.document || drawing?.document || {};
            const actualStore = tldrawDocument?.store || {};
            
            debugLog('[Draw] Extracted TLDraw document:', {
                hasTldrawDocument: !!tldrawDocument,
                hasStore: !!actualStore,
                storeKeys: Object.keys(actualStore),
                shapeCount: Object.keys(actualStore).filter(key => key.startsWith('shape:')).length
            });

            // Clear existing shapes before loading new snapshot
            // Since we have an editor instance, we can proceed regardless of editorReady state
            debugLog('[Draw] ✅ Editor instance available, proceeding with load...');
            
            // Get current shapes before clearing
            const currentShapeIdsRaw = editor.getCurrentPageShapeIds();
            const currentShapeIds = Array.isArray(currentShapeIdsRaw)
                ? currentShapeIdsRaw
                : Array.from(currentShapeIdsRaw ?? []);
            debugLog('[Draw] Clearing existing shapes before loading new snapshot...');
            debugLog('[Draw] Current shapes on page:', {
                count: currentShapeIds.length,
                shapeIds: currentShapeIds
            });

            if (currentShapeIds.length > 0) {
                editor.deleteShapes(currentShapeIds);
                debugLog('[Draw] Shapes deleted successfully');
                
                // Verify shapes are gone
                const remainingShapesRaw = editor.getCurrentPageShapeIds();
                const remainingShapes = Array.isArray(remainingShapesRaw)
                    ? remainingShapesRaw
                    : Array.from(remainingShapesRaw ?? []);
                debugLog('[Draw] Remaining shapes after deletion:', remainingShapes.length);
            } else {
                debugLog('[Draw] No shapes to clear');
            }

            // Now load the new drawing
            try {
                // Get current snapshot from editor
                const currentSnapshot = editor.getSnapshot();
                
                // Process the actual store that contains the shapes
                if (actualStore && Object.keys(actualStore).length > 0) {
                    debugLog('[Draw] 🎯 Processing store with records:', Object.keys(actualStore).length);
                    
                    const validStoredRecords = {};
                    Object.entries(actualStore).forEach(([key, record]) => {
                        debugLog('[Draw] Processing record:', { key, type: typeof record, isObject: typeof record === 'object' });
                        
                        // Include shape records - be more lenient with validation
                        if (key.startsWith('shape:') && record && typeof record === 'object') {
                            // Validate shape has required properties and no null values for critical fields
                            const isValidShape = record.typeName && 
                                (!record.props || record.props.url !== null) && // Filter out shapes with null URLs
                                (!record.props || record.props.text !== null); // Filter out shapes with null text
                            
                            if (isValidShape) {
                                validStoredRecords[key] = record;
                                debugLog('[Draw] ✅ Found shape record:', { key, type: record.typeName || 'unknown' });
                            } else {
                                debugLog('[Draw] ⚠️ Skipping invalid shape:', { key, typeName: record.typeName, hasNullUrl: record.props?.url === null, hasNullText: record.props?.text === null });
                            }
                        } else if (key === 'document:document' && record && typeof record === 'object') {
                            validStoredRecords[key] = record;
                            debugLog('[Draw] ✅ Found document record:', { key });
                        } else if (key.startsWith('shape:') || key.startsWith('document:')) {
                            // Try to include any shape or document records
                            validStoredRecords[key] = record;
                            debugLog('[Draw] ✅ Added record:', { key, hasTypeName: !!record.typeName });
                        } else {
                            debugLog('[Draw] ⏭️ Skipping record:', { key, type: typeof record });
                        }
                    });
                    
                    debugLog('[Draw] 📊 Valid records collected:', {
                        count: Object.keys(validStoredRecords).length,
                        keys: Object.keys(validStoredRecords)
                    });
                    
                    const snapshotToLoad = {
                        ...currentSnapshot,
                        document: {
                            ...currentSnapshot.document,
                            name: drawing?.title || 'Untitled drawing',
                            // Use the tldraw document structure but merge with valid records
                            ...tldrawDocument,
                            store: {
                                ...currentSnapshot.document?.store || {},
                                ...validStoredRecords
                            }
                        }
                    };
                    
                    debugLog('[Draw] 📋 Snapshot details:', {
                        hasStore: !!snapshotToLoad.document.store,
                        storeKeys: Object.keys(snapshotToLoad.document.store),
                        validRecordsCount: Object.keys(validStoredRecords).length,
                        documentExists: !!snapshotToLoad.document,
                        documentName: snapshotToLoad.document.name
                    });
                    
                    debugLog('[Draw] 🚀 Loading snapshot into editor...');
                    editor.loadSnapshot(snapshotToLoad);
                    debugLog('[Draw] ✅ Snapshot loaded successfully');
                } else {
                    debugLog('[Draw] ❌ No shapes to load - keeping editor empty');
                }
            } catch (error) {
                debugError('[Draw] Failed to load drawing:', error);
                // If loading fails, just keep the editor empty
                debugLog('[Draw] Keeping editor empty due to load error');
            }

            debugLog('[Draw] loadDrawingIntoEditor completed');
        },
        [editorReady],
    );

    const loadDrawing = useCallback(
        async (id) => {
            debugLog('[Draw] loadDrawing called with id:', id);
            
            if (!id) {
                debugLog('[Draw] No id provided, loading null drawing');
                loadDrawingIntoEditor(null);
                return;
            }

            // DISABLED: Always load fresh data from server (no cache)
            debugLog('[Draw] Cache disabled, loading fresh drawing from server...');
            setLoadingDrawing(true);
            try {
                const { data } = await window.axios.get(route('draw.show', { drawing: id }));
                const freshDrawing = data.drawing;
                debugLog('[Draw] Fresh drawing loaded:', freshDrawing?.title);
                debugLog('[Draw] Fresh drawing document structure:', {
                    hasDocument: !!freshDrawing?.document,
                    documentType: typeof freshDrawing?.document,
                    hasStore: !!freshDrawing?.document?.store,
                    storeKeys: freshDrawing?.document?.store ? Object.keys(freshDrawing.document.store) : [],
                    shapeCount: freshDrawing?.document?.store ? 
                        Object.keys(freshDrawing.document.store).filter(key => key.startsWith('shape:')).length : 0
                });
                
                // DISABLED: Don't update cache
                // drawingCacheRef.current.set(id, freshDrawing);
                debugLog('[Draw] Setting active drawing to:', freshDrawing.id);
                setActiveDrawing(freshDrawing);
                setTitleDraft(freshDrawing.title);
                debugLog('[Draw] Calling loadDrawingIntoEditor with fresh drawing...');
                loadDrawingIntoEditor(freshDrawing);
            } catch (error) {
                debugError('Failed to load drawing:', error);
                setSaveStatus((prev) => ({
                    ...prev,
                    error: 'Unable to load this drawing. Please try again.',
                }));
            } finally {
                setLoadingDrawing(false);
                debugLog('[Draw] loadDrawing completed');
            }
        },
        [loadDrawingIntoEditor],
    );

    const handleCreateDrawing = useCallback(async () => {
        if (!editorRef.current) {
            return;
        }

        await flushPendingSave();
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
            setActiveDrawing(data.drawing);
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
    }, [drawings.length, loadDrawingIntoEditor]);

    // Autosave status for title
    const [titleSaveStatus, setTitleSaveStatus] = useState({ saving: false, lastSaved: null });
    const titleSaveStatusRef = useRef(titleSaveStatus);

    // Update ref when state changes
    useEffect(() => {
        titleSaveStatusRef.current = titleSaveStatus;
    }, [titleSaveStatus]);

    // Drawing title autosave timeout ref
    const drawingTitleSaveTimeoutRef = useRef(null);

    useEffect(() => {
        if (activeDrawing?.document) {
            const serialized = JSON.stringify(activeDrawing.document);
            lastPersistedSnapshotRef.current = serialized;
            lastQueuedSnapshotRef.current = serialized;
        } else {
            lastPersistedSnapshotRef.current = null;
            lastQueuedSnapshotRef.current = null;
        }
    }, [activeDrawing?.id]);

    useEffect(() => {
        const currentId = activeDrawing?.id ?? null;
        if (currentId !== lastActiveIdRef.current) {
            lastActiveIdRef.current = currentId;
            setTitleDraft(activeDrawing?.title ?? '');
        }
    }, [activeDrawing?.id, activeDrawing?.title]);

    useEffect(() => {
        if (!editorReady || !activeDrawing?.id) {
            return undefined;
        }

        const interval = setInterval(() => {
            if (!editorRef.current || suppressAutosaveRef.current) {
                return;
            }

            try {
                const snapshot = editorRef.current.getSnapshot();
                const normalized = normalizeSnapshotForPersist(
                    snapshot,
                    activeDrawing?.title || snapshot?.document?.name || 'Untitled drawing'
                );
                const serialized = JSON.stringify(normalized);

                if (serialized && serialized !== lastPersistedSnapshotRef.current) {
                    debugLog('[Draw] Detected canvas change, queueing save');
                    queueSave(snapshot);
                }
            } catch (error) {
                debugError('[Draw] Failed to inspect snapshot for autosave', error);
            }
        }, 2000);

        changeCheckIntervalRef.current = interval;
        return () => clearInterval(interval);
    }, [editorReady, activeDrawing?.id, queueSave]);

    const handleTitleBlur = useCallback(async () => {
        // Cancel any pending autosave
        if (drawingTitleSaveTimeoutRef.current) {
            clearTimeout(drawingTitleSaveTimeoutRef.current);
            drawingTitleSaveTimeoutRef.current = null;
        }
        
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

    // Autosave drawing title with debounce
    const autoSaveDrawingTitle = useCallback((title) => {
        // Clear existing timeout
        if (drawingTitleSaveTimeoutRef.current) {
            clearTimeout(drawingTitleSaveTimeoutRef.current);
        }
        
        // Show saving status
        setTitleSaveStatus(prev => ({ saving: true, lastSaved: prev.lastSaved }));
        
        // Set new timeout to save after 1.5 seconds of inactivity
        drawingTitleSaveTimeoutRef.current = setTimeout(async () => {
            if (!activeDrawing?.id) return;
            
            const trimmed = title.trim();
            if (!trimmed || trimmed === activeDrawing.title) {
                setTitleDraft(activeDrawing.title);
                setTitleSaveStatus(prev => ({ saving: false, lastSaved: prev.lastSaved }));
                return;
            }

            debugLog('[Draw] Auto-saving drawing title:', { id: activeDrawing.id, title: trimmed });
            
            setActiveDrawing((prev) =>
                prev ? { ...prev, title: trimmed } : prev,
            );

            const currentSnapshot = editorRef.current?.getSnapshot() ?? activeDrawing.document;
            await persistDrawing(activeDrawing.id, {
                title: trimmed,
                document: normalizeSnapshotForPersist(currentSnapshot, trimmed),
            });
            
            // Update status to show saved
            setTitleSaveStatus({ saving: false, lastSaved: new Date() });
        }, 1500);
    }, [activeDrawing, persistDrawing]);

    const handleTitleKeyDown = useCallback(
        (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                event.target.blur();
            }
        },
        [],
    );

    // Title autosave timeout ref
    const titleSaveTimeoutRef = useRef(null);

    const handleEditTitle = useCallback(async (id, newTitle) => {
        try {
            const { data } = await window.axios.patch(route('draw.update', { drawing: id }), {
                title: newTitle,
            });
            
            setDrawings(prev => prev.map(d => d.id === id ? data.drawing : d));
            
            // If this is the current active drawing, update it too
            if (activeDrawing?.id === id) {
                setActiveDrawing(data.drawing);
                setTitleDraft(data.drawing.title);
            }
        } catch (error) {
            debugError('[Draw] Failed to edit title:', error);
            Sentry.captureException(error, {
                tags: {
                    component: 'DrawIndex',
                    action: 'handleEditTitle',
                },
                extra: {
                    drawingId: id,
                },
            });
        }
    }, [activeDrawing?.id]);

    // Autosave title with debounce
    const autoSaveTitle = useCallback((id, title) => {
        // Clear existing timeout
        if (titleSaveTimeoutRef.current) {
            clearTimeout(titleSaveTimeoutRef.current);
        }
        
        // Set new timeout to save after 1 second of inactivity
        titleSaveTimeoutRef.current = setTimeout(() => {
            if (title.trim() && title !== drawings.find(d => d.id === id)?.title) {
                debugLog('[Draw] Auto-saving title:', { id, title: title.trim() });
                handleEditTitle(id, title.trim());
            }
        }, 1000);
    }, [drawings, handleEditTitle]);

    const handleSave = async (id) => {
        // Immediate save for Enter key
        if (titleSaveTimeoutRef.current) {
            clearTimeout(titleSaveTimeoutRef.current);
            titleSaveTimeoutRef.current = null;
        }
        
        if (editTitle.trim() && editTitle !== drawings.find(d => d.id === id)?.title) {
            await handleEditTitle(id, editTitle.trim());
        }
        setEditingId(null);
        setEditTitle('');
    };

    const handleCancel = () => {
        // Cancel any pending title save
        if (titleSaveTimeoutRef.current) {
            clearTimeout(titleSaveTimeoutRef.current);
            titleSaveTimeoutRef.current = null;
        }
        
        setEditingId(null);
        setEditTitle('');
    };

    const handleDeleteDrawing = useCallback(async (id) => {
        if (!confirm('Are you sure you want to delete this drawing? This action cannot be undone.')) {
            return;
        }

        try {
            await window.axios.delete(route('draw.destroy', { drawing: id }));
            
            setDrawings(prev => prev.filter(d => d.id !== id));
            
            // If we deleted the current drawing, go back to gallery
            if (activeDrawing?.id === id) {
                router.get('/draw');
            }
        } catch (error) {
            debugError('Failed to delete drawing:', error);
            Sentry.captureException(error, {
                tags: {
                    component: 'DrawIndex',
                    action: 'handleDeleteDrawing',
                },
                extra: {
                    drawingId: id,
                },
            });
        }
    }, [activeDrawing]);

    const handleDrawingClick = useCallback((id) => {
        router.get(`/draw/${id}`);
    }, []);

    const handleEditorMount = useCallback((editor) => {
        debugLog('[Draw] Editor mounted');
        
        editorRef.current = editor;
        
        // Store cleanup function on editor for later use
        editorRef.current._cleanup = () => {
            debugLog('[Draw] Editor cleanup called');
            suppressAutosaveRef.current = true;
            
            // Clear all timeouts and intervals
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            
            if (titleSaveTimeoutRef.current) {
                clearTimeout(titleSaveTimeoutRef.current);
                titleSaveTimeoutRef.current = null;
            }
            
            if (changeCheckIntervalRef.current) {
                clearInterval(changeCheckIntervalRef.current);
                changeCheckIntervalRef.current = null;
            }
        };
        
        setEditorReady(true);
        
        // Check if there's a pending load and execute it
        if (pendingLoadRef.current) {
            debugLog('[Draw] Loading pending drawing after mount');
            const { drawing } = pendingLoadRef.current;
            pendingLoadRef.current = null;
            loadDrawingIntoEditor(drawing, editor);
        }
    }, [loadDrawingIntoEditor]);

    // Load drawing when component mounts (for single drawing view)
    useEffect(() => {
        if (!isGallery && activeDrawing && !editorReady) {
            debugLog('[Draw] Single drawing view: loading drawing into editor');
            loadDrawingIntoEditor(activeDrawing);
        }
    }, [isGallery, activeDrawing, editorReady, loadDrawingIntoEditor]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (titleSaveTimeoutRef.current) {
                clearTimeout(titleSaveTimeoutRef.current);
            }
            if (drawingTitleSaveTimeoutRef.current) {
                clearTimeout(drawingTitleSaveTimeoutRef.current);
            }
        };
    }, []);

    // When navigating back to gallery, ensure editor listeners/intervals are cleaned up
    useEffect(() => {
        if (isGallery) {
            suppressAutosaveRef.current = true;
            const cleanup = editorRef.current?._cleanup;
            if (typeof cleanup === 'function') {
                try {
                    cleanup();
                } catch (e) {
                    debugWarn('[Draw] Editor cleanup error:', e);
                }
            }
            editorRef.current = null;
            setEditorReady(false);
        }

        return () => {
            suppressAutosaveRef.current = true;
            const cleanup = editorRef.current?._cleanup;
            if (typeof cleanup === 'function') {
                try {
                    cleanup();
                } catch (_e) {}
            }
        };
    }, [isGallery]);

    // Comprehensive cleanup on unmount and when switching to gallery
    useEffect(() => {
        return () => {
            // Clear all timeouts
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            if (titleSaveTimeoutRef.current) {
                clearTimeout(titleSaveTimeoutRef.current);
                titleSaveTimeoutRef.current = null;
            }
            if (drawingTitleSaveTimeoutRef.current) {
                clearTimeout(drawingTitleSaveTimeoutRef.current);
                drawingTitleSaveTimeoutRef.current = null;
            }

            // Cleanup editor
            const cleanup = editorRef.current?._cleanup;
            if (typeof cleanup === 'function') {
                try {
                    cleanup();
                } catch (_e) {}
            }
            editorRef.current = null;

            // Clear refs
            blankSnapshotRef.current = null;
            pendingSnapshotRef.current = null;
            pendingLoadRef.current = null;
            drawingCacheRef.current?.clear();
            suppressAutosaveRef.current = true;

            debugLog('[Draw] 🧹 Comprehensive cleanup completed');
        };
    }, [isGallery]);

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
                d.id === e.id ? { ...d, title: e.title, updated_at: e.updated_at, thumbnail: e.thumbnail } : d
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

    // Gallery view
    if (isGallery) {
        return (
            <AppLayout title="Drawings">
                <Head title="Drawings" />
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                            Drawings
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Create and manage your drawings. Click on any drawing to open it in the editor.
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-1">
                        <Card className="flex flex-col overflow-hidden">
                            <CardHeader className="space-y-4 border-b border-gray-100 pt-4 pb-4 dark:border-slate-800">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                            Your Drawings
                                        </CardTitle>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {drawings.length} {drawings.length === 1 ? 'drawing' : 'drawings'}
                                        </p>
                                    </div>
                                    <Button onClick={() => router.get('/draw/create')} disabled={creating}>
                                        {creating ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Plus className="mr-2 h-4 w-4" />
                                        )}
                                        New Drawing
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden p-6">
                                {drawings.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                                        <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4">
                                            <Plus className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                                                No drawings yet
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Create your first drawing to get started.
                                            </p>
                                        </div>
                                        <Button onClick={() => router.get('/draw/create')} disabled={creating}>
                                            {creating ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Plus className="mr-2 h-4 w-4" />
                                            )}
                                            Create drawing
                                        </Button>
                                    </div>
                                ) : (
                                    <DrawingGallery
                                        drawings={drawings}
                                        onDrawingClick={handleDrawingClick}
                                        onDeleteDrawing={handleDeleteDrawing}
                                        onEditTitle={handleEditTitle}
                                        creating={creating}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AppLayout>
        );
    }

    // Single drawing view
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
                                    {/* Back to Gallery */}
                                    <Button
                                        variant="outline"
                                        onClick={() => router.get('/draw')}
                                        className="lg:w-auto"
                                    >
                                        ← Back to Gallery
                                    </Button>
                                    
                                    {/* Debug Test Button */}
                                    {process.env.NODE_ENV === 'development' && (
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                const editor = editorRef.current;
                                                if (editor && activeDrawing?.id) {
                                                    debugLog('[Draw] 🔧 Manual test: Triggering save');
                                                    const snapshot = editor.getSnapshot();
                                                    console.log('🔧 Manual test - Current snapshot:', snapshot);
                                                    queueSave(snapshot);
                                                } else {
                                                    console.log('❌ Manual test failed - no editor or drawing');
                                                }
                                            }}
                                            className="lg:w-auto text-xs"
                                        >
                                            🔧 Test Save
                                        </Button>
                                    )}
                                    
                                    {/* Title Input */}
                                    {activeDrawing ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <label
                                                    htmlFor="drawing-title"
                                                    className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                                                >
                                                    Title
                                                </label>
                                                {titleSaveStatus.saving && (
                                                    <div className="flex items-center gap-1 text-xs text-blue-500">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        Saving...
                                                    </div>
                                                )}
                                                {!titleSaveStatus.saving && titleSaveStatus.lastSaved && (
                                                    <div className="flex items-center gap-1 text-xs text-green-500">
                                                        <Check className="h-3 w-3" />
                                                        Saved
                                                    </div>
                                                )}
                                            </div>
                                            <Input
                                                id="drawing-title"
                                                value={titleDraft}
                                                onChange={(event) => {
                                    setTitleDraft(event.target.value);
                                    autoSaveDrawingTitle(event.target.value);
                                }}
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
                                    <div className="h-full w-full opacity-100">
                                        <TldrawComponent
                                            onMount={handleEditorMount}
                                            onChange={() => queueSave()}
                                            hideUi={false}
                                            licenseKey={TL_DRAW_LICENSE_KEY || undefined}
                                        />
                                    </div>
                                </Suspense>

                                {loadingDrawing ? (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                    </div>
                                ) : null}

                                {/* Bottom toolbar with Gallery button */}
                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                                    <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-zinc-700">
                                        {saveStatus.lastSavedAt && (
                                            <span className="text-xs text-green-600 dark:text-green-400">
                                                Last saved: {new Date(saveStatus.lastSavedAt).toLocaleTimeString()}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => router.get('/draw')}
                                            className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                                        >
                                            Gallery
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
