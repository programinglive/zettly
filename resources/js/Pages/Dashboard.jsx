import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Plus, ListTodo, FileText, PenTool, MailWarning } from 'lucide-react';

import DashboardLayout from '../Layouts/DashboardLayout';
import FocusGreeting from '../Components/FocusGreeting';
import ReorderDebug from '../Components/ReorderDebug';

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

        // Debug mode is for super admins only. This used to read
        // `!isSuperAdmin && !debugEnabled`, so anyone could turn the panel on by
        // setting localStorage['zettly-debug-mode'] = 'true'.
        const debugEnabled = isSuperAdmin
            && window.localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';

        if (!isSuperAdmin) {
            window.localStorage.removeItem(DEBUG_STORAGE_KEY);
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

    const [fabOpen, setFabOpen] = useState(false);

    const handleFabToggle = () => setFabOpen((prev) => !prev);
    const handleFabClose = () => setFabOpen(false);

    return (
        <DashboardLayout title="Dashboard">
            <Head title="Dashboard" />
            <div className="min-h-screen pb-32 lg:pb-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                    {/* Compact Notion-style Header */}
                    <div className="mb-5 pb-3 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Today
                            </h1>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {tasks.open} open · {tasks.completed} completed
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-medium">
                            <Link
                                href="/todos/create"
                                className="inline-flex items-center gap-1 rounded bg-gray-900 px-2.5 py-1 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                            >
                                <Plus className="h-3 w-3" />
                                New Todo
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
                    <div className="mb-6 space-y-3">
                        {mustVerifyEmail && (
                            <div className="py-2.5 px-3 rounded-md border border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-950/20">
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

                        <FocusGreeting tasks={tasks} />
                    </div>

                    {hasToday ? (
                        <div className="space-y-4">
                            <section className="rounded-md border border-gray-200 dark:border-slate-800 overflow-hidden">
                                <div className="bg-gray-50/80 dark:bg-slate-900/60 px-3 py-1.5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">Open tasks</h2>
                                    {today?.open_tasks?.status !== 'no_data' && (
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">{today.open_tasks.total_open} open</span>
                                    )}
                                </div>
                                {today?.open_tasks?.status === 'no_data' ? (
                                    <p className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">{today.open_tasks.message}</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100 dark:divide-slate-800/80">
                                        {today.open_tasks.items.map((item) => (
                                            <li key={item.id}>
                                                <Link
                                                    href={`/todos/${item.id}`}
                                                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                                                >
                                                    <span className="truncate font-medium">{item.title}</span>
                                                    {item.due_date && <span className="shrink-0 text-xs text-gray-400">due {item.due_date}</span>}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section className="rounded-md border border-gray-200 dark:border-slate-800 overflow-hidden">
                                <div className="bg-gray-50/80 dark:bg-slate-900/60 px-3 py-1.5 border-b border-gray-200 dark:border-slate-800">
                                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">Current work</h2>
                                </div>
                                {today?.current_work?.status === 'no_data' ? (
                                    <p className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">{today.current_work.message}</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100 dark:divide-slate-800/80">
                                        {today.current_work.items.map((item) => (
                                            <li key={item.id}>
                                                <Link
                                                    href={`/focus/${item.id}`}
                                                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                                                >
                                                    <span className="truncate font-medium">{item.title}</span>
                                                    <span className="shrink-0 text-xs text-gray-400">{item.status}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <section className="rounded-md border border-gray-200 dark:border-slate-800 overflow-hidden">
                                    <div className="bg-gray-50/80 dark:bg-slate-900/60 px-3 py-1.5 border-b border-gray-200 dark:border-slate-800">
                                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">Recent activity</h2>
                                    </div>
                                    {today?.recent_activity?.status === 'no_data' ? (
                                        <p className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">{today.recent_activity.message}</p>
                                    ) : (
                                        <ul className="divide-y divide-gray-100 dark:divide-slate-800/80">
                                            {today.recent_activity.items.map((item) => (
                                                <li key={item.id} className="px-3 py-2 text-xs text-gray-800 dark:text-gray-100">
                                                    <div className="flex items-center justify-between text-gray-400">
                                                        <span className="font-semibold uppercase">{item.kind}</span>
                                                        <span>{item.entry_date}</span>
                                                    </div>
                                                    <p className="mt-0.5 text-gray-600 dark:text-gray-300 line-clamp-2">{item.excerpt}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>

                                <section className="rounded-md border border-gray-200 dark:border-slate-800 overflow-hidden">
                                    <div className="bg-gray-50/80 dark:bg-slate-900/60 px-3 py-1.5 border-b border-gray-200 dark:border-slate-800">
                                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">Linked notes</h2>
                                    </div>
                                    {today?.linked_notes?.status === 'no_data' ? (
                                        <p className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">{today.linked_notes.message}</p>
                                    ) : (
                                        <ul className="divide-y divide-gray-100 dark:divide-slate-800/80">
                                            {today.linked_notes.items.map((item) => (
                                                <li key={item.id}>
                                                    <Link
                                                        href={`/todos/${item.id}`}
                                                        className="block px-3 py-2 text-xs font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800/40 truncate"
                                                    >
                                                        {item.title}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-md border border-gray-200 dark:border-slate-800 px-3.5 py-2.5">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Today data unavailable. Reload the page to retry.</p>
                        </div>
                    )}
                </div>
            </div>

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
