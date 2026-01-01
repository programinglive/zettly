import React, { useMemo, useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, ListTodo, FileText, PanelRightOpen, PanelRightClose, PenTool } from 'lucide-react';

import DashboardLayout from '../../Layouts/DashboardLayout';
import ContextPanel from '../../Components/ContextPanel';
import ReorderDebug from '../../Components/ReorderDebug';
import EisenhowerMatrix from '../../Components/EisenhowerMatrix';
import useWorkspacePreference from '../../hooks/useWorkspacePreference';
import { Drawer, DrawerContent, DrawerClose, DrawerBody, DrawerTitle, DrawerDescription } from '../../Components/ui/drawer';

const KanbanBoard = lazy(() => import('../../Components/KanbanBoard'));

export default function Board({
    todos = [],
    filters = { tags: [] },
    availableTags = [],
    preferences = {},
}) {
    const { props: pageProps } = usePage();
    const authUser = pageProps?.auth?.user;
    const isSuperAdmin = authUser?.role === 'super_admin';
    const DEBUG_STORAGE_KEY = 'zettly-debug-mode';
    const [hasDebugFlag, setHasDebugFlag] = useState(() => {
        if (typeof window === 'undefined' || !isSuperAdmin) {
            return false;
        }
        return window.localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            setHasDebugFlag(false);
            return undefined;
        }

        const debugEnabled = window.localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';

        if (!isSuperAdmin && !debugEnabled) {
            window.localStorage.setItem(DEBUG_STORAGE_KEY, 'false');
            setHasDebugFlag(false);
            return undefined;
        }

        const handleDebugChange = (event) => {
            const enabled = Boolean(event.detail?.enabled);
            setHasDebugFlag(enabled);
        };

        setHasDebugFlag(debugEnabled);
        window.addEventListener('zettly:debug-mode-changed', handleDebugChange);

        return () => {
            window.removeEventListener('zettly:debug-mode-changed', handleDebugChange);
        };
    }, [isSuperAdmin]);

    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [workspaceView] = useWorkspacePreference(preferences?.workspace_view);
    const [fabOpen, setFabOpen] = useState(false);
    const [contextOpen, setContextOpen] = useState(true);

    const tasks = useMemo(
        () => todos.filter((todo) => todo.type === 'todo' && !todo.archived),
        [todos]
    );

    const selectedTask = useMemo(
        () => tasks.find((task) => task.id === selectedTaskId) ?? null,
        [tasks, selectedTaskId]
    );

    const aggregateLinkedTodos = useMemo(() => {
        if (!selectedTask) {
            return [];
        }

        const related = Array.isArray(selectedTask.relatedTodos)
            ? selectedTask.relatedTodos
            : selectedTask.related_todos || [];

        const linkedBy = Array.isArray(selectedTask.linkedByTodos)
            ? selectedTask.linkedByTodos
            : selectedTask.linked_by_todos || [];

        const combined = [...related, ...linkedBy];
        const seen = new Set();

        return combined.filter((todo) => {
            if (!todo?.id || todo.id === selectedTask.id) {
                return false;
            }
            if (seen.has(todo.id)) {
                return false;
            }
            seen.add(todo.id);
            return true;
        });
    }, [selectedTask]);

    const handleTaskSelect = useCallback((todo) => {
        setSelectedTaskId(todo?.id ?? null);
        if (todo) {
            setContextOpen(true);
        }
    }, []);

    const handleTaskUpdate = useCallback(() => {
        router.reload({ only: ['todos'] });
    }, []);

    const handleFabToggle = () => setFabOpen((prev) => !prev);
    const handleFabClose = () => setFabOpen(false);

    useEffect(() => {
        if (!selectedTask) {
            setContextOpen(false);
        }
    }, [selectedTask]);

    const renderMatrixWorkspace = () => (
        <EisenhowerMatrix
            todos={tasks}
            onTaskSelect={handleTaskSelect}
            selectedTaskId={selectedTaskId}
            onTaskUpdate={handleTaskUpdate}
        />
    );

    const renderKanbanWorkspace = () => (
        <Suspense
            fallback={
                <div className="bg-white/90 dark:bg-slate-950/70 border border-gray-200 dark:border-slate-800 rounded-lg p-12 text-center text-gray-500 dark:text-gray-400">
                    Loading board...
                </div>
            }
        >
            <div className="space-y-6">
                <KanbanBoard todos={tasks} onSelect={handleTaskSelect} />
            </div>
        </Suspense>
    );

    return (
        <DashboardLayout title="Todo Board">
            <Drawer
                open={Boolean(selectedTask) && contextOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setContextOpen(false);
                    } else if (selectedTask) {
                        setContextOpen(true);
                    }
                }}
            >
                <Head title="Todo Board" />
                <div className="grid min-h-screen grid-rows-[auto_1fr] pb-48 lg:pb-0">
                    {/* Header */}
                    <div className="mb-8 flex items-end justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Todo Board</h1>
                            <p className="text-gray-600 dark:text-gray-400">Manage priorities and capture new tasks in one place.</p>
                        </div>

                        {/* Show details Toggle */}
                        <div className="flex justify-end gap-3 mb-1">
                            <button
                                type="button"
                                onClick={() => setContextOpen((prev) => !prev)}
                                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
                                disabled={!selectedTask}
                            >
                                {contextOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                                {contextOpen ? 'Hide details' : 'Show details'}
                            </button>
                        </div>
                    </div>

                    {/* Main Layout */}
                    <div className="flex flex-col gap-4">
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                            {workspaceView === 'matrix' ? renderMatrixWorkspace() : renderKanbanWorkspace()}
                        </div>
                    </div>
                </div>

                <DrawerContent
                    side="right"
                    className="w-full max-w-full border-none bg-transparent p-0 sm:max-w-lg"
                >
                    <DrawerTitle className="sr-only">Task context details</DrawerTitle>
                    <div className="flex items-center justify-end border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <DrawerClose asChild>
                            <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:text-gray-800 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-300"
                            >
                                <PanelRightClose className="h-4 w-4" />
                                <span className="sr-only">Close context drawer</span>
                            </button>
                        </DrawerClose>
                    </div>
                    <DrawerBody className="flex-1 overflow-y-auto bg-white px-6 py-6 dark:bg-slate-900">
                        <DrawerDescription className="sr-only">Additional task context including status history, attachments, and related links.</DrawerDescription>
                        {selectedTask && (
                            <ContextPanel
                                selectedTask={selectedTask}
                                linkedTodos={aggregateLinkedTodos}
                                className="min-h-full"
                                onTaskUpdate={handleTaskUpdate}
                            />
                        )}
                    </DrawerBody>
                </DrawerContent>
            </Drawer>

            {hasDebugFlag && <ReorderDebug />}

            <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
                <div
                    className={`flex flex-col gap-2 transition-all duration-150 ${fabOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none translate-y-2 opacity-0'
                        }`}
                >
                    <Link
                        href="/todos/create"
                        onClick={handleFabClose}
                        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gray-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-gray-700/30 transition hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                        <ListTodo className="h-4 w-4" />
                        New Todo
                    </Link>
                    <Link
                        href="/todos/create?type=note"
                        onClick={handleFabClose}
                        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-gray-600/30 transition hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500"
                    >
                        <FileText className="h-4 w-4" />
                        New Note
                    </Link>
                    <Link
                        href="/draw"
                        onClick={handleFabClose}
                        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gray-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-gray-500/30 transition hover:bg-gray-400 dark:bg-gray-500 dark:hover:bg-gray-400"
                    >
                        <PenTool className="h-4 w-4" />
                        Open Draw
                    </Link>
                </div>
                <button
                    type="button"
                    onClick={handleFabToggle}
                    aria-expanded={fabOpen}
                    aria-label={fabOpen ? 'Hide quick create actions' : 'Show quick create actions'}
                    className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-700 text-white shadow-xl shadow-gray-700/30 transition hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus-visible:ring-offset-gray-900"
                >
                    <Plus className={`h-6 w-6 transition-transform ${fabOpen ? 'rotate-45' : ''}`} />
                    <span className="sr-only">Toggle quick create menu</span>
                </button>
            </div>
        </DashboardLayout>
    );
}
