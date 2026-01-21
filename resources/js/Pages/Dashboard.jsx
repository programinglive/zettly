import React, { lazy, useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { Plus, ListTodo, FileText, PenTool, MailWarning, Loader2, PanelRightClose } from 'lucide-react';

import DashboardLayout from '../Layouts/DashboardLayout';
import FocusGreeting from '../Components/FocusGreeting';
import ReorderDebug from '../Components/ReorderDebug';
import EisenhowerMatrix from '../Components/EisenhowerMatrix';
import ContextPanel from '../Components/ContextPanel';
import useWorkspacePreference from '../hooks/useWorkspacePreference';
import { Drawer, DrawerContent, DrawerClose, DrawerBody, DrawerTitle, DrawerDescription } from '../Components/ui/drawer';

const KanbanBoard = lazy(() => import('../Components/KanbanBoard'));

export default function Dashboard({
    todos = [],
    filters = { tags: [] },
    availableTags = [],
    notes = [],
    preferences = {},
}) {
    const { props: pageProps } = usePage();
    const authUser = pageProps?.auth?.user;
    const mustVerifyEmail = Boolean(authUser) && authUser.email_verified_at === null;
    const { post: resendVerification, processing: isSendingVerification } = useForm();
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

        // Allow debug mode for super admins or if explicitly enabled via localStorage
        const debugEnabled = window.localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';

        if (!isSuperAdmin && !debugEnabled) {
            window.localStorage.setItem(DEBUG_STORAGE_KEY, 'false');
            setHasDebugFlag(false);
            return undefined;
        }

        const handleDebugChange = (event) => {
            const enabled = Boolean(event.detail?.enabled);
            setHasDebugFlag(enabled);
            console.log('🔍 Debug mode changed:', enabled);
        };

        setHasDebugFlag(debugEnabled);
        console.log('🔍 Debug mode initialized:', debugEnabled, 'Super Admin:', isSuperAdmin);

        window.addEventListener('zettly:debug-mode-changed', handleDebugChange);

        return () => {
            window.removeEventListener('zettly:debug-mode-changed', handleDebugChange);
        };
    }, [isSuperAdmin]);

    const [fabOpen, setFabOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [workspaceView] = useWorkspacePreference(preferences?.workspace_view);

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
    }, []);

    const handleTaskUpdate = useCallback(() => {
        router.reload({ only: ['todos'] });
    }, []);

    const handleFabToggle = () => setFabOpen((prev) => !prev);
    const handleFabClose = () => setFabOpen(false);

    return (
        <DashboardLayout title="Dashboard">
            <Drawer
                open={Boolean(selectedTask)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedTaskId(null);
                    }
                }}
            >
                <Head title="Dashboard" />
                <div className="min-h-screen pb-48 lg:pb-0">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        {/* Header */}
                        <div className="mb-16">
                            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                                Dashboard
                            </h1>
                            <p className="mt-4 text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
                                Stay focused and track your progress through the day.
                            </p>
                        </div>

                        {/* Focus Greeting */}
                        <div className="mb-12 space-y-4">
                            {mustVerifyEmail && (
                                <div className="py-4 border-b border-amber-200/50 dark:border-amber-500/20 mb-8">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <MailWarning className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                                            <div>
                                                <h2 className="text-sm font-bold tracking-tight text-amber-900 dark:text-amber-100">
                                                    Email Verification Required
                                                </h2>
                                                <p className="text-sm text-amber-800/80 dark:text-amber-200/60">
                                                    Check your inbox to unlock all features.
                                                </p>
                                            </div>
                                        </div>

                                        <form
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                resendVerification(route('verification.send'));
                                            }}
                                        >
                                            <button
                                                type="submit"
                                                className="text-sm font-bold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 transition-colors underline decoration-2 underline-offset-4"
                                                disabled={isSendingVerification}
                                            >
                                                {isSendingVerification ? 'Sending...' : 'Resend link'}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}

                            <FocusGreeting />
                        </div>

                        {/* Task Board */}
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {workspaceView === 'matrix' ? (
                                <EisenhowerMatrix
                                    todos={tasks}
                                    onTaskSelect={handleTaskSelect}
                                    selectedTaskId={selectedTaskId}
                                    onTaskUpdate={handleTaskUpdate}
                                    hideHeader={false}
                                />
                            ) : (
                                <Suspense fallback={
                                    <div className="flex items-center justify-center p-24">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
                                    </div>
                                }>
                                    <KanbanBoard
                                        todos={tasks}
                                        onSelect={handleTaskSelect}
                                        hideHeader={false}
                                    />
                                </Suspense>
                            )}
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
