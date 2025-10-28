import React, { useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle2, ArrowLeft, Undo2, Calendar, Archive } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import TagBadge from '../../Components/TagBadge';
import SanitizedHtml from '../../Components/SanitizedHtml';

export default function Completed({ todos }) {
    const isPaginated = todos && Array.isArray(todos.data);
    const completedTodos = isPaginated ? todos.data : todos;
    const totalCompleted = isPaginated ? todos.total : completedTodos.length;
    const paginationLinks = isPaginated ? todos.links : [];
    const toggleForm = useForm();
    const [processingId, setProcessingId] = useState(null);

    const completionStats = useMemo(() => {
        if (!completedTodos.length) {
            return null;
        }

        const mostRecent = completedTodos[0]?.completed_at ?? null;
        const oldest = completedTodos[completedTodos.length - 1]?.completed_at ?? null;

        return {
            mostRecent,
            oldest,
        };
    }, [completedTodos]);

    const handleToggle = (todo) => {
        setProcessingId(todo.id);
        toggleForm.post(`/todos/${todo.id}/toggle`, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setProcessingId(null),
        });
    };

    return (
        <AppLayout title="Completed Todos">
            <Head title="Completed Todos" />

            <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 py-10 space-y-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <Link
                            href="/todos"
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:-translate-x-0.5 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                                <CheckCircle2 className="h-4 w-4" />
                                Completed Todos
                            </div>
                            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                                Celebrate your wins and revisit them any time
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Need to pick something back up? Flip a completed todo back to active status without losing any metadata.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-5 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900/70">
                        <span className="text-gray-500 dark:text-gray-400">Completed todos</span>
                        <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{totalCompleted}</span>
                        {completionStats?.mostRecent && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                Last completed {new Date(completionStats.mostRecent).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>

                {completedTodos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white/70 px-6 py-20 text-center dark:border-gray-800 dark:bg-gray-900/40">
                        <CheckCircle2 className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                        <h2 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">No completed todos yet</h2>
                        <p className="mt-2 max-w-lg text-sm text-gray-500 dark:text-gray-400">
                            Your achievements will show up here once you start checking items off your list.
                        </p>
                        <Link href="/todos" className="mt-6">
                            <Button variant="outline" className="gap-2">
                                Keep going
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {completedTodos.map((todo) => (
                            <article
                                key={todo.id}
                                className="group rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/70"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-xl font-semibold text-gray-900 line-through decoration-2 decoration-emerald-300 dark:text-gray-100">
                                                {todo.title}
                                            </h3>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                #{todo.id}
                                            </span>
                                            {todo.archived && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                                                    <Archive className="h-3.5 w-3.5" />
                                                    Archived
                                                </span>
                                            )}
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
                                            {todo.archived && (
                                                <span className="inline-flex items-center gap-2">
                                                    <Archive className="h-4 w-4" />
                                                    Archived {new Date(todo.archived_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col items-stretch gap-2 lg:w-52">
                                        <Button
                                            onClick={() => handleToggle(todo)}
                                            disabled={toggleForm.processing && processingId === todo.id}
                                            variant="outline"
                                            className="w-full gap-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
                                        >
                                            <Undo2 className="h-4 w-4" />
                                            Mark as active
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
                            <nav className="flex justify-center pt-4" aria-label="Completed todos pagination">
                                <ul className="flex flex-wrap items-center gap-2 text-sm">
                                    {paginationLinks.map((link, index) => (
                                        <li key={`${link.label}-${index}`}>
                                            {link.url ? (
                                                <Link
                                                    href={link.url}
                                                    preserveScroll
                                                    preserveState
                                                    className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition ${
                                                        link.active
                                                            ? 'bg-emerald-600 text-white shadow-sm'
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
        </AppLayout>
    );
}
