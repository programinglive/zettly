import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { CheckCircle, Circle, Plus, Eye, Edit, Trash2, X } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import TagBadge from '../../Components/TagBadge';
import ConfirmationModal from '../../Components/ConfirmationModal';
import CompletionReasonDialog from '../../Components/CompletionReasonDialog';
import filterAndSortTodos from './filterTodos';

const stripHtml = (html) => {
    if (!html) {
        return '';
    }

    if (typeof window !== 'undefined' && window.DOMParser) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }

    return html.replace(/<[^>]*>/g, ' ');
};

const getDescriptionPreview = (html, limit = 120) => {
    const text = stripHtml(html).replace(/\s+/g, ' ').trim();

    if (!text) {
        return '';
    }

    if (text.length <= limit) {
        return text;
    }

    return `${text.slice(0, limit).trim()}…`;
};

const PAGE_CHUNK_SIZE = 8;

const parseDateOnly = (value) => {
    if (!value) {
        return null;
    }

    const localDate = new Date(`${value}T00:00:00`);

    if (!Number.isNaN(localDate.getTime())) {
        return localDate;
    }

    const fallback = new Date(value);

    return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatDueDateLabel = (value) => {
    const parsed = parseDateOnly(value);

    if (!parsed) {
        return null;
    }

    return parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const isOverdue = (value) => {
    const parsed = parseDateOnly(value);

    if (!parsed) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return parsed < today;
};

const isDueSoon = (value, horizonDays = 3) => {
    const parsed = parseDateOnly(value);

    if (!parsed) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + horizonDays);

    return parsed >= today && parsed <= horizon;
};

export default function Index({ todos, tags, filter, selectedTag }) {
    const isPaginated = !!(todos && todos.data);
    const todosData = isPaginated ? todos.data : (Array.isArray(todos) ? todos : []);
    const currentPage = isPaginated ? (todos.current_page ?? 1) : 1;
    const nextPageUrl = isPaginated ? todos.next_page_url : null;
    const toggleForm = useForm({ reason: '' });
    const deleteForm = useForm();
    const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
    const [reasonTodo, setReasonTodo] = useState(null);

    // Confirmation modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [todoToDelete, setTodoToDelete] = useState(null);

    const handleToggle = (todo) => {
        setReasonTodo(todo);
        toggleForm.reset('reason');
        toggleForm.clearErrors();
        setReasonDialogOpen(true);
    };

    const submitToggleReason = (reason) => {
        if (!reasonTodo) {
            return;
        }

        toggleForm.setData('reason', reason);
        toggleForm.post(`/todos/${reasonTodo.id}/toggle`, {
            preserveScroll: true,
            onFinish: () => {
                toggleForm.setData('reason', '');
            },
            onSuccess: () => {
                setReasonDialogOpen(false);
                setReasonTodo(null);
            },
        });
    };

    const handleDeleteClick = (todo) => {
        setTodoToDelete(todo);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        if (todoToDelete) {
            deleteForm.delete(`/todos/${todoToDelete.id}`);
            setShowDeleteModal(false);
            setTodoToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setTodoToDelete(null);
    };

    const PRIORITY_LABELS = {
        urgent: 'Urgent',
        not_urgent: 'Not Urgent',
    };

    const formatPriorityLabel = (priority) => {
        if (!priority) {
            return '';
        }

        return PRIORITY_LABELS[priority] ?? priority.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const getPriorityStyle = (priority) => {
        const palette = {
            urgent: {
                badgeBg: '#DC2626',
                badgeText: '#FFFFFF',
            },
            not_urgent: {
                badgeBg: '#2563EB',
                badgeText: '#FFFFFF',
            },
            default: {
                badgeBg: '#111827',
                badgeText: '#FFFFFF',
            },
        };

        return palette[priority] ?? palette.default;
    };

    const filteredTodos = useMemo(
        () => filterAndSortTodos(todosData, filter, false),
        [todosData, filter]
    );
    const [accItems, setAccItems] = useState(filteredTodos.slice(0, Math.min(PAGE_CHUNK_SIZE, filteredTodos.length)));
    const appendNextRef = useRef(false);
    const listSignature = JSON.stringify({ filter, tag: selectedTag });
    const sentinelRef = useRef(null);
    const hasMoreServer = !!nextPageUrl;
    const hasMoreLocal = !isPaginated && accItems.length < filteredTodos.length;
    const hasMore = hasMoreServer || hasMoreLocal;

    // Reset/append accumulated items on data or query changes
    useEffect(() => {
        if (appendNextRef.current && isPaginated && currentPage > 1) {
            setAccItems((prev) => [...prev, ...filteredTodos]);
        } else {
            setAccItems(filteredTodos.slice(0, Math.min(PAGE_CHUNK_SIZE, filteredTodos.length)));
        }
        appendNextRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredTodos, isPaginated, currentPage, listSignature]);

    // Intersection observer to auto load more (server: fetch next page; local: grow slice)
    useEffect(() => {
        if (!hasMore) return undefined;
        if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                if (hasMoreServer && nextPageUrl) {
                    appendNextRef.current = true;
                    router.get(nextPageUrl, {}, { preserveScroll: true, preserveState: true, only: ['todos'] });
                } else if (hasMoreLocal) {
                    setAccItems((prev) => filteredTodos.slice(0, Math.min(prev.length + NOTES_PAGE_SIZE, filteredTodos.length)));
                }
            });
        }, { rootMargin: '200px 0px' });

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, hasMoreServer, hasMoreLocal, nextPageUrl, filteredTodos]);

    const visibleTodos = accItems;

    const baseParams = new URLSearchParams();
    if (filter) {
        baseParams.set('filter', filter);
    }
    if (selectedTag) {
        baseParams.set('tag', selectedTag);
    }

    const buildUrl = (params = {}) => {
        const search = new URLSearchParams(baseParams.toString());

        if (params.filter !== undefined) {
            if (params.filter) {
                search.set('filter', params.filter);
            } else {
                search.delete('filter');
            }
        }

        if (params.tag !== undefined) {
            if (params.tag) {
                search.set('tag', params.tag);
            } else {
                search.delete('tag');
            }
        }

        const query = search.toString();
        return query ? `/todos?${query}` : '/todos';
    };

    return (
        <AppLayout title="Todos" contentClassName="w-full px-4 sm:px-6 lg:px-10 xl:px-12">
            <Head title="My Todos" />
            <div className="w-full mx-auto space-y-6 pb-10">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                            My Todos
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Plan, prioritize, and complete your work efficiently.
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <Link
                            href="/todos/create"
                            className="w-full sm:w-auto"
                        >
                            <Button className="w-full gap-2 bg-gray-800 text-white hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600">
                                <Plus className="w-4 h-4" />
                                New Todo
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="space-y-4">
                    {/* Status Filters */}
                    <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {[
                                { key: null, label: 'All' },
                                { key: 'pending', label: 'Pending' },
                                { key: 'completed', label: 'Completed' },
                                { key: 'urgent', label: 'Urgent' },
                                { key: 'not_urgent', label: 'Not Urgent' },
                                { key: 'important', label: 'Important' },
                                { key: 'not_important', label: 'Not Important' },
                            ].map(({ key, label }) => (
                                <Link
                                    key={key || 'all'}
                                    href={buildUrl({ filter: key })}
                                    className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                        filter === key
                                            ? 'bg-black text-white hover:bg-gray-800 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Tag Filters */}
                    {tags && tags.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Filter by Tag
                                </label>
                                {selectedTag && (
                                    <Link
                                        href={buildUrl({ tag: null })}
                                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    >
                                        Clear filter
                                    </Link>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {tags.map(tag => {
                                    const isSelected = selectedTag == tag.id;

                                    return (
                                        <Link
                                            key={tag.id}
                                            href={buildUrl({ tag: tag.id })}
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                                                isSelected
                                                    ? 'bg-gray-800 text-white border-gray-800 ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 dark:bg-gray-700 dark:border-gray-700'
                                                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {tag.name}
                                            {isSelected && (
                                                <X className="w-3 h-3 ml-1" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Todos List */}
                {visibleTodos.length > 0 ? (
                    <div className="[column-fill:_balance] [column-gap:1.25rem] columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
                        {visibleTodos.map((todo) => {
                            const priorityStyle = getPriorityStyle(todo.priority);
                            const descriptionPreview = getDescriptionPreview(todo.description);
                            const dueDateLabel = todo.due_date ? formatDueDateLabel(todo.due_date) : null;
                            const showDueBadge = Boolean(dueDateLabel && !todo.is_completed);
                            const overdue = showDueBadge && isOverdue(todo.due_date);
                            const dueSoon = showDueBadge && !overdue && isDueSoon(todo.due_date);

                            return (
                                <div key={todo.id} className="mb-4" style={{ breakInside: 'avoid' }}>
                                    <article
                                        className={`group relative flex h-full flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-700/70 dark:bg-gray-900/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                                            todo.is_completed ? 'ring-2 ring-green-200/60 dark:ring-green-700/40' : ''
                                        }`}
                                    >
                                        <div className="flex h-full flex-col p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <button
                                                    onClick={() => handleToggle(todo)}
                                                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500 ${
                                                        todo.is_completed
                                                            ? 'border-green-200 bg-green-50 text-green-600 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                            : 'border-white/60 bg-white/90 text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:text-gray-100'
                                                    }`}
                                                    disabled={toggleForm.processing}
                                                >
                                                    {todo.is_completed ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                                </button>
                                                <div className="flex gap-1 text-gray-500 dark:text-gray-400">
                                                    <Link
                                                        href={`/todos/${todo.id}`}
                                                        className="rounded-full p-2 hover:bg-white/60 dark:hover:bg-gray-800/70"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link
                                                        href={`/todos/${todo.id}/edit`}
                                                        className="rounded-full p-2 hover:bg-white/60 dark:hover:bg-gray-800/70"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteClick(todo)}
                                                        className="rounded-full p-2 text-red-500 hover:bg-white/60"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                {todo.is_completed === false && todo.priority && (
                                                    <span
                                                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide"
                                                        style={{
                                                            backgroundColor: priorityStyle.badgeBg,
                                                            color: priorityStyle.badgeText,
                                                        }}
                                                    >
                                                        {formatPriorityLabel(todo.priority)}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                                                    {new Date(todo.created_at).toLocaleDateString()}
                                                </span>
                                                {showDueBadge && (
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${
                                                            overdue
                                                                ? 'bg-red-500 text-white'
                                                                : dueSoon
                                                                    ? 'bg-orange-500 text-white'
                                                                    : 'bg-emerald-500 text-white'
                                                        }`}
                                                    >
                                                        Due {dueDateLabel}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-4 flex-1 space-y-2">
                                                <h3
                                                    className={`text-lg font-semibold leading-snug ${
                                                        todo.is_completed
                                                            ? 'text-gray-500 line-through dark:text-gray-500'
                                                            : 'text-gray-900 dark:text-gray-100'
                                                    }`}
                                                >
                                                    {todo.title}
                                                </h3>
                                                {descriptionPreview && (
                                                    <p
                                                        className={`text-sm leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-2 ${
                                                            todo.is_completed ? 'text-gray-500 dark:text-gray-500' : ''
                                                        }`}
                                                    >
                                                        {descriptionPreview}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mt-4">
                                                {todo.tags && todo.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {todo.tags.map(tag => (
                                                            <TagBadge key={tag.id} tag={tag} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-center py-12">
                            <div className="text-6xl mb-4">📝</div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No todos yet
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Get started by creating your first todo item.
                            </p>
                            <Link href="/todos/create">
                                <button className="inline-flex items-center px-6 py-3 bg-black text-white rounded-md font-semibold text-sm uppercase tracking-widest hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create Your First Todo
                                </button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {hasMore && (
                <div className="flex justify-center pt-6">
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (hasMoreServer && nextPageUrl) {
                                appendNextRef.current = true;
                                router.get(nextPageUrl, {}, { preserveScroll: true, preserveState: true, only: ['todos'] });
                            } else if (hasMoreLocal) {
                                setAccItems((prev) => filteredTodos.slice(0, Math.min(prev.length + PAGE_CHUNK_SIZE, filteredTodos.length)));
                            }
                        }}
                    >
                        Load more todos
                    </Button>
                </div>
            )}

            {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                title="Delete Todo"
                message={`Are you sure you want to delete "${todoToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmButtonVariant="destructive"
                isLoading={deleteForm.processing}
            />
        </AppLayout>
    );
}
