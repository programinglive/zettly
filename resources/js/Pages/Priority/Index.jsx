import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock,
    Flame,
    HelpCircle,
    Lock,
    Star,
    X,
} from 'lucide-react';
import DashboardLayout from '../../Layouts/DashboardLayout';

const WARNING_LABELS = {
    deadline_at_risk: 'Deadline at Risk',
    deadline_uncommitted: 'Upcoming Deadline',
    capacity_exceeded: 'Capacity Exceeded',
    main_work_overdue: 'Main Work Overdue',
};

function formatWarningItem(warning) {
    if (!warning || typeof warning !== 'object') {
        return null;
    }
    const code = warning.code || warning.type || '';
    const label = WARNING_LABELS[code] || (code ? code.replace(/_/g, ' ') : 'Notice');

    if (warning.message) {
        return { label, text: warning.message, todoId: warning.todo_id || null };
    }

    if (code === 'deadline_at_risk') {
        const dueNote = warning.due_date ? ` (due ${warning.due_date})` : '';
        return {
            label,
            text: `"${warning.title || `Task #${warning.todo_id}`}"${dueNote} is due soon but currently ranked below your Main Work.`,
            todoId: warning.todo_id || null,
        };
    }

    if (code === 'deadline_uncommitted') {
        const dueNote = warning.due_date ? ` (due ${warning.due_date})` : '';
        return {
            label,
            text: `"${warning.title || `Task #${warning.todo_id}`}"${dueNote} is due soon while Today's WIP limit is full.`,
            todoId: warning.todo_id || null,
        };
    }

    if (code === 'capacity_exceeded') {
        return {
            label,
            text: `Today's planned work (${warning.minutes_planned} min) exceeds your daily capacity (${warning.minutes_capacity} min).`,
            todoId: null,
        };
    }

    if (code === 'main_work_overdue') {
        return {
            label,
            text: `Main Work "${warning.title || `Task #${warning.todo_id}`}" is overdue (${warning.due_date}).`,
            todoId: warning.todo_id || null,
        };
    }

    return null;
}

function formatDecidedBy(value) {
    if (!value || typeof value !== 'string') return '';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function TaskCard({
    task,
    isProposed,
    isCommitted,
    busy,
    onCommit,
    onUncommit,
    onExplain,
}) {
    const blockedBy = Array.isArray(task.blocked_by) ? task.blocked_by : [];
    const reasons = Array.isArray(task.reasons) ? task.reasons : [];

    return (
        <div
            data-testid={`priority-task-${task.id}`}
            className="rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
        >
            <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {task.is_p0 && (
                            <span className="inline-flex items-center gap-1 rounded bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:text-red-200">
                                <Flame className="h-3 w-3" />
                                P0 Critical
                            </span>
                        )}
                        {task.is_main_work && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                                <Star className="h-3 w-3" />
                                Main Work
                            </span>
                        )}
                        {isProposed && !isCommitted && (
                            <span className="inline-flex items-center rounded bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
                                Recommended for Today
                            </span>
                        )}
                        {blockedBy.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:text-rose-200">
                                <Lock className="h-3 w-3" />
                                Blocked by #{blockedBy.join(', #')}
                            </span>
                        )}
                    </div>

                    <Link
                        href={`/todos/${task.id}`}
                        className="mt-1.5 block text-sm font-semibold text-gray-900 dark:text-white hover:underline"
                    >
                        {task.title}
                    </Link>

                    <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono">#{task.id}</span>
                        {task.focus_title && <span>Focus: {task.focus_title}</span>}
                        {task.due_date && (
                            <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Due {task.due_date}
                            </span>
                        )}
                        {task.estimate_minutes !== null && task.estimate_minutes !== undefined && (
                            <span>{task.estimate_minutes}m</span>
                        )}
                    </div>

                    {reasons.length > 0 && (
                        <ul className="mt-1.5 flex flex-wrap gap-1">
                            {reasons.map((reason, idx) => (
                                <li
                                    key={idx}
                                    className="rounded bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] text-gray-700 dark:text-gray-300"
                                >
                                    {reason}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onExplain(task)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-slate-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                        <HelpCircle className="h-3.5 w-3.5" />
                        Explain
                    </button>
                    {isCommitted ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onUncommit(task)}
                            className="inline-flex items-center rounded-md border border-gray-300 dark:border-slate-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                            Remove
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onCommit(task)}
                            className="inline-flex items-center gap-1 rounded-md bg-gray-900 dark:bg-white px-2 py-1 text-xs font-semibold text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50"
                        >
                            + Today
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PriorityIndex({
    date,
    capacity,
    main_work: mainWork,
    today = [],
    next = [],
    proposal = [],
    triage = {},
    warnings = [],
    counts = {},
    errors = {},
}) {
    const [busyTaskId, setBusyTaskId] = useState(null);
    const [explanation, setExplanation] = useState(null);
    const [explainError, setExplainError] = useState(null);

    const proposedSet = new Set(Array.isArray(proposal) ? proposal : []);
    const formattedWarnings = (Array.isArray(warnings) ? warnings : [])
        .map(formatWarningItem)
        .filter(Boolean);

    const handlePinToday = (task) => {
        setBusyTaskId(task.id);
        router.post(
            '/priority/plan/items',
            { todo_id: task.id, date },
            { preserveScroll: true, onFinish: () => setBusyTaskId(null) },
        );
    };

    const handleRemoveToday = (task) => {
        setBusyTaskId(task.id);
        router.delete(`/priority/plan/items/${task.id}`, {
            data: { date },
            preserveScroll: true,
            onFinish: () => setBusyTaskId(null),
        });
    };

    const handleExplain = async (task) => {
        setExplainError(null);
        setExplanation({ loading: true, todo: task });
        try {
            const response = await axios.get(`/priority/explain/${task.id}`, {
                params: date ? { date } : undefined,
            });
            setExplanation(response.data?.data ?? null);
        } catch (err) {
            setExplanation(null);
            setExplainError(err?.response?.data?.message || 'Unable to load priority explanation.');
        }
    };

    return (
        <DashboardLayout title="Priority Queue">
            <Head title="Priority Queue" />
            <div className="w-full px-4 sm:px-6 py-4">
                <div className="mb-4 pb-3 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-3">
                        <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                            Priority Queue
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Single-authority ranking for {date || 'today'} ·{' '}
                            <Link href="/dashboard" className="underline hover:text-gray-800 dark:hover:text-gray-200">
                                Back to Today
                            </Link>
                        </p>
                    </div>

                    {capacity && (
                        <div className="rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs">
                            <span className="font-semibold text-gray-900 dark:text-white">
                                WIP: {capacity.committed} / {capacity.wip_limit}
                            </span>
                            {capacity.minutes_capacity > 0 && (
                                <span className="ml-2.5 text-gray-500 dark:text-gray-400">
                                    Time: {capacity.minutes_planned} / {capacity.minutes_capacity} min
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {errors?.priority && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-800 dark:text-red-200">
                        {errors.priority}
                    </div>
                )}

                {explainError && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-800 dark:text-red-200">
                        {explainError}
                    </div>
                )}

                {/* Main Work Banner */}
                <section className="mb-4 rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
                        <Star className="h-3.5 w-3.5" />
                        Main Work
                    </div>
                    {mainWork ? (
                        <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                            <span className="font-semibold">{mainWork.label}</span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({mainWork.target_type} #{mainWork.target_id})
                            </span>
                            {mainWork.reason && (
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                    Reason: {mainWork.reason}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            No explicit Main Work is currently set.
                        </p>
                    )}
                </section>

                {/* Warnings */}
                {formattedWarnings.length > 0 && (
                    <section className="mb-4 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Warnings
                        </div>
                        <ul className="mt-1.5 space-y-1.5 text-xs text-amber-900 dark:text-amber-100">
                            {formattedWarnings.map((w, idx) => (
                                <li key={idx} className="flex flex-wrap items-baseline gap-1.5">
                                    <span className="rounded bg-amber-200/70 dark:bg-amber-900/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                        {w.label}
                                    </span>
                                    {w.todoId ? (
                                        <Link href={`/todos/${w.todoId}`} className="hover:underline">
                                            {w.text}
                                        </Link>
                                    ) : (
                                        <span>{w.text}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <div className="grid gap-4 lg:grid-cols-12 items-start min-w-0">
                    <div className="min-w-0 lg:col-span-8 xl:col-span-9 space-y-4">
                        {/* Today Plan */}
                        <section>
                            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                Today&apos;s Plan
                                <span className="font-normal text-gray-400">({today.length})</span>
                            </h2>
                            {today.length === 0 ? (
                                <div className="rounded-md border border-dashed border-gray-300 dark:border-slate-700 p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                                    No tasks pinned for today yet. Click + Today on any task below.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {today.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            isCommitted
                                            isProposed={false}
                                            busy={busyTaskId === task.id}
                                            onCommit={handlePinToday}
                                            onUncommit={handleRemoveToday}
                                            onExplain={handleExplain}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Next Ranked Queue */}
                        <section>
                            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Next (Ranked Queue)
                                <span className="ml-1.5 font-normal text-gray-400">({next.length})</span>
                            </h2>
                            {next.length === 0 ? (
                                <div className="rounded-md border border-dashed border-gray-300 dark:border-slate-700 p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                                    No ready tasks in the queue.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {next.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            isCommitted={false}
                                            isProposed={proposedSet.has(task.id)}
                                            busy={busyTaskId === task.id}
                                            onCommit={handlePinToday}
                                            onUncommit={handleRemoveToday}
                                            onExplain={handleExplain}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Sidebar: Triage & Counts */}
                    <aside className="lg:col-span-4 xl:col-span-3 space-y-3">
                        <section className="rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Triage Summary
                            </h2>
                            <dl className="mt-2.5 space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <dt className="text-gray-500 dark:text-gray-400">Total excluded</dt>
                                    <dd className="font-semibold text-gray-900 dark:text-white">{triage?.total ?? 0}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500 dark:text-gray-400">Inbox</dt>
                                    <dd className="font-mono text-gray-900 dark:text-white">{triage?.inbox ?? 0}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500 dark:text-gray-400">Needs focus</dt>
                                    <dd className="font-mono text-gray-900 dark:text-white">{triage?.needs_focus ?? 0}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500 dark:text-gray-400">Needs estimate</dt>
                                    <dd className="font-mono text-gray-900 dark:text-white">{triage?.needs_estimate ?? 0}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500 dark:text-gray-400">Blocked</dt>
                                    <dd className="font-mono text-gray-900 dark:text-white">{triage?.blocked ?? 0}</dd>
                                </div>
                            </dl>
                            {counts?.open !== undefined && (
                                <p className="mt-3 border-t border-gray-100 dark:border-slate-800 pt-2 text-[11px] text-gray-500 dark:text-gray-400">
                                    Open: {counts.open} · Offerable: {counts.offerable} · Excluded: {counts.excluded}
                                </p>
                            )}
                        </section>
                    </aside>
                </div>

                {/* Explain Modal */}
                {explanation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-lg rounded-lg bg-white dark:bg-slate-900 p-6 shadow-xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Priority Explanation
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setExplanation(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            {explanation.loading ? (
                                <p className="mt-4 text-sm text-gray-500">Loading explanation...</p>
                            ) : (
                                <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {explanation.todo?.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        {explanation.position ? (
                                            <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300">
                                                Rank #{explanation.position}
                                                {explanation.position === 1 ? ' · Top Priority' : ''}
                                            </span>
                                        ) : null}
                                        <span className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-gray-700 dark:text-gray-300">
                                            Ready: {explanation.ready ? 'Yes' : `No (${(explanation.readiness_reasons || []).join(', ')})`}
                                        </span>
                                    </div>
                                    {Array.isArray(explanation.reasons) && explanation.reasons.length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                Why it ranks here:
                                            </p>
                                            <ul className="space-y-1 text-xs">
                                                {explanation.reasons.map((r, idx) => (
                                                    <li key={idx}>• {r}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {explanation.decided_by ? (
                                        <p className="text-xs">
                                            <span className="font-medium">Ranked below previous task because of:</span>{' '}
                                            <span className="font-semibold">{formatDecidedBy(explanation.decided_by)}</span>
                                            {explanation.detail ? ` — ${explanation.detail}` : ''}
                                        </p>
                                    ) : explanation.position === 1 ? (
                                        <p className="text-xs text-emerald-700 dark:text-emerald-400">
                                            This is currently the #1 highest-priority task in your queue.
                                        </p>
                                    ) : null}
                                    {Array.isArray(explanation.blocked_by) && explanation.blocked_by.length > 0 && (
                                        <p className="text-xs">
                                            <span className="font-medium">Blocked by:</span>{' '}
                                            {explanation.blocked_by.map((b) => `#${b.id} ${b.title}`).join(', ')}
                                        </p>
                                    )}
                                    {Array.isArray(explanation.blocks) && explanation.blocks.length > 0 && (
                                        <p className="text-xs">
                                            <span className="font-medium">Unblocks:</span>{' '}
                                            {explanation.blocks.map((b) => `#${b.id} ${b.title}`).join(', ')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
