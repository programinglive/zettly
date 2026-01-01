import React, { useMemo, useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Archive, ArchiveRestore, ArrowLeft, Calendar } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import TagBadge from '../../Components/TagBadge';
import SanitizedHtml from '../../Components/SanitizedHtml';
import CompletionReasonDialog from '../../Components/CompletionReasonDialog';

const resolveCsrfToken = () => {
    const inertiaToken = router?.page?.props?.csrf_token;

    if (inertiaToken) {
        return inertiaToken;
    }

    if (typeof document === 'undefined') {
        return null;
    }

    const tokenMeta = document.querySelector('meta[name="csrf-token"]');

    return tokenMeta?.content ?? null;
};

export default function Archived({ todos }) {
    const isPaginated = todos && Array.isArray(todos.data);
    const archivedTodos = isPaginated ? todos.data : todos;
    const totalArchived = isPaginated ? todos.total : archivedTodos.length;
    const paginationLinks = isPaginated ? todos.links : [];
    const restoreForm = useForm({ reason: '' });
    const [restoringId, setRestoringId] = useState(null);
    const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
    const [targetTodo, setTargetTodo] = useState(null);

    const archivedSinceStats = useMemo(() => {
        if (!archivedTodos.length) {
            return null;
        }

        const mostRecent = archivedTodos[0]?.archived_at ?? null;
        const oldest = archivedTodos[archivedTodos.length - 1]?.archived_at ?? null;

        return {
            mostRecent,
            oldest,
        };
    }, [archivedTodos]);

    const openReasonDialog = (todo) => {
        restoreForm.reset('reason');
        restoreForm.clearErrors();
        setTargetTodo(todo);
        setReasonDialogOpen(true);
    };

    const closeReasonDialog = () => {
        setReasonDialogOpen(false);
        setTargetTodo(null);
        setRestoringId(null);
        restoreForm.reset('reason');
        restoreForm.clearErrors();
    };

    const submitReason = (reason) => {
        if (!targetTodo) {
            return;
        }

        const token = resolveCsrfToken();

        const payload = {
            reason,
            ...(token ? { _token: token } : {}),
        };

        setRestoringId(targetTodo.id);
        restoreForm.setData(payload);
        restoreForm.post(`/todos/${targetTodo.id}/restore`, {
            preserveScroll: true,
            onFinish: () => setRestoringId(null),
            onSuccess: closeReasonDialog,
            onError: () => restoreForm.setData(payload),
        });
    };

    const handleRestore = (todo) => {
        setRestoringId(todo.id);
        restoreForm.post(`/todos/${todo.id}/restore`, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setRestoringId(null),
        });
    };

    return (
        <AppLayout title="Archived Todos">
            <Head title="Archived Todos" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-6">
                            <Link
                                href="/todos"
                                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-100 bg-white text-gray-400 transition hover:bg-gray-900 hover:text-white dark:bg-slate-900/60 dark:border-slate-800 dark:hover:bg-white dark:hover:text-gray-900 shadow-sm"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                                Archived Tasks
                            </h1>
                        </div>
                        <p className="text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
                            A historical record of your long-term completions. Restoring a task keeps its full history so you can pick up exactly where you left off.
                        </p>
                    </div>

                    <div className="flex flex-col gap-1 rounded-[2rem] border border-gray-100 bg-white p-8 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Total Archived</span>
                        <span className="text-3xl font-black text-gray-900 dark:text-white">{totalArchived}</span>
                        {archivedSinceStats?.mostRecent && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                                LAST ARCHIVED {new Date(archivedSinceStats.mostRecent).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>

                {archivedTodos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white/70 px-6 py-20 text-center dark:border-gray-800 dark:bg-gray-900/40">
                        <Archive className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                        <h2 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">Nothing archived yet</h2>
                        <p className="mt-2 max-w-lg text-sm text-gray-500 dark:text-gray-400">
                            Completed todos that you move to the archive will appear here. You can always restore them back to your active workspace.
                        </p>
                        <Link href="/todos" className="mt-6">
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to My Todos
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {archivedTodos.map((todo) => (
                            <article
                                key={todo.id}
                                className="group rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/70"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-xl font-semibold text-gray-900 line-through decoration-2 decoration-indigo-300 dark:text-gray-100">
                                                {todo.title}
                                            </h3>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                #{todo.id}
                                            </span>
                                        </div>

                                        {todo.description && (
                                            <SanitizedHtml
                                                className="prose prose-sm max-w-none text-gray-600 dark:prose-invert dark:text-gray-300"
                                                html={todo.description}
                                            />
                                        )}

                                        {todo.tags && todo.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {todo.tags.map(tag => (
                                                    <TagBadge key={tag.id} tag={tag} />
                                                ))}
                                            </div>
                                        )}

                                        {(todo.related_todos?.length > 0 || todo.linked_by_todos?.length > 0) && (
                                            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300">
                                                <span className="font-medium">Related todos:</span>{' '}
                                                {(todo.related_todos?.length || 0) + (todo.linked_by_todos?.length || 0)} linked items
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-4 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            <span className="inline-flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Completed {new Date(todo.completed_at).toLocaleDateString()}
                                            </span>
                                            <span className="inline-flex items-center gap-2">
                                                <Archive className="h-4 w-4" />
                                                Archived {new Date(todo.archived_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col items-stretch gap-2 lg:w-52">
                                        <Button
                                            onClick={() => openReasonDialog(todo)}
                                            disabled={restoreForm.processing && restoringId === todo.id}
                                            className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                                        >
                                            <ArchiveRestore className="h-4 w-4" />
                                            Restore todo
                                        </Button>
                                        <Link
                                            href={`/todos/${todo.id}`}
                                            className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
                                        >
                                            View details
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        ))}

                        {isPaginated && paginationLinks.length > 0 && (
                            <nav className="flex justify-center pt-4" aria-label="Archived todos pagination">
                                <ul className="flex flex-wrap items-center gap-2 text-sm">
                                    {paginationLinks.map((link, index) => (
                                        <li key={`${link.label}-${index}`}>
                                            {link.url ? (
                                                <Link
                                                    href={link.url}
                                                    preserveScroll
                                                    preserveState
                                                    className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition ${link.active
                                                            ? 'bg-indigo-600 text-white shadow-sm'
                                                            : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                                                        }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ) : (
                                                <span
                                                    className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full border border-gray-100 px-3 py-2 text-gray-400 dark:border-gray-800 dark:text-gray-500"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        )}
                    </div>
                )}
            </div>
            <CompletionReasonDialog
                open={reasonDialogOpen}
                onCancel={closeReasonDialog}
                onSubmit={submitReason}
                processing={restoreForm.processing}
                initialState="archived"
                targetState={targetTodo?.is_completed ? 'completed' : 'pending'}
                error={restoreForm.errors.reason}
            />
        </AppLayout>
    );
}
