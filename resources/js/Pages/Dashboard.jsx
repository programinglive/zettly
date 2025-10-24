import React, { useMemo, lazy, Suspense, useState, useCallback, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { Filter } from 'lucide-react';

import DashboardLayout from '../Layouts/DashboardLayout';
import TodosPanel from '../Components/NotesPanel';
import EisenhowerMatrix from '../Components/EisenhowerMatrix';
import ContextPanel from '../Components/ContextPanel';

const KanbanBoard = lazy(() => import('../Components/KanbanBoard'));

const WORKSPACE_OPTIONS = [
    {
        id: 'matrix',
        label: 'Eisenhower Matrix',
        blurb: 'Prioritize by urgency & importance',
    },
    {
        id: 'kanban',
        label: 'Kanban Board',
        blurb: 'Organize by priority lanes',
    },
];

const WORKSPACE_STORAGE_KEY = 'dashboard-workspace-view';

export default function Dashboard({
    todos = [],
    stats = { total: 0, completed: 0, pending: 0, urgent: 0, high: 0, archived: 0 },
    filters = { tags: [] },
    availableTags = [],
    notes = [],
}) {
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [workspaceView, setWorkspaceView] = useState(() => {
        if (typeof window === 'undefined') {
            return 'matrix';
        }

        return window.localStorage.getItem(WORKSPACE_STORAGE_KEY) || 'matrix';
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceView);
        }
    }, [workspaceView]);

    const selectedTagIds = useMemo(
        () => (filters?.tags ?? []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)),
        [filters]
    );

    const filterDescription = useMemo(() => {
        if (!selectedTagIds.length) {
            return 'All tags';
        }

        if (!availableTags.length) {
            return `${selectedTagIds.length} tag${selectedTagIds.length === 1 ? '' : 's'}`;
        }

        const names = availableTags
            .filter((tag) => selectedTagIds.includes(tag.id))
            .map((tag) => tag.name);

        return names.length ? names.join(', ') : `${selectedTagIds.length} tag${selectedTagIds.length === 1 ? '' : 's'}`;
    }, [selectedTagIds, availableTags]);

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
        router.reload({ only: ['todos', 'stats'] });
    }, []);

    const handleTagFilterToggle = (tagId) => {
        let nextTags;

        if (tagId === null) {
            nextTags = [];
        } else if (selectedTagIds.includes(tagId)) {
            nextTags = selectedTagIds.filter((id) => id !== tagId);
        } else {
            nextTags = [...selectedTagIds, tagId];
        }

        nextTags = nextTags.map((id) => Number(id)).filter((id) => !Number.isNaN(id));

        router.get(
            '/dashboard',
            { tags: nextTags },
            {
                preserveScroll: true,
                preserveState: true,
            }
        );
    };

    const renderMatrixWorkspace = () => (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1.1fr)_minmax(260px,320px)] lg:items-start">
            <div className="lg:h-[720px]">
                <TodosPanel todos={tasks} allTags={availableTags} />
            </div>
            <div className="lg:h-[720px]">
                <div className="h-full overflow-visible lg:overflow-hidden">
                    <div className="h-full overflow-y-auto pr-1">
                        <EisenhowerMatrix
                            todos={tasks}
                            onTaskSelect={handleTaskSelect}
                            selectedTaskId={selectedTaskId}
                            onTaskUpdate={handleTaskUpdate}
                        />
                    </div>
                </div>
            </div>
            <div className="lg:h-[720px]">
                <ContextPanel selectedTask={selectedTask} linkedTodos={aggregateLinkedTodos} />
            </div>
        </div>
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
                <KanbanBoard todos={tasks} />
            </div>
        </Suspense>
    );

    return (
        <DashboardLayout title="Dashboard">
            <Head title="Dashboard" />
            <div className="space-y-8 pb-24">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400">Stay on top of your latest activity.</p>
                </div>

                <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
                    {/* Filters Bar */}
                    <div className="bg-white/90 dark:bg-slate-950/70 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                <Filter className="w-4 h-4" />
                                <span className="text-sm font-medium">Tag Filters</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{filterDescription}</span>
                            </div>
                            {selectedTagIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleTagFilterToggle(null)}
                                    className="text-xs text-indigo-600 dark:text-indigo-300 hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            {availableTags.length === 0 ? (
                                <span className="text-xs text-gray-500 dark:text-gray-400">No tags yet</span>
                            ) : (
                                availableTags.map((tag) => {
                                    const isActive = selectedTagIds.includes(tag.id);
                                    const baseColor = tag.color || '#3B82F6';

                                    return (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => handleTagFilterToggle(tag.id)}
                                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                                isActive
                                                    ? 'ring-gray-400 dark:ring-offset-gray-900'
                                                    : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                                            }`}
                                            style={{
                                                backgroundColor: baseColor + '20',
                                                color: baseColor,
                                                border: `1px solid ${baseColor}40`,
                                            }}
                                        >
                                            <span
                                                className="inline-block h-2 w-2 rounded-full"
                                                style={{ backgroundColor: baseColor }}
                                            />
                                            {tag.name}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="bg-white/90 dark:bg-slate-950/70 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm w-full xl:max-w-xs xl:flex-none">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-start">
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Workspace focus</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Switch between Eisenhower prioritization and the Kanban board.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {WORKSPACE_OPTIONS.map((option) => {
                                    const isActive = workspaceView === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setWorkspaceView(option.id)}
                                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                                isActive
                                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm focus-visible:ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-500'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <div className="flex flex-col text-left">
                                                <span>{option.label}</span>
                                                <span className={`text-xs font-normal ${isActive ? 'text-indigo-100 dark:text-indigo-100/90' : 'text-gray-400 dark:text-gray-500'}`}>
                                                    {option.blurb}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {workspaceView === 'matrix' ? renderMatrixWorkspace() : renderKanbanWorkspace()}

                <div className="sticky bottom-6 left-0 right-0 z-20">
                    <div className="backdrop-blur-lg bg-white/90 dark:bg-slate-950/80 p-4 rounded-3xl shadow-lg border border-white/60 dark:border-slate-800/60">
                        <div className="flex flex-wrap items-stretch gap-3 md:flex-nowrap">
                            {[
                                {
                                    label: 'Important & Urgent',
                                    value: stats.important_urgent || 0,
                                    icon: '🚨',
                                    accent: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-200',
                                },
                                {
                                    label: 'Important & Not Urgent',
                                    value: stats.important_not_urgent || 0,
                                    icon: '📅',
                                    accent: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200',
                                },
                                {
                                    label: 'Not Important & Urgent',
                                    value: stats.not_important_urgent || 0,
                                    icon: '🛎️',
                                    accent: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-200',
                                },
                                {
                                    label: 'Not Important & Not Urgent',
                                    value: stats.not_important_not_urgent || 0,
                                    icon: '🌿',
                                    accent: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200',
                                },
                                {
                                    label: 'Completed',
                                    value: stats.completed || 0,
                                    icon: '✅',
                                    accent: 'bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-200',
                                },
                                {
                                    label: 'Archived',
                                    value: stats.archived || 0,
                                    icon: '🗃️',
                                    accent: 'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300',
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="flex-1 min-w-[140px] basis-0 rounded-2xl border border-gray-200/80 bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700/60 dark:bg-gray-900/85"
                                >
                                    <div className="flex items-center gap-3 p-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-medium ${item.accent}`}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{item.label}</p>
                                            <p className="text-xl font-semibold text-gray-900 dark:text-white">{item.value}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
