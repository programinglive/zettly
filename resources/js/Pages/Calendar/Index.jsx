import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    SlidersHorizontal,
    CheckCircle2,
    Circle,
    Flame,
    Sparkles,
    Plus,
    Check,
    X,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarIndex({ month, schedule: initialSchedule = {}, calendar }) {
    const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
    const [schedule, setSchedule] = useState(initialSchedule);
    const [editingRules, setEditingRules] = useState(false);
    const [draftSchedule, setDraftSchedule] = useState(initialSchedule);
    const [savingRules, setSavingRules] = useState(false);
    const [selectedDate, setSelectedDate] = useState(calendar?.active_date || '');
    const [schedulingTodoId, setSchedulingTodoId] = useState(null);

    const days = calendar?.days || [];
    const activeCell = days.find((d) => d.date === selectedDate) || calendar?.active_day || days[0] || null;

    // For week view, slice the 7-day week containing selectedDate
    const visibleDays = (() => {
        if (viewMode !== 'week' || !activeCell) return days;
        const idx = days.findIndex((d) => d.date === activeCell.date);
        if (idx === -1) return days.slice(0, 7);
        const weekStart = Math.floor(idx / 7) * 7;
        return days.slice(weekStart, weekStart + 7);
    })();

    const navigateMonth = (targetMonth) => {
        router.get('/calendar', { month: targetMonth }, { preserveState: true });
    };

    const handleSaveRules = async () => {
        setSavingRules(true);
        try {
            const payload = {};
            Object.entries(draftSchedule).forEach(([dayKey, item]) => {
                payload[dayKey] = {
                    theme: item.theme,
                    color: item.color,
                    description: item.description,
                    tags: Array.isArray(item.tags)
                        ? item.tags
                        : String(item.tags || '')
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                };
            });

            const response = await axios.put('/calendar/allocations', {
                allocations: payload,
            });

            setSchedule(response.data.schedule);
            setDraftSchedule(response.data.schedule);
            setEditingRules(false);
            router.reload({ only: ['schedule', 'calendar'] });
        } finally {
            setSavingRules(false);
        }
    };

    const handleScheduleTodo = async (todoId, targetDate) => {
        setSchedulingTodoId(todoId);
        try {
            await axios.patch(`/calendar/todos/${todoId}/schedule`, {
                due_date: targetDate,
            });
            router.reload({ only: ['calendar'] });
        } finally {
            setSchedulingTodoId(null);
        }
    };

    return (
        <AppLayout title="Calendar & Weekly Focus">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
                {/* Compact Notion-Style Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <CalendarIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                            {calendar?.month_label || month}
                        </h1>
                        {activeCell?.allocation && (
                            <span
                                className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium border"
                                style={{
                                    borderColor: `${activeCell.allocation.color}40`,
                                    backgroundColor: `${activeCell.allocation.color}15`,
                                    color: activeCell.allocation.color,
                                }}
                            >
                                <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: activeCell.allocation.color }}
                                />
                                {activeCell.allocation.label}: {activeCell.allocation.theme}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-800 p-0.5 bg-gray-50 dark:bg-slate-900 text-xs">
                            <button
                                type="button"
                                onClick={() => setViewMode('month')}
                                className={`px-2.5 py-1 rounded-md font-medium transition ${
                                    viewMode === 'month'
                                        ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-xs'
                                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                                }`}
                            >
                                Month
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('week')}
                                className={`px-2.5 py-1 rounded-md font-medium transition ${
                                    viewMode === 'week'
                                        ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-xs'
                                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                                }`}
                            >
                                Week
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigateMonth(calendar?.prev_month)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
                            title="Previous month"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => router.get('/calendar')}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => navigateMonth(calendar?.next_month)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
                            title="Next month"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setDraftSchedule(schedule);
                                setEditingRules((v) => !v);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Weekly Focus Allocation
                        </button>
                    </div>
                </div>

                {/* Compact Weekly Focus Strip (Mon-Sun overview) */}
                <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5">
                    {Object.values(schedule).map((rule) => (
                        <div
                            key={rule.day}
                            className="rounded-lg border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 px-2.5 py-1.5 flex flex-col justify-between"
                        >
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    {rule.label.slice(0, 3)}
                                </span>
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: rule.color }}
                                />
                            </div>
                            <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate mt-0.5" title={rule.theme}>
                                {rule.theme}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Collapsible Weekly Focus Allocation Editor */}
                {editingRules && (
                    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                                    Weekly Focus Allocation Rules (Mon–Sun)
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Assign a dedicated focus theme and tags for each day of the week (e.g., Mon–Fri: Beautyworld & Clinic, Sat: ProgramingLive, Sun: Development Tools). P0 tasks always override.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingRules(false)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveRules}
                                    disabled={savingRules}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-gray-900 dark:bg-indigo-600 text-white hover:opacity-90 disabled:opacity-50"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    {savingRules ? 'Saving…' : 'Save Schedule'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
                            {Object.entries(draftSchedule).map(([dayKey, rule]) => (
                                <div
                                    key={dayKey}
                                    className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 space-y-2 text-xs"
                                >
                                    <div className="flex items-center justify-between font-semibold text-gray-700 dark:text-gray-200">
                                        <span>{rule.label}</span>
                                        <input
                                            type="color"
                                            value={rule.color || '#2563EB'}
                                            onChange={(e) =>
                                                setDraftSchedule({
                                                    ...draftSchedule,
                                                    [dayKey]: { ...rule, color: e.target.value },
                                                })
                                            }
                                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase">Theme</label>
                                        <input
                                            type="text"
                                            value={rule.theme || ''}
                                            onChange={(e) =>
                                                setDraftSchedule({
                                                    ...draftSchedule,
                                                    [dayKey]: { ...rule, theme: e.target.value },
                                                })
                                            }
                                            className="w-full rounded border border-gray-200 dark:border-slate-800 bg-transparent px-2 py-1 text-xs text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase">Tags (comma-separated)</label>
                                        <input
                                            type="text"
                                            value={Array.isArray(rule.tags) ? rule.tags.join(', ') : rule.tags || ''}
                                            onChange={(e) =>
                                                setDraftSchedule({
                                                    ...draftSchedule,
                                                    [dayKey]: { ...rule, tags: e.target.value },
                                                })
                                            }
                                            className="w-full rounded border border-gray-200 dark:border-slate-800 bg-transparent px-2 py-1 text-xs text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Layout: 7-Column Compact Calendar Grid + Active Day Inspector */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-9">
                        <div className="rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/90">
                                {DAY_HEADERS.map((dayName) => (
                                    <div
                                        key={dayName}
                                        className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-r last:border-r-0 border-gray-200/60 dark:border-slate-800"
                                    >
                                        {dayName}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 divide-x divide-y divide-gray-200/70 dark:divide-slate-800">
                                {visibleDays.map((day) => {
                                    const isSelected = day.date === activeCell?.date;
                                    return (
                                        <div
                                            key={day.date}
                                            onClick={() => setSelectedDate(day.date)}
                                            className={`min-h-[112px] p-1.5 transition cursor-pointer flex flex-col justify-between ${
                                                !day.is_current_month
                                                    ? 'bg-gray-50/50 dark:bg-slate-950/40 text-gray-400'
                                                    : 'bg-white dark:bg-slate-900'
                                            } ${
                                                isSelected
                                                    ? 'ring-2 ring-inset ring-indigo-500/70 bg-indigo-50/20 dark:bg-indigo-950/20'
                                                    : 'hover:bg-gray-50/80 dark:hover:bg-slate-800/40'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <span
                                                        className={`inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full ${
                                                            day.is_today
                                                                ? 'bg-indigo-600 text-white font-semibold'
                                                                : 'text-gray-700 dark:text-gray-300'
                                                        }`}
                                                    >
                                                        {day.day_number}
                                                    </span>
                                                    <span
                                                        className="text-[10px] font-medium truncate px-1.5 py-0.2 rounded"
                                                        style={{
                                                            backgroundColor: `${day.allocation?.color || '#64748b'}15`,
                                                            color: day.allocation?.color || '#64748b',
                                                        }}
                                                        title={day.allocation?.theme}
                                                    >
                                                        {day.allocation?.theme}
                                                    </span>
                                                </div>

                                                <div className="space-y-1">
                                                    {(day.todos || []).slice(0, 4).map((todo) => (
                                                        <div
                                                            key={todo.id}
                                                            className={`group flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] border truncate ${
                                                                todo.is_p0
                                                                    ? 'border-red-300 bg-red-50/80 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
                                                                    : todo.is_completed
                                                                    ? 'border-transparent text-gray-400 line-through'
                                                                    : 'border-gray-200/80 dark:border-slate-700/80 bg-gray-50/70 dark:bg-slate-800/60 text-gray-800 dark:text-gray-200'
                                                            }`}
                                                            title={todo.title}
                                                        >
                                                            {todo.is_p0 ? (
                                                                <Flame className="w-3 h-3 text-red-500 shrink-0" />
                                                            ) : todo.is_completed ? (
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                                            ) : (
                                                                <Circle className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                                                            )}
                                                            <span className="truncate">{todo.title}</span>
                                                        </div>
                                                    ))}
                                                    {(day.todos || []).length > 4 && (
                                                        <div className="text-[10px] text-gray-400 pl-1">
                                                            +{day.todos.length - 4} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Side Inspector: Active Day Plan & Theme-Matched Recommendations */}
                    <div className="lg:col-span-3 space-y-3">
                        {activeCell && (
                            <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-3">
                                <div className="border-b border-gray-100 dark:border-slate-800 pb-2.5">
                                    <div className="text-xs text-gray-400">{activeCell.date}</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mt-0.5">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: activeCell.allocation?.color }}
                                        />
                                        <span>{activeCell.allocation?.theme}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {activeCell.allocation?.description}
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                                        <span>Scheduled ({activeCell.todos?.length || 0})</span>
                                        <Link
                                            href={`/todos/create?due_date=${activeCell.date}`}
                                            className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            <Plus className="w-3 h-3" /> New
                                        </Link>
                                    </div>

                                    {(activeCell.todos || []).length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No tasks scheduled for this date.</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {activeCell.todos.map((todo) => (
                                                <div
                                                    key={todo.id}
                                                    className="flex items-start justify-between gap-2 rounded-lg border border-gray-200/80 dark:border-slate-800 p-2 text-xs"
                                                >
                                                    <Link
                                                        href={`/todos/${todo.id}/edit`}
                                                        className="font-medium text-gray-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                    >
                                                        {todo.title}
                                                    </Link>
                                                    {todo.matches_theme && (
                                                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                            Aligned
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Theme-Matched Unscheduled Backlog */}
                                <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-slate-800">
                                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Recommended for {activeCell.allocation?.theme}</span>
                                    </div>

                                    {(activeCell.recommended_todos || []).length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">
                                            No unscheduled backlog items matching this day&apos;s theme tags.
                                        </p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {activeCell.recommended_todos.map((todo) => (
                                                <div
                                                    key={todo.id}
                                                    className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-gray-200 dark:border-slate-800 p-2 text-xs"
                                                >
                                                    <span className="truncate text-gray-700 dark:text-gray-300" title={todo.title}>
                                                        {todo.title}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={schedulingTodoId === todo.id}
                                                        onClick={() => handleScheduleTodo(todo.id, activeCell.date)}
                                                        className="shrink-0 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-[11px] font-medium"
                                                    >
                                                        {schedulingTodoId === todo.id ? '…' : 'Schedule'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
