import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    CheckCircle,
    Circle,
    Plus,
    Eye,
    Edit,
    Trash2,
    X,
    Search,
    SlidersHorizontal,
    FolderKanban,
    Calendar,
    ChevronDown,
} from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
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

export const stripMarkdown = (text) => {
    if (!text) {
        return '';
    }

    return String(text)
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/(^|\s)#{1,6}\s+/gm, '$1')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*>\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const getDescriptionPreview = (raw, limit = 135) => {
    const text = stripMarkdown(stripHtml(raw));

    if (!text) {
        return '';
    }

    if (text.length <= limit) {
        return text;
    }

    return `${text.slice(0, limit).trim()}…`;
};

const PAGE_CHUNK_SIZE = 20;

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
    });
};

const formatShortDate = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const isOverdue = (value) => {
    const parsed = parseDateOnly(value);
    if (!parsed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsed < today;
};

const isDueSoon = (value, horizonDays = 3) => {
    const parsed = parseDateOnly(value);
    if (!parsed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + horizonDays);
    return parsed >= today && parsed <= horizon;
};

/**
 * Splits a tag name into its zettelkasten axis and value.
 */
export function splitTagName(name) {
    const text = String(name || '');
    const index = text.indexOf(':');
    if (index <= 0) return { axis: '', value: text };
    return { axis: text.slice(0, index), value: text.slice(index + 1) };
}

const AXIS_TITLES = { proyek: 'Project', tipe: 'Type', area: 'Area', sumber: 'Source' };
const AXIS_ORDER = ['proyek', 'tipe', 'area', 'sumber'];

/**
 * Groups tags by axis, in a fixed order.
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

export default function Index({
    todos,
    tags = [],
    canonicalProjects = [],
    statusCounts = null,
    filter = null,
    selectedTag = null,
    filters = {},
}) {
    const isPaginated = !!(todos && todos.data);
    const todosData = isPaginated ? todos.data : (Array.isArray(todos) ? todos : []);
    const currentPage = isPaginated ? (todos.current_page ?? 1) : 1;
    const nextPageUrl = isPaginated ? todos.next_page_url : null;

    const activeFilter = filters.filter ?? filter ?? null;
    const activeProject = filters.project ?? null;
    const activePriority = filters.priority ?? null;
    const activeImportance = filters.importance ?? null;
    const activeTag = filters.tag ?? selectedTag ?? null;
    const activeSearch = filters.q ?? '';

    const [searchInput, setSearchInput] = useState(activeSearch);
    const [filtersOpen, setFiltersOpen] = useState(false);

    useEffect(() => {
        setSearchInput(activeSearch);
    }, [activeSearch]);

    const toggleForm = useForm({ reason: '' });
    const deleteForm = useForm();
    const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
    const [reasonTodo, setReasonTodo] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [todoToDelete, setTodoToDelete] = useState(null);

    const projectMap = useMemo(() => {
        const map = new Map();
        for (const proj of canonicalProjects) {
            map.set(proj.key, proj);
        }
        return map;
    }, [canonicalProjects]);

    const secondaryTagGroups = useMemo(() => groupTagsByAxis(tags), [tags]);

    const secondaryFilterCount =
        (activePriority ? 1 : 0) +
        (activeImportance ? 1 : 0) +
        (activeTag ? 1 : 0);

    const hasAnyFilter = Boolean(
        activeSearch ||
        activeProject ||
        activePriority ||
        activeImportance ||
        activeTag ||
        (activeFilter && !['pending', 'completed'].includes(activeFilter))
    );

    const buildQueryObject = (overrides = {}) => {
        const next = {
            filter: activeFilter,
            project: activeProject,
            priority: activePriority,
            importance: activeImportance,
            tag: activeTag,
            q: activeSearch || null,
            ...overrides,
        };

        const clean = {};
        Object.entries(next).forEach(([k, v]) => {
            if (v !== null && v !== undefined && String(v).trim() !== '') {
                clean[k] = v;
            }
        });
        return clean;
    };

    const navigateWith = (overrides = {}) => {
        router.get('/todos', buildQueryObject(overrides), {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    // Debounced server-side search
    useEffect(() => {
        const trimmed = searchInput.trim();
        if (trimmed === (activeSearch || '').trim()) {
            return undefined;
        }
        const timer = setTimeout(() => {
            navigateWith({ q: trimmed || null });
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    const handleToggle = (todo) => {
        setReasonTodo(todo);
        toggleForm.reset('reason');
        toggleForm.clearErrors();
        setReasonDialogOpen(true);
    };

    const submitToggleReason = (reason) => {
        if (!reasonTodo) return;

        toggleForm.transform(() => ({ reason }));
        toggleForm.post(`/todos/${reasonTodo.id}/toggle`, {
            preserveScroll: true,
            onFinish: () => {
                toggleForm.reset('reason');
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

    const filteredTodos = useMemo(
        () => filterAndSortTodos(todosData, activeFilter, false),
        [todosData, activeFilter]
    );
    const [accItems, setAccItems] = useState(filteredTodos);
    const appendNextRef = useRef(false);
    const listSignature = JSON.stringify({
        filter: activeFilter,
        project: activeProject,
        priority: activePriority,
        importance: activeImportance,
        tag: activeTag,
        q: activeSearch,
    });
    const sentinelRef = useRef(null);
    const hasMoreServer = !!nextPageUrl;
    const hasMoreLocal = !isPaginated && accItems.length < filteredTodos.length;
    const hasMore = hasMoreServer || hasMoreLocal;

    useEffect(() => {
        if (appendNextRef.current && isPaginated && currentPage > 1) {
            setAccItems((prev) => [...prev, ...filteredTodos]);
        } else {
            setAccItems(filteredTodos);
        }
        appendNextRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredTodos, isPaginated, currentPage, listSignature]);

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
                    setAccItems((prev) => filteredTodos.slice(0, Math.min(prev.length + PAGE_CHUNK_SIZE, filteredTodos.length)));
                }
            });
        }, { rootMargin: '200px 0px' });

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, hasMoreServer, hasMoreLocal, nextPageUrl, filteredTodos]);

    const visibleTodos = accItems;
    const openVisible = useMemo(() => visibleTodos.filter((t) => !t.is_completed), [visibleTodos]);
    const completedVisible = useMemo(() => visibleTodos.filter((t) => t.is_completed), [visibleTodos]);
    const showGroupedSections = !activeFilter && openVisible.length > 0 && completedVisible.length > 0;

    const selectedTagObj = useMemo(
        () => tags.find((t) => String(t.id) === String(activeTag)) || null,
        [tags, activeTag]
    );

    const resolveProjectBadge = (todo) => {
        const todoTags = Array.isArray(todo.tags) ? todo.tags : [];
        const proyekTag = todoTags.find((t) => String(t.name || '').toLowerCase().startsWith('proyek:'));
        if (!proyekTag) return null;
        const slug = String(proyekTag.name).slice('proyek:'.length).toLowerCase();
        const canonical = projectMap.get(slug);
        return {
            slug,
            label: canonical?.label || slug,
            color: canonical?.color || proyekTag.color || '#64748B',
        };
    };

    const resolveSecondaryTags = (todo) => {
        const todoTags = Array.isArray(todo.tags) ? todo.tags : [];
        return todoTags
            .filter((t) => !String(t.name || '').toLowerCase().startsWith('proyek:'))
            .slice(0, 2);
    };

    const renderTodoRow = (todo) => {
        const preview = getDescriptionPreview(todo.description);
        const dueDateLabel = todo.due_date ? formatDueDateLabel(todo.due_date) : null;
        const showDue = Boolean(dueDateLabel && !todo.is_completed);
        const overdue = showDue && isOverdue(todo.due_date);
        const dueSoon = showDue && !overdue && isDueSoon(todo.due_date);
        const projectBadge = resolveProjectBadge(todo);
        const secondaryTags = resolveSecondaryTags(todo);

        return (
            <article
                key={todo.id}
                className={`group flex items-start gap-3 px-3.5 py-2.5 transition-colors border-b last:border-b-0 border-gray-100 dark:border-slate-800/80 ${
                    todo.is_completed
                        ? 'bg-gray-50/40 dark:bg-slate-900/20 hover:bg-gray-50 dark:hover:bg-slate-900/50'
                        : 'bg-white dark:bg-slate-900/60 hover:bg-gray-50/70 dark:hover:bg-slate-800/50'
                }`}
            >
                <button
                    type="button"
                    onClick={() => handleToggle(todo)}
                    disabled={toggleForm.processing}
                    aria-label={todo.is_completed ? 'Mark task open' : 'Mark task complete'}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
                        todo.is_completed
                            ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                            : 'text-gray-300 dark:text-slate-600 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    {todo.is_completed ? (
                        <CheckCircle className="w-4 h-4" />
                    ) : (
                        <Circle className="w-4 h-4" />
                    )}
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                            href={`/todos/${todo.id}`}
                            className={`text-sm font-medium leading-snug hover:underline ${
                                todo.is_completed
                                    ? 'text-gray-500 line-through dark:text-slate-500'
                                    : 'text-gray-900 dark:text-slate-100'
                            }`}
                        >
                            {todo.title}
                        </Link>

                        {!todo.is_completed && todo.priority === 'urgent' && (
                            <span className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-200 dark:ring-rose-800/60">
                                Urgent
                            </span>
                        )}

                        {showDue && (
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    overdue
                                        ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800/60'
                                        : dueSoon
                                            ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/60'
                                            : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                            >
                                <Calendar className="w-3 h-3" />
                                {overdue ? 'Overdue' : 'Due'} {dueDateLabel}
                            </span>
                        )}
                    </div>

                    {preview && (
                        <p
                            className={`mt-0.5 text-xs leading-relaxed line-clamp-1 ${
                                todo.is_completed
                                    ? 'text-gray-400 dark:text-slate-500'
                                    : 'text-gray-500 dark:text-slate-400'
                            }`}
                        >
                            {preview}
                        </p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                        {projectBadge && (
                            <button
                                type="button"
                                onClick={() => navigateWith({ project: projectBadge.slug })}
                                className="inline-flex items-center gap-1.5 rounded-full bg-gray-100/90 dark:bg-slate-800 px-2 py-0.5 font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                title={`Filter by ${projectBadge.label}`}
                            >
                                <span
                                    className="h-1.5 w-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: projectBadge.color }}
                                />
                                {projectBadge.label}
                            </button>
                        )}

                        {secondaryTags.map((tag) => {
                            const { value } = splitTagName(tag.name);
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => navigateWith({ tag: tag.id })}
                                    className="inline-flex items-center rounded-full border border-gray-200 dark:border-slate-700 px-2 py-0.5 text-gray-500 dark:text-slate-400 hover:border-gray-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
                                    title={tag.name}
                                >
                                    {value}
                                </button>
                            );
                        })}

                        <span className="text-gray-400 dark:text-slate-500">
                            {formatShortDate(todo.created_at)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <Link
                        href={`/todos/${todo.id}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-white"
                        title="View details"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                        href={`/todos/${todo.id}/edit`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-white"
                        title="Edit task"
                    >
                        <Edit className="w-3.5 h-3.5" />
                    </Link>
                    <button
                        type="button"
                        onClick={() => handleDeleteClick(todo)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        title="Delete task"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </article>
        );
    };

    const statusTabs = [
        { key: 'pending', label: 'Open', count: statusCounts?.open ?? null },
        { key: 'completed', label: 'Completed', count: statusCounts?.completed ?? null },
        { key: null, label: 'All', count: statusCounts?.all ?? null },
    ];

    return (
        <AppLayout title="Tasks">
            <Head title="Tasks" />
            <div className="w-full px-4 sm:px-6 py-4 space-y-4">
                {/* Header + Segmented Status Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-4">
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                            Tasks
                        </h1>

                        <div
                            className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-slate-800/80 p-0.5"
                            role="tablist"
                            aria-label="Task status"
                        >
                            {statusTabs.map((tab) => {
                                const isActive =
                                    tab.key === null
                                        ? !activeFilter || !['pending', 'completed'].includes(activeFilter)
                                        : activeFilter === tab.key;

                                return (
                                    <button
                                        key={tab.label}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => navigateWith({ filter: tab.key })}
                                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                            isActive
                                                ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm'
                                                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        {tab.count !== null && (
                                            <span
                                                className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums ${
                                                    isActive
                                                        ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
                                                        : 'text-gray-400 dark:text-slate-500'
                                                }`}
                                            >
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <Link
                        href="/todos/create"
                        className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Todo
                    </Link>
                </div>

                {/* Single-Row Calm Toolbar: Search + Canonical Project Select + Collapsible Filters */}
                <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Instant Search */}
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        navigateWith({ q: searchInput.trim() || null });
                                    }
                                }}
                                placeholder="Search tasks by title or notes..."
                                className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-7 py-1.5 text-xs text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:border-gray-400 dark:focus:border-slate-500 focus:outline-none focus:ring-0"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchInput('');
                                        navigateWith({ q: null });
                                    }}
                                    aria-label="Clear search"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Canonical Project Selector */}
                        <div className="relative">
                            <FolderKanban className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <select
                                aria-label="Filter by canonical project"
                                value={activeProject || ''}
                                onChange={(e) => navigateWith({ project: e.target.value || null })}
                                className="appearance-none rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-7 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600 focus:border-gray-400 focus:outline-none"
                            >
                                <option value="">All Projects</option>
                                {canonicalProjects.map((proj) => (
                                    <option key={proj.key} value={proj.key}>
                                        {proj.label} ({proj.count})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        </div>

                        {/* Collapsible Secondary Filters */}
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((prev) => !prev)}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                filtersOpen || secondaryFilterCount > 0
                                    ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Filters</span>
                            {secondaryFilterCount > 0 && (
                                <span className="rounded-full bg-white/20 dark:bg-gray-900/20 px-1.5 text-[10px]">
                                    {secondaryFilterCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Collapsible Secondary Filter Panel */}
                    {filtersOpen && (
                        <div className="rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/60 p-3 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                        Priority
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            { key: null, label: 'Any' },
                                            { key: 'urgent', label: 'Urgent' },
                                            { key: 'not_urgent', label: 'Not Urgent' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.label}
                                                type="button"
                                                onClick={() => navigateWith({ priority: opt.key })}
                                                className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors ${
                                                    activePriority === opt.key
                                                        ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                        Importance
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            { key: null, label: 'Any' },
                                            { key: 'important', label: 'Important' },
                                            { key: 'not_important', label: 'Not Important' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.label}
                                                type="button"
                                                onClick={() => navigateWith({ importance: opt.key })}
                                                className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors ${
                                                    activeImportance === opt.key
                                                        ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {secondaryTagGroups.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-slate-800">
                                    {secondaryTagGroups.map((group) => (
                                        <div key={group.axis || 'other'} className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 w-14 shrink-0">
                                                {group.label}
                                            </span>
                                            {group.tags.map((tag) => {
                                                const isSelected = String(activeTag) === String(tag.id);
                                                return (
                                                    <button
                                                        key={tag.id}
                                                        type="button"
                                                        onClick={() => navigateWith({ tag: isSelected ? null : tag.id })}
                                                        title={tag.name}
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${
                                                            isSelected
                                                                ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        {splitTagName(tag.name).value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Active Filter Chips */}
                    {hasAnyFilter && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            {activeProject && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-gray-700 dark:text-slate-200">
                                    Project: {projectMap.get(activeProject)?.label || activeProject}
                                    <button type="button" onClick={() => navigateWith({ project: null })} aria-label="Remove project filter">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {activePriority && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-gray-700 dark:text-slate-200">
                                    Priority: {activePriority.replace('_', ' ')}
                                    <button type="button" onClick={() => navigateWith({ priority: null })} aria-label="Remove priority filter">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {activeImportance && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-gray-700 dark:text-slate-200">
                                    Importance: {activeImportance.replace('_', ' ')}
                                    <button type="button" onClick={() => navigateWith({ importance: null })} aria-label="Remove importance filter">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {selectedTagObj && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-gray-700 dark:text-slate-200">
                                    Tag: {splitTagName(selectedTagObj.name).value}
                                    <button type="button" onClick={() => navigateWith({ tag: null })} aria-label="Remove tag filter">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {activeSearch && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-gray-700 dark:text-slate-200">
                                    Search: “{activeSearch}”
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchInput('');
                                            navigateWith({ q: null });
                                        }}
                                        aria-label="Remove search filter"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchInput('');
                                    router.get('/todos', {}, { preserveScroll: true, replace: true });
                                }}
                                className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white ml-1"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>

                {/* Calm Scannable Task List */}
                {visibleTodos.length > 0 ? (
                    showGroupedSections ? (
                        <div className="space-y-4">
                            <section className="rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60">
                                <div className="px-3.5 py-2 bg-gray-50/80 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">
                                        Open · {openVisible.length}
                                    </span>
                                </div>
                                <div>{openVisible.map(renderTodoRow)}</div>
                            </section>

                            <section className="rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/40">
                                <div className="px-3.5 py-2 bg-gray-50/80 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                        Completed · {completedVisible.length}
                                    </span>
                                </div>
                                <div>{completedVisible.map(renderTodoRow)}</div>
                            </section>
                        </div>
                    ) : (
                        <section className="rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60">
                            {visibleTodos.map(renderTodoRow)}
                        </section>
                    )
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-10 text-center">
                        <Plus className="mx-auto w-7 h-7 text-gray-300 dark:text-slate-600" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {hasAnyFilter ? 'No matching tasks' : 'No tasks yet'}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            {hasAnyFilter
                                ? 'Try clearing one of your active filters or adjusting your search.'
                                : "It looks like you're all caught up. Ready to start something new?"}
                        </p>
                        {hasAnyFilter ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchInput('');
                                    router.get('/todos', {}, { preserveScroll: true, replace: true });
                                }}
                                className="mt-3 inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                                Reset filters
                            </button>
                        ) : (
                            <Link
                                href="/todos/create"
                                className="mt-3 inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Create Your First Todo
                            </Link>
                        )}
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
                        Load more tasks
                    </Button>
                </div>
            )}

            {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}

            <CompletionReasonDialog
                open={reasonDialogOpen}
                onCancel={() => {
                    setReasonDialogOpen(false);
                    setReasonTodo(null);
                }}
                onSubmit={submitToggleReason}
                processing={toggleForm.processing}
                initialState={reasonTodo?.is_completed ? 'completed' : 'pending'}
                targetState={reasonTodo?.is_completed ? 'pending' : 'completed'}
                error={toggleForm.errors.reason}
            />

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setTodoToDelete(null);
                }}
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
