import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { CheckCircle, Circle, Plus, Eye, Edit, Trash2, X } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import AxisTagBadge from '../../Components/AxisTagBadge';
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

/**
 * Splits a tag name into its zettelkasten axis and value.
 *
 * A tag without a colon is returned with an empty axis so an older free-form
 * name still renders instead of disappearing.
 */
export function splitTagName(name) {
    const text = String(name || '');
    const index = text.indexOf(':');
    if (index <= 0) return { axis: '', value: text };
    return { axis: text.slice(0, index), value: text.slice(index + 1) };
}

/** How each axis is titled in the filter panel; unknown axes keep their name. */
const AXIS_TITLES = { proyek: 'Project', tipe: 'Type', area: 'Area', sumber: 'Source' };
const AXIS_ORDER = ['proyek', 'tipe', 'area', 'sumber'];

/**
 * Groups tags by axis, in a fixed order, so the filter reads the same way every
 * time instead of reshuffling as tags are added.
 */
export function groupTagsByAxis(tags) {
    const buckets = new Map();
    for (const tag of Array.isArray(tags) ? tags : []) {
        if (!tag || !tag.name) continue;
        const { axis } = splitTagName(tag.name);
        const key = axis || 'other';
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(tag);
    }

    const keys = [...AXIS_ORDER.filter((axis) => buckets.has(axis))];
    for (const key of buckets.keys()) {
        if (!keys.includes(key)) keys.push(key);
    }

    return keys.map((axis) => ({
        axis,
        label: AXIS_TITLES[axis] || axis,
        tags: buckets.get(axis).slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

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
            <div className="w-full px-4 sm:px-6 py-4">
                {/* Compact Notion-style Header */}
                <div className="mb-4 pb-3 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-3">
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                            Tasks
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Plan, prioritize, and complete your work efficiently.
                        </p>
                    </div>
                    <Link
                        href="/todos/create"
                        className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Todo
                    </Link>
                </div>

                {/* Compact Filters */}
                <div className="space-y-2.5 mb-4">
                    {/* Status Filters */}
                    <div className="flex flex-wrap gap-1.5">
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
                                className={`whitespace-nowrap px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${filter === key
                                    ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-gray-900'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-400 dark:hover:border-slate-600 dark:hover:text-white'
                                    }`}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Tag Filters, grouped by zettelkasten axis */}
                    {tags && tags.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Filter by Tag
                                </label>
                                {selectedTag && (
                                    <Link
                                        href={buildUrl({ tag: null })}
                                        className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                                    >
                                        Clear filter
                                    </Link>
                                )}
                            </div>
                            {groupTagsByAxis(tags).map((group) => (
                                <div key={group.axis || 'other'} className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 w-16 shrink-0">
                                        {group.label}
                                    </span>
                                    {group.tags.map(tag => {
                                        const isSelected = selectedTag == tag.id;

                                        return (
                                            <Link
                                                key={tag.id}
                                                href={buildUrl({ tag: tag.id })}
                                                title={tag.name}
                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${isSelected
                                                    ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 dark:bg-slate-900 dark:text-gray-400 dark:border-slate-800 dark:hover:border-slate-600 dark:hover:text-white'
                                                    }`}
                                            >
                                                {splitTagName(tag.name).value}
                                                {isSelected && (
                                                    <span className="ml-1.5 text-[10px] uppercase opacity-70">
                                                        selected
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Compact Full-Width Todos List */}
                {visibleTodos.length > 0 ? (
                    <div className="space-y-2">
                        {visibleTodos.map((todo) => {
                            const priorityStyle = getPriorityStyle(todo.priority);
                            const descriptionPreview = getDescriptionPreview(todo.description);
                            const dueDateLabel = todo.due_date ? formatDueDateLabel(todo.due_date) : null;
                            const showDueBadge = Boolean(dueDateLabel && !todo.is_completed);
                            const overdue = showDueBadge && isOverdue(todo.due_date);
                            const dueSoon = showDueBadge && !overdue && isDueSoon(todo.due_date);

                            return (
                                <article
                                    key={todo.id}
                                    className={`group flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-md border transition-colors ${todo.is_completed
                                        ? 'bg-gray-50/50 border-gray-200/70 dark:bg-slate-900/40 dark:border-slate-800/60'
                                        : 'bg-white border-gray-200 hover:border-gray-400 dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-slate-600'
                                        }`}
                                >
                                    {/* Status Toggle */}
                                    <div className="flex-shrink-0">
                                        <button
                                            onClick={() => handleToggle(todo)}
                                            className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${todo.is_completed
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-500 dark:hover:text-white dark:hover:border-white'
                                                }`}
                                            disabled={toggleForm.processing}
                                        >
                                            {todo.is_completed ? (
                                                <CheckCircle className="w-4 h-4" />
                                            ) : (
                                                <Circle className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link href={`/todos/${todo.id}`} className="min-w-0">
                                                <h3
                                                    className={`text-sm font-semibold leading-snug truncate hover:underline ${todo.is_completed
                                                        ? 'text-gray-400 line-through dark:text-slate-600'
                                                        : 'text-gray-900 dark:text-white'
                                                        }`}
                                                >
                                                    {todo.title}
                                                </h3>
                                            </Link>
                                            {todo.is_completed === false && todo.priority && (
                                                <span
                                                    className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                                                    style={{
                                                        backgroundColor: priorityStyle.badgeBg,
                                                    }}
                                                >
                                                    {formatPriorityLabel(todo.priority)}
                                                </span>
                                            )}
                                            {showDueBadge && (
                                                <span
                                                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ${overdue
                                                        ? 'bg-red-500'
                                                        : dueSoon
                                                            ? 'bg-orange-500'
                                                            : 'bg-emerald-500'
                                                        }`}
                                                >
                                                    Due {dueDateLabel}
                                                </span>
                                            )}
                                            <span className="text-[11px] text-gray-400 dark:text-slate-500">
                                                Added {new Date(todo.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {descriptionPreview && (
                                            <p
                                                className={`text-xs leading-relaxed line-clamp-1 ${todo.is_completed ? 'text-gray-400 dark:text-slate-600' : 'text-gray-500 dark:text-gray-400'
                                                    }`}
                                            >
                                                {descriptionPreview}
                                            </p>
                                        )}

                                        {todo.tags && todo.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-0.5">
                                                {todo.tags.map(tag => (
                                                    <AxisTagBadge key={tag.id} tag={tag} />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/todos/${todo.id}`}
                                            className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-900 hover:text-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-white dark:hover:text-gray-900"
                                            title="View details"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Link>
                                        <Link
                                            href={`/todos/${todo.id}/edit`}
                                            className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-900 hover:text-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-white dark:hover:text-gray-900"
                                            title="Edit todo"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteClick(todo)}
                                            className="flex h-7 w-7 items-center justify-center rounded border border-red-100 bg-white text-red-500 hover:bg-red-600 hover:text-white dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
                                            title="Delete todo"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-md border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-10 text-center">
                        <Plus className="mx-auto w-7 h-7 text-gray-300 dark:text-slate-600" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            No todos yet
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            It looks like you're all caught up. Ready to start something new?
                        </p>
                        <Link
                            href="/todos/create"
                            className="mt-3 inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Create Your First Todo
                        </Link>
                    </div>
                )}
            </div>

            {hasMore && (
                <div className="flex justify-center py-6">
                    <Button
                        variant="outline"
                        size="sm"
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
