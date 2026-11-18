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

function TaskCard({
    task,
    isProposed,
    isCommitted,
    onCommit,
    onUncommit,
    onExplain,
}) {
    const blockedBy = Array.isArray(task.blocked_by) ? task.blocked_by : [];
    const reasons = Array.isArray(task.reasons) ? task.reasons : [];

    return (
        <div
            data-testid={`priority-task-${task.id}`}
            className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        {task.is_p0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:text-red-200">
                                <Flame className="h-3.5 w-3.5" />
                                P0 Critical
                            </span>
                        )}
                        {task.is_main_work && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
                                <Star className="h-3.5 w-3.5" />
                                Main Work
                            </span>
                        )}
                        {isProposed && !isCommitted && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                                Recommended for Today
                            </span>
                        )}
                        {blockedBy.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/40 px-2.5 py-0.5 text-xs font-medium text-rose-800 dark:text-rose-200">
                                <Lock className="h-3 w-3" />
                                Blocked by #{blockedBy.join(', #')}
                            </span>
                        )}
                    </div>

                    <Link
                        href={`/todos/${task.id}`}
                        className="mt-2 block text-base font-semibold text-gray-900 dark:text-white hover:underline"
                    >
                        {task.title}
                    </Link>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono">#{task.id}</span>
                        {task.focus_title && <span>Focus: {task.focus_title}</span>}
                        {task.due_date && (
                            <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                Due {task.due_date}
                            </span>
                        )}
                        {task.estimate_minutes !== null && task.estimate_minutes !== undefined && (
                            <span>{task.estimate_minutes}m</span>
                        )}
                    </div>

                    {reasons.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                            {reasons.map((reason, idx) => (
                                <li
                                    key={idx}
                                    className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
                                >
                                    {reason}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onExplain(task)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                        <HelpCircle className="h-3.5 w-3.5" />
                        Explain
                    </button>
                    {isCommitted ? (
                        <button
                            type="button"
                            onClick={() => onUncommit(task)}
                            className="inline-flex items-center rounded-md border border-gray-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                            Uncommit
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onCommit(task)}
                            className="inline-flex items-center gap-1 rounded-md bg-gray-900 dark:bg-white px-2.5 py-1.5 text-xs font-semibold text-white dark:text-gray-900 hover:opacity-90"
                        >
                            Commit
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
    const [actionModal, setActionModal] = useState(null); // { mode: 'commit'|'uncommit', task }
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [explanation, setExplanation] = useState(null);
    const [explainError, setExplainError] = useState(null);

    const proposedSet = new Set(Array.isArray(proposal) ? proposal : []);

    const openActionModal = (mode, task) => {
        setActionModal({ mode, task });
        setReason('');
    };

    const submitAction = (e) => {
        e.preventDefault();
        if (!actionModal || reason.trim().length < 8) return;
        setSubmitting(true);

        const finish = () => {
            setSubmitting(false);
            setActionModal(null);
            setReason('');
        };

        if (actionModal.mode === 'commit') {
            router.post(
                '/priority/plan/items',
                { todo_id: actionModal.task.id, reason: reason.trim(), date },
                { preserveScroll: true, onFinish: finish },
            );
        } else {
            router.delete(`/priority/plan/items/${actionModal.task.id}`, {
                data: { reason: reason.trim(), date },
                preserveScroll: true,
                onFinish: finish,
            });
        }
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
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Priority Queue
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Single-authority ranking for {date || 'today'} ·{' '}
                            <Link href="/dashboard" className="underline hover:text-gray-800 dark:hover:text-gray-200">
                                Back to Today
                            </Link>
                        </p>
                    </div>

                    {capacity && (
                        <div className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm">
                            <span className="font-semibold text-gray-900 dark:text-white">
                                WIP: {capacity.committed} / {capacity.wip_limit}
                            </span>
                            {capacity.minutes_capacity > 0 && (
                                <span className="ml-3 text-gray-500 dark:text-gray-400">
                                    Time: {capacity.minutes_planned} / {capacity.minutes_capacity} min
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {errors?.priority && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
                        {errors.priority}
                    </div>
                )}

                {explainError && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
                        {explainError}
                    </div>
                )}

                {/* Main Work Banner */}
                <section className="mb-6 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                        <Star className="h-4 w-4" />
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
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            No explicit Main Work is currently set.
                        </p>
                    )}
                </section>

                {/* Warnings */}
                {Array.isArray(warnings) && warnings.length > 0 && (
                    <section className="mb-6 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                            <AlertTriangle className="h-4 w-4" />
                            Warnings
                        </div>
                        <ul className="mt-2 space-y-1 text-sm text-amber-900 dark:text-amber-100">
                            {warnings.map((w, idx) => (
                                <li key={idx}>
                                    <span className="font-mono text-xs uppercase mr-2">[{w.type}]</span>
                                    {w.message}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Today Committed */}
                        <section>
                            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                Today (Committed)
                                <span className="text-sm font-normal text-gray-500">({today.length})</span>
                            </h2>
                            {today.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No tasks committed for today yet. Commit tasks from the Next queue below.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {today.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            isCommitted
                                            isProposed={false}
                                            onCommit={(t) => openActionModal('commit', t)}
                                            onUncommit={(t) => openActionModal('uncommit', t)}
                                            onExplain={handleExplain}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Next Ranked Queue */}
                        <section>
                            <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
                                Next (Ranked Queue)
                                <span className="ml-2 text-sm font-normal text-gray-500">({next.length})</span>
                            </h2>
                            {next.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No ready tasks in the queue.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {next.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            isCommitted={false}
                                            isProposed={proposedSet.has(task.id)}
                                            onCommit={(t) => openActionModal('commit', t)}
                                            onUncommit={(t) => openActionModal('uncommit', t)}
                                            onExplain={handleExplain}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Sidebar: Triage & Counts */}
                    <aside className="space-y-6">
                        <section className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                                Triage Summary
                            </h2>
                            <dl className="mt-3 space-y-2 text-sm">
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
                                <p className="mt-4 border-t border-gray-100 dark:border-slate-800 pt-3 text-xs text-gray-500 dark:text-gray-400">
                                    Open: {counts.open} · Offerable: {counts.offerable} · Excluded: {counts.excluded}
                                </p>
                            )}
                        </section>
                    </aside>
                </div>

                {/* Commit / Uncommit Reason Modal */}
                {actionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-900 p-6 shadow-xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {actionModal.mode === 'commit' ? 'Commit to Today' : 'Uncommit from Today'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setActionModal(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                {actionModal.task.title}
                            </p>
                            <form onSubmit={submitAction} className="mt-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Reason (minimum 8 characters)
                                    </label>
                                    <input
                                        type="text"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        minLength={8}
                                        required
                                        placeholder="Why is this changing today's plan?"
                                        className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActionModal(null)}
                                        className="rounded-md border border-gray-300 dark:border-slate-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || reason.trim().length < 8}
                                        className="rounded-md bg-gray-900 dark:bg-white px-4 py-1.5 text-sm font-semibold text-white dark:text-gray-900 disabled:opacity-50"
                                    >
                                        {submitting ? 'Saving...' : 'Confirm'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

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
                                    <p>
                                        <span className="font-medium">Ready:</span>{' '}
                                        {explanation.ready ? 'Yes' : `No (${(explanation.readiness_reasons || []).join(', ')})`}
                                    </p>
                                    <p>
                                        <span className="font-medium">Decided by:</span>{' '}
                                        <span className="font-mono">{explanation.decided_by}</span>
                                    </p>
                                    <p>
                                        <span className="font-medium">Detail:</span> {explanation.detail}
                                    </p>
                                    {Array.isArray(explanation.blocked_by) && explanation.blocked_by.length > 0 && (
                                        <p>
                                            <span className="font-medium">Blocked by:</span>{' '}
                                            {explanation.blocked_by.map((b) => `#${b.id} ${b.title}`).join(', ')}
                                        </p>
                                    )}
                                    {Array.isArray(explanation.blocks) && explanation.blocks.length > 0 && (
                                        <p>
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
