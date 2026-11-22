import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Plus, ListTodo, FileText, PenTool, MailWarning, ArrowUpDown, AlertTriangle, Calendar, Clock, CheckCircle2, Sparkles, Compass, ArrowRight } from 'lucide-react';

import DashboardLayout from '../Layouts/DashboardLayout';
import FocusGreeting from '../Components/FocusGreeting';
import ReorderDebug from '../Components/ReorderDebug';

export function formatActivityExcerpt(excerpt) {
    if (!excerpt || typeof excerpt !== 'string') {
        return '';
    }

    return excerpt
        .replace(/^\[Dev Workflow outcome ID:[^\]]*\]\s*/i, '')
        .replace(/^Status:\s*\w+\s*Task:\s*/i, '')
        .trim();
}

const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3, UNPRIORITIZED: 4 };

const PRIORITY_BADGE_STYLES = {
    P0: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900',
    P1: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
    P2: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900',
    P3: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    UNPRIORITIZED: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-900 dark:text-gray-400 dark:border-slate-700',
};

export function resolveTaskTier(item) {
    if (item?.priority_tier) return item.priority_tier;
    if (item?.is_p0) return 'P0';
    if (!item?.priority || !item?.importance) return 'UNPRIORITIZED';
    if (item.priority === 'urgent' && item.importance === 'important') return 'P1';
    if (item.importance === 'important' || item.priority === 'urgent') return 'P2';
    return 'P3';
}

export default function Dashboard({
    filters = { tags: [] },
    availableTags = [],
    notes = [],
    tasks = { open: 0, completed: 0 },
    preferences = {},
    today = {},
}) {
    const hasToday = Boolean(today && typeof today === 'object' && Object.keys(today).length > 0);
    const { props: pageProps } = usePage();
    const authUser = pageProps?.auth?.user;
    const mustVerifyEmail = Boolean(authUser) && authUser.email_verified_at === null;
    const { post: resendVerification, processing: isSendingVerification } = useForm();
    const quickTodoForm = useForm({ title: '' });
    const isSuperAdmin = authUser?.role === 'super_admin';
    const DEBUG_STORAGE_KEY = 'zettly-debug-mode';
    const [hasDebugFlag, setHasDebugFlag] = useState(() => {
        if (typeof window === 'undefined' || !isSuperAdmin) {
            return false;
        }
        return window.localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';
    });

    const [priorityFilter, setPriorityFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState(filters?.sort || 'priority');
    const [focusSortBy, setFocusSortBy] = useState(filters?.focus_sort || 'priority');

    useEffect(() => {
        if (typeof window === 'undefined') {
            setHasDebugFlag(false);
            return undefined;
        }
        const debugEnabled = isSuperAdmin
            && window.localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';
        if (!isSuperAdmin) {
            window.localStorage.removeItem(DEBUG_STORAGE_KEY);
            setHasDebugFlag(false);
            return undefined;
        }
        const handleDebugChange = (event) => {
            setHasDebugFlag(Boolean(event.detail?.enabled));
        };
        setHasDebugFlag(debugEnabled);
        window.addEventListener('zettly:debug-mode-changed', handleDebugChange);
        return () => window.removeEventListener('zettly:debug-mode-changed', handleDebugChange);
    }, [isSuperAdmin]);

    const [fabOpen, setFabOpen] = useState(false);
    const handleFabToggle = () => setFabOpen((prev) => !prev);
    const handleFabClose = () => setFabOpen(false);

    const metrics = today?.metrics || {
        open_today: 0,
        open_overall: tasks.open,
        completed: tasks.completed,
        active_focuses: Array.isArray(today?.current_work?.items) ? today.current_work.items.length : 0,
        overdue: 0,
        unprioritized: 0,
        p0_critical: 0,
    };

    const visiblePriorityTasks = useMemo(() => {
        const raw = Array.isArray(today?.open_tasks?.items) ? today.open_tasks.items : [];
        return priorityFilter === 'ALL'
            ? raw
            : raw.filter((item) => resolveTaskTier(item) === priorityFilter);
    }, [today?.open_tasks?.items, priorityFilter]);

    const visibleFocusItems = useMemo(
        () => (Array.isArray(today?.current_work?.items) ? today.current_work.items : []),
        [today?.current_work?.items],
    );

    const handleTaskSortToggle = () => {
        const next = sortBy === 'priority' ? 'due_date' : 'priority';
        setSortBy(next);
        router.get('/dashboard', { sort: next, focus_sort: focusSortBy }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleFocusSortToggle = () => {
        const next = focusSortBy === 'priority' ? 'open_tasks' : focusSortBy === 'open_tasks' ? 'progress' : 'priority';
        setFocusSortBy(next);
        router.get('/dashboard', { sort: sortBy, focus_sort: next }, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <DashboardLayout title="Dashboard">
            <Head title="Dashboard" />
            <div className="min-h-screen pb-24 lg:pb-6 overflow-x-hidden">
                <div className="w-full max-w-full px-4 sm:px-6 py-4">
                    {/* Compact Notion-style Header with Explicitly Scoped Counters */}
                    <div className="mb-4 pb-3 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-baseline gap-3">
                            <h1 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                                Today
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span><strong className="text-gray-900 dark:text-gray-100">{metrics.open_today}</strong> open today</span>
                                <span>·</span>
                                <span><strong className="text-gray-900 dark:text-gray-100">{metrics.open_overall}</strong> open overall</span>
                                <span>·</span>
                                <span><strong className="text-gray-900 dark:text-gray-100">{metrics.active_focuses}</strong> active focuses</span>
                                {metrics.overdue > 0 && (
                                    <>
                                        <span>·</span>
                                        <span className="text-red-600 dark:text-red-400 font-medium">{metrics.overdue} overdue</span>
                                    </>
                                )}
                                {metrics.unprioritized > 0 && (
                                    <>
                                        <span>·</span>
                                        <span className="text-amber-600 dark:text-amber-400 font-medium">{metrics.unprioritized} unprioritized</span>
                                    </>
                                )}
                                <span>·</span>
                                <span>{metrics.completed} completed</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs font-medium">
                            <Link
                                href="/todos/create"
                                className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-2.5 py-1 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                New Todo
                            </Link>
                            <Link
                                href="/todos/create?type=note"
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
                            >
                                <FileText className="h-3.5 w-3.5" />
                                New Note
                            </Link>
                            <Link
                                href="/summary"
                                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                            >
                                Summary
                            </Link>
                            <Link
                                href="/priority"
                                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                            >
                                Priority
                            </Link>
                            <Link
                                href="/todos"
                                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                            >
                                All tasks
                            </Link>
                        </div>
                    </div>

                    {/* Focus Callout & Email Verification */}
                    <div className="mb-4 space-y-3">
                        {mustVerifyEmail && (
                            <div className="py-2 px-3 rounded-md border border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-950/20">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <MailWarning className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                                            Email Verification Required — Check your inbox.
                                        </span>
                                    </div>
                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            resendVerification(route('verification.send'));
                                        }}
                                    >
                                        <button
                                            type="submit"
                                            className="text-xs font-semibold text-amber-700 hover:underline dark:text-amber-400"
                                            disabled={isSendingVerification}
                                        >
                                            {isSendingVerification ? 'Sending...' : 'Resend link'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        <FocusGreeting tasks={tasks} compactSummary />
                    </div>

                    {hasToday ? (
                        <div className="grid gap-3 xl:grid-cols-12 items-start min-w-0">
                            {/* Main Work Area: Priority Queue & Active Focuses */}
                            <div className="min-w-0 space-y-3 xl:col-span-7">
                                {/* Priority Queue Section */}
                                <section className="min-w-0 rounded-md border border-gray-200 dark:border-slate-800 overflow-hidden" aria-label="Priority Queue">
                                    <div className="bg-gray-50/80 dark:bg-slate-900/60 px-3 py-1.5 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">Priority Queue</h2>
                                            {today?.open_tasks?.status !== 'no_data' && (
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400">{today.open_tasks.total_open} open</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {['ALL', 'P0', 'P1', 'P2', 'P3', 'UNPRIORITIZED'].map((tier) => (
                                                <button
                                                    key={tier}
                                                    type="button"
                                                    onClick={() => setPriorityFilter(tier)}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                                                        priorityFilter === tier
                                                            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                                                            : 'text-gray-500 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-slate-800'
                                                    }`}
                                                >
                                                    {tier === 'UNPRIORITIZED' ? 'Unset' : tier}
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={handleTaskSortToggle}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700 text-[10px] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                                title="Toggle sort order"
                                            >
                                                <ArrowUpDown className="h-3 w-3" />
                                                {sortBy === 'priority' ? 'By Priority' : 'By Due Date'}
                                            </button>
                                        </div>
                                    </div>
                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            if (!quickTodoForm.data.title.trim()) {
                                                return;
                                            }
                                            quickTodoForm.post('/todos', {
                                                preserveScroll: true,
                                                onSuccess: () => quickTodoForm.reset('title'),
                                            });
                                        }}
                                        className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800/80 px-3 py-1.5 bg-white dark:bg-slate-950/40"
                                    >
                                        <Plus className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                                        <input
                                            type="text"
                                            value={quickTodoForm.data.title}
                                            onChange={(e) => quickTodoForm.setData('title', e.target.value)}
                                            placeholder="Quick add a task and press Enter..."
                                            aria-label="Quick add a task"
                                            disabled={quickTodoForm.processing}
                                            className="w-full border-0 bg-transparent p-0 text-xs text-gray-900 placeholder-gray-400 focus:ring-0 dark:text-gray-100 dark:placeholder-slate-500"
                                        />
                                        {quickTodoForm.data.title.trim() && (
                                            <button
                                                type="submit"
                                                disabled={quickTodoForm.processing}
                                                className="shrink-0 rounded bg-gray-900 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                                            >
                                                {quickTodoForm.processing ? 'Adding...' : 'Add'}
                                            </button>
                                        )}
                                    </form>
                                    {today?.open_tasks?.status === 'no_data' ? (
                                        <div className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300 flex flex-wrap items-center justify-between gap-2">
                                            <p>{today.open_tasks.message}</p>
                                            <Link
                                                href="/todos/create"
                                                className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Plan next task
                                            </Link>
                                        </div>
                                    ) : visiblePriorityTasks.length === 0 ? (
                                        <p className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                                            No open tasks match the selected priority filter ({priorityFilter}).
                                        </p>
                                    ) : (
                                        <ul className="divide-y divide-gray-100 dark:divide-slate-800/80">
                                            {visiblePriorityTasks.map((item) => {
                                                const tier = resolveTaskTier(item);
                                                return (
                                                    <li key={item.id}>
                                                        <Link
                                                            href={`/todos/${item.id}`}
                                                            className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_BADGE_STYLES[tier]}`}>
                                                                    {tier === 'UNPRIORITIZED' ? 'UNSET' : tier}
                                                                </span>
                                                                <span className="truncate font-medium">{item.title}</span>
                                                                {item.focus_title && (
                                                                    <span className="hidden sm:inline-block shrink-0 rounded bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 text-[10px] text-indigo-700 dark:text-indigo-300 truncate max-w-[140px]">
                                                                        {item.focus_title}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.due_date && (
                                                                <span className="shrink-0 text-xs text-gray-400">due {item.due_date}</span>
                                                            )}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </section>

                                {/* Calendar & External Waiting Schedule */}
                                {Array.isArray(today?.external_schedule?.items) && today.external_schedule.items.length > 0 && (
                                    <section className="min-w-0 rounded-md border border-amber-200/80 dark:border-amber-900/60 overflow-hidden" aria-label="Calendar and External Waiting">
                                        <div className="bg-amber-50/70 dark:bg-amber-950/30 px-3 py-1.5 border-b border-amber-200/70 dark:border-amber-900/50 flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                                                <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                                                    Calendar & External Waiting
                                                </h2>
                                                <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                                                    {today.external_schedule.total ?? today.external_schedule.items.length} tracked
                                                </span>
                                            </div>
                                            <Link
                                                href="/calendar"
                                                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 hover:underline dark:text-amber-300"
                                            >
                                                Open Calendar
                                                <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        </div>
                                        <ul className="divide-y divide-amber-100/80 dark:divide-slate-800/80 bg-white dark:bg-slate-950/30">
                                            {today.external_schedule.items.map((item) => {
                                                const badgeLabel = item.is_overdue
                                                    ? 'Overdue'
                                                    : item.is_external_waiting
                                                        ? 'Waiting External'
                                                        : 'Scheduled';
                                                return (
                                                    <li key={item.id} className="px-3 py-2 flex items-center justify-between gap-3 hover:bg-amber-50/40 dark:hover:bg-slate-800/40">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span
                                                                className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                                                                    item.is_overdue
                                                                        ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900'
                                                                        : item.is_external_waiting
                                                                            ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900'
                                                                            : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900'
                                                                }`}
                                                            >
                                                                {badgeLabel}
                                                            </span>
                                                            <Link
                                                                href={`/todos/${item.id}`}
                                                                className="truncate text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline"
                                                            >
                                                                {item.title}
                                                            </Link>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0 text-xs">
                                                            {item.due_date ? (
                                                                <Link
                                                                    href={`/calendar?date=${item.due_date}`}
                                                                    className="inline-flex items-center gap-1 rounded border border-gray-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                                                >
                                                                    <Clock className="h-3 w-3" aria-hidden="true" />
                                                                    {item.due_date}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-[11px] text-gray-400">No date</span>
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </section>
                                )}

                                {/* Current Work / Active Focuses with Measurable Progress */}
                                <section className="min-w-0 rounded-md border border-gray-200 dark:border-slate-800 overflow-hidden" aria-label="Active Focuses">
                                    <div className="bg-gray-50/80 dark:bg-slate-900/60 px-3 py-1.5 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">Current work</h2>
                                            {today?.current_work?.status !== 'no_data' && Array.isArray(today?.current_work?.items) && (
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    {today.current_work.total_active ?? today.current_work.items.length} active
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px]">
                                            <button
                                                type="button"
                                                onClick={handleFocusSortToggle}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                            >
                                                <ArrowUpDown className="h-3 w-3" />
                                                Sort: {focusSortBy === 'priority' ? 'Priority' : focusSortBy === 'open_tasks' ? 'Open Tasks' : 'Progress'}
                                            </button>
                                        </div>
                                    </div>
                                    {today?.current_work?.status === 'no_data' ? (
                                        <p className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">{today.current_work.message}</p>
                                    ) : (
                                        <ul className="divide-y divide-gray-100 dark:divide-slate-800/80">
                                            {visibleFocusItems.map((item) => {
                                                const needsAction = item.work_state === 'planning' || item.work_state === 'needs_next_action';
                                                return (
                                                    <li key={item.id} className="px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800/40">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <Link href={`/focus/${item.id}`} className="flex items-center gap-2 min-w-0 flex-1">
                                                                {item.priority_tier && (
                                                                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_BADGE_STYLES[item.priority_tier] || PRIORITY_BADGE_STYLES.P3}`}>
                                                                        {item.priority_tier}
                                                                    </span>
                                                                )}
                                                                <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
                                                            </Link>
                                                            <div className="flex items-center gap-2 shrink-0 text-xs">
                                                                {(item.total_tasks_count ?? 0) > 0 && (
                                                                    <span className="hidden sm:inline text-[11px] text-gray-500 dark:text-gray-400">
                                                                        {item.open_tasks_count ?? 0} open · {item.completed_tasks_count ?? 0} done
                                                                        {item.progress_percent !== null && item.progress_percent !== undefined ? ` · ${item.progress_percent}%` : ''}
                                                                    </span>
                                                                )}
                                                                {needsAction && (
                                                                    <Link
                                                                        href={`/todos/create?focus_id=${item.id}`}
                                                                        className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
                                                                    >
                                                                        <AlertTriangle className="h-3 w-3" />
                                                                        Needs Next Action
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {item.progress_percent !== null && item.progress_percent !== undefined && (
                                                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${
                                                                        item.progress_percent >= 100 && (item.open_tasks_count ?? 0) === 0
                                                                            ? 'bg-emerald-500 dark:bg-emerald-400'
                                                                            : 'bg-indigo-600 dark:bg-indigo-400'
                                                                    }`}
                                                                    style={{ width: `${item.progress_percent}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </section>
                            </div>

                            {/* Secondary Area: Human-Readable Daily Retrospective */}
                            <div className="min-w-0 space-y-3 xl:col-span-5">
                                <section className="min-w-0 rounded-md border border-gray-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/50" aria-label="Daily Retrospective">
                                    <div className="bg-gray-50/80 dark:bg-slate-900/60 px-3 py-1.5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
                                            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                                Today&apos;s Retrospective
                                            </h2>
                                            {today?.daily_retrospective?.range_label && (
                                                <span className="text-[11px] text-gray-400 dark:text-slate-500">
                                                    {today.daily_retrospective.range_label}
                                                </span>
                                            )}
                                        </div>
                                        <Link
                                            href="/reports"
                                            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                                        >
                                            All Retrospectives
                                            <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>

                                    {today?.daily_retrospective ? (
                                        <div className="p-3 space-y-3 text-xs">
                                            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">
                                                {today.daily_retrospective.summary}
                                            </p>

                                            {Array.isArray(today.daily_retrospective.done_highlights) && today.daily_retrospective.done_highlights.length > 0 && (
                                                <div className="border-t border-gray-100 dark:border-slate-800 pt-2.5">
                                                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                                                        Done Today ({today.daily_retrospective.completed_count})
                                                    </h3>
                                                    <ul className="space-y-1">
                                                        {today.daily_retrospective.done_highlights.map((item) => (
                                                            <li key={item.id}>
                                                                <Link
                                                                    href={`/todos/${item.id}`}
                                                                    className="block truncate text-gray-700 dark:text-gray-200 hover:underline"
                                                                >
                                                                    • {item.title}
                                                                </Link>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {Array.isArray(today.daily_retrospective.went_well) && today.daily_retrospective.went_well.length > 0 && (
                                                <div className="border-t border-gray-100 dark:border-slate-800 pt-2.5">
                                                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5">
                                                        What Went Well
                                                    </h3>
                                                    <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                                                        {today.daily_retrospective.went_well.map((line, index) => (
                                                            <li key={index} className="leading-relaxed">• {line}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {Array.isArray(today.daily_retrospective.blockers) && today.daily_retrospective.blockers.length > 0 && (
                                                <div className="border-t border-gray-100 dark:border-slate-800 pt-2.5">
                                                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
                                                        Blockers & Waiting
                                                    </h3>
                                                    <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                                                        {today.daily_retrospective.blockers.map((line, index) => (
                                                            <li key={index} className="leading-relaxed">• {line}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {Array.isArray(today.daily_retrospective.improvements) && today.daily_retrospective.improvements.length > 0 && (
                                                <div className="border-t border-gray-100 dark:border-slate-800 pt-2.5">
                                                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1.5 flex items-center gap-1.5">
                                                        <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                                                        What to Improve
                                                    </h3>
                                                    <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                                                        {today.daily_retrospective.improvements.map((line, index) => (
                                                            <li key={index} className="leading-relaxed">• {line}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                                            Daily retrospective is not available yet.
                                        </p>
                                    )}
                                </section>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-md border border-gray-200 dark:border-slate-800 px-3 py-2.5">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Today data unavailable. Reload the page to retry.</p>
                        </div>
                    )}
                </div>
            </div>

            {hasDebugFlag && <ReorderDebug />}

            <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 lg:hidden">
                <div
                    className={`flex flex-col gap-2 transition-all duration-150 ${fabOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none translate-y-2 opacity-0'}`}
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
