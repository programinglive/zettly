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
        <AppLayout title="Todos">
            <Head title="My Todos" />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="flex-1">
                        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                            My Todos
                        </h1>
                        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
                            Plan, prioritize, and complete your work efficiently.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/todos/create">
                            <Button className="rounded-full px-6 py-6 h-auto text-base font-semibold transition shadow-sm bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                                <Plus className="w-5 h-5 mr-2" />
                                New Todo
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="space-y-8 mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                    {/* Status Filters */}
                    <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
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
                                    className={`whitespace-nowrap px-5 py-2 text-sm font-medium rounded-full transition-all shadow-sm ${filter === key
                                        ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-gray-900'
                                        : 'bg-white border border-gray-100 text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-400 dark:hover:border-slate-700 dark:hover:text-white'
                                        }`}
                                >
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Tag Filters */}
                    {tags && tags.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                                    Filter by Tag
                                </label>
                                {selectedTag && (
                                    <Link
                                        href={buildUrl({ tag: null })}
                                        className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:text-slate-500 dark:hover:text-white transition-colors"
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
                                            className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium border transition-all shadow-sm ${isSelected
                                                ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                                                : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300 hover:text-gray-900 dark:bg-slate-900 dark:text-gray-400 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:text-white'
                                                }`}
                                        >
                                            {tag.name}
                                            {isSelected && (
                                                <X className="w-3.5 h-3.5 ml-2" />
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
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        {visibleTodos.map((todo) => {
                            const priorityStyle = getPriorityStyle(todo.priority);
                            const descriptionPreview = getDescriptionPreview(todo.description);
                            const dueDateLabel = todo.due_date ? formatDueDateLabel(todo.due_date) : null;
                            const showDueBadge = Boolean(dueDateLabel && !todo.is_completed);
                            const overdue = showDueBadge && isOverdue(todo.due_date);
                            const dueSoon = showDueBadge && !overdue && isDueSoon(todo.due_date);

                            return (
                                <div key={todo.id} className="group">
                                    <article
                                        className={`relative flex flex-col md:flex-row md:items-center gap-6 p-6 rounded-[2rem] border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${todo.is_completed
                                            ? 'bg-gray-50/50 border-gray-100 dark:bg-slate-900/40 dark:border-slate-800/60'
                                            : 'bg-white border-gray-100 shadow-sm hover:border-gray-200 dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-slate-700'
                                            }`}
                                    >
                                        {/* Status Toggle */}
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={() => handleToggle(todo)}
                                                className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300 ${todo.is_completed
                                                    ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:text-gray-900 hover:border-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-500 dark:hover:text-white dark:hover:border-white'
                                                    }`}
                                                disabled={toggleForm.processing}
                                            >
                                                {todo.is_completed ? (
                                                    <CheckCircle className="w-6 h-6 animate-in zoom-in duration-300" />
                                                ) : (
                                                    <Circle className="w-6 h-6" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Main Content */}
                                        <div className="flex-1 min-w-0 space-y-3">
                                            <div className="flex flex-wrap items-center gap-3">
                                                {todo.is_completed === false && todo.priority && (
                                                    <span
                                                        className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white"
                                                        style={{
                                                            backgroundColor: priorityStyle.badgeBg,
                                                        }}
                                                    >
                                                        {formatPriorityLabel(todo.priority)}
                                                    </span>
                                                )}
                                                {showDueBadge && (
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-sm ${overdue
                                                            ? 'bg-red-500'
                                                            : dueSoon
                                                                ? 'bg-orange-500'
                                                                : 'bg-emerald-500'
                                                            }`}
                                                    >
                                                        Due {dueDateLabel}
                                                    </span>
                                                )}
                                                <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                                                    Added {new Date(todo.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div>
                                                <h3
                                                    className={`text-xl font-bold leading-tight truncate ${todo.is_completed
                                                        ? 'text-gray-400 line-through dark:text-slate-600'
                                                        : 'text-gray-900 dark:text-white'
                                                        }`}
                                                >
                                                    {todo.title}
                                                </h3>
                                                {descriptionPreview && (
                                                    <p
                                                        className={`mt-1 text-base leading-relaxed line-clamp-1 ${todo.is_completed ? 'text-gray-400 dark:text-slate-600' : 'text-gray-600 dark:text-gray-400 font-light'
                                                            }`}
                                                    >
                                                        {descriptionPreview}
                                                    </p>
                                                )}
                                            </div>

                                            {todo.tags && todo.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {todo.tags.map(tag => (
                                                        <TagBadge key={tag.id} tag={tag} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <Link
                                                href={`/todos/${todo.id}`}
                                                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 hover:bg-gray-900 hover:text-white dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-white dark:hover:text-gray-900 transition-all shadow-sm"
                                                title="View details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href={`/todos/${todo.id}/edit`}
                                                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 hover:bg-gray-900 hover:text-white dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-white dark:hover:text-gray-900 transition-all shadow-sm"
                                                title="Edit todo"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteClick(todo)}
                                                className="flex h-10 w-10 items-center justify-center rounded-full border border-red-50 bg-red-10 text-red-400 hover:bg-red-500 hover:text-white dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white transition-all shadow-sm"
                                                title="Delete todo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </article>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 mb-8 shadow-inner">
                            <Plus className="w-10 h-10 text-gray-300 dark:text-slate-700" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
                            No todos yet
                        </h3>
                        <p className="text-xl text-gray-500 dark:text-gray-400 font-light mb-12 max-w-md mx-auto leading-relaxed">
                            It looks like you're all caught up. Ready to start something new?
                        </p>
                        <Link href="/todos/create">
                            <Button className="rounded-full px-8 py-7 h-auto text-lg font-bold shadow-xl shadow-gray-200 dark:shadow-none bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all hover:scale-105 active:scale-95">
                                <Plus className="w-6 h-6 mr-2" />
                                Create Your First Todo
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {hasMore && (
                <div className="flex justify-center pt-12 pb-12">
                    <Button
                        variant="outline"
                        className="rounded-full px-10 py-6 h-auto text-base font-semibold border-gray-100 hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-slate-800 dark:hover:border-white dark:hover:bg-white dark:hover:text-gray-900 transition-all duration-300 shadow-sm"
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
