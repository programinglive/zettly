import React, { useMemo, lazy, Suspense, useState, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Filter, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import DashboardLayout from '../Layouts/DashboardLayout';
import TodosPanel from '../Components/NotesPanel';
import EisenhowerMatrix from '../Components/EisenhowerMatrix';
import ContextPanel from '../Components/ContextPanel';
import useWorkspacePreference from '../hooks/useWorkspacePreference';

const KanbanBoard = lazy(() => import('../Components/KanbanBoard'));

const startOfDay = (date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const normalizeDueDate = (value) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return startOfDay(value);
    }

    if (typeof value === 'string') {
        const normalized = value.length <= 10 ? `${value}T00:00:00` : value;
        const parsed = new Date(normalized);

        if (!Number.isNaN(parsed.getTime())) {
            return startOfDay(parsed);
        }
    }

    return null;
};

const buildCalendarMatrix = (referenceDate) => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const startWeekDay = firstOfMonth.getDay();

    const matrix = [];
    let current = new Date(year, month, 1 - startWeekDay);

    for (let week = 0; week < 6; week += 1) {
        const weekDays = [];
        for (let day = 0; day < 7; day += 1) {
            weekDays.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        matrix.push(weekDays);
    }

    return matrix;
};

const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const normalizeHexColor = (input) => {
    if (typeof input !== 'string') {
        return null;
    }

    let hex = input.trim();

    if (!hex) {
        return null;
    }

    if (hex.startsWith('#')) {
        hex = hex.slice(1);
    }

    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((char) => char.repeat(2))
            .join('');
    }

    if (hex.length > 6) {
        hex = hex.slice(0, 6);
    }

    if (!/^([0-9a-fA-F]{6})$/.test(hex)) {
        return null;
    }

    return `#${hex.toUpperCase()}`;
};

const withAlpha = (hex, alphaHex) => {
    if (!hex) {
        return null;
    }

    return `${hex}${alphaHex}`;
};

const resolveDayHighlightAppearance = (tagColors, hasOverdue) => {
    if (hasOverdue) {
        return {
            className: 'text-white shadow-md',
            style: {
                backgroundColor: '#F87171',
                border: '1px solid rgba(248, 113, 113, 0.85)',
                boxShadow: '0 8px 16px -8px rgba(248, 113, 113, 0.6)',
            },
        };
    }

    const base = tagColors[0];

    if (!base) {
        return {
            className: 'text-white shadow-md',
            style: {
                backgroundColor: '#6366F1',
                border: '1px solid rgba(99, 102, 241, 0.85)',
                boxShadow: '0 8px 16px -8px rgba(99, 102, 241, 0.6)',
            },
        };
    }

    return {
        className: 'text-white shadow-md',
        style: {
            backgroundColor: withAlpha(base, 'F0'),
            border: `1px solid ${withAlpha(base, 'B3')}`,
            boxShadow: `0 8px 16px -8px ${withAlpha(base, 'AA')}`,
        },
    };
};

const DueDateCalendar = ({ tasks }) => {
    const [activeMonth, setActiveMonth] = useState(() => startOfDay(new Date()));

    const tasksByDate = useMemo(() => {
        const map = new Map();

        tasks.forEach((todo) => {
            const date = normalizeDueDate(todo?.due_date);
            if (!date) {
                return;
            }

            const key = date.toISOString().slice(0, 10);
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(todo);
        });

        return map;
    }, [tasks]);

    const monthMatrix = useMemo(() => buildCalendarMatrix(activeMonth), [activeMonth]);
    const monthLabel = activeMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const today = startOfDay(new Date());

    const handleMonthShift = (delta) => {
        setActiveMonth((prev) => {
            const next = new Date(prev);
            next.setMonth(prev.getMonth() + delta, 1);

            return startOfDay(next);
        });
    };

    return (
        <div className="bg-white/80 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm w-full">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <CalendarDays className="w-4 h-4" />
                    <span className="text-sm font-medium">Due Date Calendar</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className="rounded-md p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-slate-800"
                        aria-label="Previous month"
                        onClick={() => handleMonthShift(-1)}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="rounded-md p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-slate-800"
                        aria-label="Next month"
                        onClick={() => handleMonthShift(1)}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="px-3 pb-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{monthLabel}</p>
                <div className="mt-2 grid grid-cols-7 gap-[2px] text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <span key={day} className="text-center">
                            {day}
                        </span>
                    ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-[2px]">
                    {monthMatrix.flat().map((date) => {
                        const key = date.toISOString().slice(0, 10);
                        const isCurrentMonth = date.getMonth() === activeMonth.getMonth();
                        const dueTasks = tasksByDate.get(key) || [];
                        const isToday = isSameDay(date, today);
                        const tagColors = Array.from(
                            new Set(
                                dueTasks.flatMap((todo) =>
                                    Array.isArray(todo?.tags)
                                        ? todo.tags
                                              .map((tag) => normalizeHexColor(tag?.color))
                                              .filter(Boolean)
                                        : []
                                )
                            )
                        );
                        const hasOverdue = dueTasks.some((todo) => normalizeDueDate(todo.due_date) < today);
                        const highlight = dueTasks.length > 0 ? resolveDayHighlightAppearance(tagColors, hasOverdue) : null;

                        return (
                            <div
                                key={key + isCurrentMonth}
                                className={`relative flex h-12 flex-col justify-start rounded-lg border border-transparent px-1.5 pt-2 pb-2 text-[11px] transition-colors ${
                                    isCurrentMonth
                                        ? 'text-gray-700 dark:text-gray-200'
                                        : 'text-gray-400 dark:text-gray-600'
                                } ${isToday ? 'ring-1 ring-indigo-400/60 dark:ring-indigo-400/60' : ''} ${highlight ? 'hover:border-transparent' : 'hover:border-indigo-500/40'}`}
                                style={{
                                    ...(highlight?.style ? { ...highlight.style, color: highlight.className.includes('text-white') ? '#fff' : undefined } : {}),
                                }}
                            >
                                <span className={`font-medium leading-none transition-colors ${highlight ? highlight.className : ''}`}>
                                    {date.getDate()}
                                </span>

                                {highlight && (
                                    <div className="absolute left-1/2 bottom-1 flex h-1 w-4 -translate-x-1/2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-950/80">
                                        {tagColors.length
                                            ? tagColors.slice(0, 4).map((color) => (
                                                  <span
                                                      key={`${key}-${color}`}
                                                      className="flex-1"
                                                      style={{ backgroundColor: color }}
                                                  />
                                              ))
                                            : (
                                                  <span className="flex-1 bg-white/0" />
                                              )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default function Dashboard({
    todos = [],
    filters = { tags: [] },
    availableTags = [],
    notes = [],
    preferences = {},
}) {
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [workspaceView] = useWorkspacePreference(preferences?.workspace_view);

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
        router.reload({ only: ['todos'] });
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
        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(260px,320px)_minmax(0,1.1fr)_minmax(260px,320px)] 2xl:items-start">
            <div className="2xl:h-[720px]">
                <TodosPanel todos={tasks} allTags={availableTags} />
            </div>
            <div className="2xl:h-[720px]">
                <div className="h-full overflow-visible 2xl:overflow-hidden">
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
            <div className="2xl:h-[720px]">
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
            <div className="min-h-screen flex flex-col pb-48 lg:pb-0">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400">Stay on top of your latest activity.</p>
                </div>

                {/* Main Layout */}
                <div className="flex flex-col 2xl:flex-row gap-6 flex-1 2xl:items-start">
                    {/* Main Content - prioritized on mobile */}
                    <main className="w-full 2xl:flex-1 2xl:min-w-0 order-1">
                        {workspaceView === 'matrix' ? renderMatrixWorkspace() : renderKanbanWorkspace()}
                    </main>

                    {/* Left Sidebar - hidden on small screens */}
                    <aside className="hidden 2xl:block w-full 2xl:w-80 2xl:flex-shrink-0 space-y-4 order-2">
                        {/* Tag Filters */}
                        <div className="bg-white/90 dark:bg-slate-950/70 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
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
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
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

                        {/* Due Date Calendar */}
                        <DueDateCalendar tasks={tasks} />
                    </aside>
                </div>
            </div>
        </DashboardLayout>
    );
}
