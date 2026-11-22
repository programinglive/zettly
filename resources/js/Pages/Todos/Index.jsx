import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    CheckCircle,
    Circle,
    Plus,
    Edit,
    Trash2,
    X,
    Search,
    SlidersHorizontal,
    FolderKanban,
    Calendar,
    ChevronDown,
    ExternalLink,
    Target,
    ListChecks,
    Link2,
    Inbox,
} from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import ConfirmationModal from '../../Components/ConfirmationModal';
import CompletionReasonDialog from '../../Components/CompletionReasonDialog';
import SanitizedHtml from '../../Components/SanitizedHtml';
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
        .replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g, '$1$2')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*>\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const getDescriptionPreview = (raw, limit = 105) => {
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
    if (!value) return null;
    const localDate = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(localDate.getTime())) return localDate;
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatDueDateLabel = (value) => {
    const parsed = parseDateOnly(value);
    if (!parsed) return null;
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatFullDate = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
    filter = 'pending',
    selectedTag = null,
    filters = {},
}) {
    const isPaginated = !!(todos && todos.data);
    const todosData = isPaginated ? todos.data : (Array.isArray(todos) ? todos : []);
    const currentPage = isPaginated ? (todos.current_page ?? 1) : 1;
    const nextPageUrl = isPaginated ? todos.next_page_url : null;

    const activeFilter = filters.filter ?? filter ?? 'pending';
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
        activeTag
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
            if (k === 'filter' && v === 'pending') {
                return;
            }
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
        () => filterAndSortTodos(todosData, activeFilter === 'all' ? null : activeFilter, false),
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

    // Master-Detail selected task state (auto-selects first task like an email client)
    const [selectedTodoId, setSelectedTodoId] = useState(() => visibleTodos[0]?.id ?? null);

    useEffect(() => {
        if (visibleTodos.length === 0) {
            setSelectedTodoId(null);
            return;
        }
        const stillExists = visibleTodos.some((t) => t.id === selectedTodoId);
        if (!stillExists) {
            setSelectedTodoId(visibleTodos[0].id);
        }
    }, [visibleTodos, selectedTodoId]);

    const selectedTodo = useMemo(
        () => visibleTodos.find((t) => t.id === selectedTodoId) || visibleTodos[0] || null,
        [visibleTodos, selectedTodoId]
    );

    const selectedTagObj = useMemo(
        () => tags.find((t) => String(t.id) === String(activeTag)) || null,
        [tags, activeTag]
    );

    const resolveProjectBadge = (todo) => {
        const todoTags = Array.isArray(todo?.tags) ? todo.tags : [];
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
        const todoTags = Array.isArray(todo?.tags) ? todo.tags : [];
        return todoTags.filter((t) => !String(t.name || '').toLowerCase().startsWith('proyek:'));
    };

    const statusTabs = [
        { key: 'pending', label: 'Open', count: statusCounts?.open ?? null },
        { key: 'completed', label: 'Completed', count: statusCounts?.completed ?? null },
    ];

    const selectedProjectBadge = selectedTodo ? resolveProjectBadge(selectedTodo) : null;
    const selectedSecondaryTags = selectedTodo ? resolveSecondaryTags(selectedTodo) : [];
    const selectedChecklist = Array.isArray(selectedTodo?.checklist_items) ? selectedTodo.checklist_items : [];
    const selectedRelated = useMemo(() => {
        if (!selectedTodo) return [];
        const out = [
            ...(Array.isArray(selectedTodo.related_todos) ? selectedTodo.related_todos : []),
            ...(Array.isArray(selectedTodo.linked_by_todos) ? selectedTodo.linked_by_todos : []),
        ];
        const seen = new Set();
        return out.filter((item) => {
            if (!item || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    }, [selectedTodo]);

    return (
        <AppLayout title="Tasks">
            <Head title="Tasks" />
            <div className="w-full px-4 sm:px-6 py-4 space-y-3.5">
                {/* Header + Open/Completed Tabs */}
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
                                const isActive = activeFilter === tab.key;

                                return (
                                    <button
                                        key={tab.key}
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

                {/* Single-Row Calm Toolbar */}
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
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
                                    router.get('/todos', activeFilter === 'completed' ? { filter: 'completed' } : {}, { preserveScroll: true, replace: true });
                                }}
                                className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white ml-1"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>

                {/* Email-Style Master-Detail Split View */}
                {visibleTodos.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* Left Master List (~40% on desktop) */}
                        <section className="lg:col-span-5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden">
                            <div className="divide-y divide-gray-100 dark:divide-slate-800/80 lg:max-h-[calc(100vh-205px)] lg:overflow-y-auto">
                                {visibleTodos.map((todo) => {
                                    const isSelected = selectedTodo?.id === todo.id;
                                    const preview = getDescriptionPreview(todo.description);
                                    const dueDateLabel = todo.due_date ? formatDueDateLabel(todo.due_date) : null;
                                    const showDue = Boolean(dueDateLabel && !todo.is_completed);
                                    const overdue = showDue && isOverdue(todo.due_date);
                                    const dueSoon = showDue && !overdue && isDueSoon(todo.due_date);
                                    const projectBadge = resolveProjectBadge(todo);

                                    return (
                                        <div
                                            key={todo.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setSelectedTodoId(todo.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSelectedTodoId(todo.id);
                                                }
                                            }}
                                            className={`group relative flex items-start gap-2.5 px-3.5 py-3 cursor-pointer transition-colors ${
                                                isSelected
                                                    ? 'bg-gray-50 dark:bg-slate-800/80 border-l-2 border-l-gray-900 dark:border-l-white'
                                                    : 'hover:bg-gray-50/70 dark:hover:bg-slate-800/40 border-l-2 border-l-transparent'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggle(todo);
                                                }}
                                                disabled={toggleForm.processing}
                                                aria-label={todo.is_completed ? 'Reopen task' : 'Complete task'}
                                                className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full transition-colors ${
                                                    todo.is_completed
                                                        ? 'text-emerald-600 dark:text-emerald-400'
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
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3
                                                        className={`text-sm font-medium leading-snug line-clamp-2 ${
                                                            todo.is_completed
                                                                ? 'text-gray-600 dark:text-slate-300'
                                                                : 'text-gray-900 dark:text-slate-100'
                                                        }`}
                                                    >
                                                        <span className="hidden lg:inline">{todo.title}</span>
                                                        <Link
                                                            href={`/todos/${todo.id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="lg:hidden hover:underline"
                                                        >
                                                            {todo.title}
                                                        </Link>
                                                    </h3>
                                                    <span className="text-[11px] text-gray-400 dark:text-slate-500 shrink-0 tabular-nums">
                                                        {formatShortDate(todo.created_at)}
                                                    </span>
                                                </div>

                                                {preview && (
                                                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400 line-clamp-1">
                                                        {preview}
                                                    </p>
                                                )}

                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                                                    {projectBadge && (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.5 font-medium text-gray-700 dark:text-slate-300">
                                                            <span
                                                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                                                style={{ backgroundColor: projectBadge.color }}
                                                            />
                                                            {projectBadge.label}
                                                        </span>
                                                    )}

                                                    {!todo.is_completed && todo.priority === 'urgent' && (
                                                        <span className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-200 dark:ring-rose-800/60">
                                                            Urgent
                                                        </span>
                                                    )}

                                                    {showDue && (
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                                                                overdue
                                                                    ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/60 dark:text-red-300'
                                                                    : dueSoon
                                                                        ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                                                                        : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
                                                            }`}
                                                        >
                                                            <Calendar className="w-3 h-3" />
                                                            {overdue ? 'Overdue' : 'Due'} {dueDateLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {hasMore && (
                                    <div className="p-3 text-center">
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
                            </div>
                        </section>

                        {/* Right Reading & Action Pane (~60% on desktop) */}
                        <aside className="hidden lg:flex lg:col-span-7 flex-col rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 lg:sticky lg:top-4 lg:max-h-[calc(100vh-205px)] overflow-hidden">
                            {selectedTodo ? (
                                <>
                                    {/* Sticky Reading Pane Action Bar */}
                                    <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/80 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleToggle(selectedTodo)}
                                                disabled={toggleForm.processing}
                                                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                                                    selectedTodo.is_completed
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300'
                                                        : 'border-gray-200 bg-white text-gray-800 hover:border-gray-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                                                }`}
                                            >
                                                {selectedTodo.is_completed ? (
                                                    <>
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        Completed · Reopen
                                                    </>
                                                ) : (
                                                    <>
                                                        <Circle className="w-3.5 h-3.5" />
                                                        Mark Complete
                                                    </>
                                                )}
                                            </button>

                                            <span className="text-[11px] text-gray-400 dark:text-slate-500 tabular-nums">
                                                #{selectedTodo.id}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <Link
                                                href={`/todos/${selectedTodo.id}/edit`}
                                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 hover:border-gray-400 transition-colors"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                                Edit
                                            </Link>
                                            <Link
                                                href={`/todos/${selectedTodo.id}`}
                                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 hover:border-gray-400 transition-colors"
                                                title="Open full page"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                Full View
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteClick(selectedTodo)}
                                                className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400 transition-colors"
                                                title="Delete task"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Scrollable Reading Body */}
                                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                                        {/* Title & Meta */}
                                        <div className="space-y-3">
                                            <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                                                {selectedTodo.title}
                                            </h2>

                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                {selectedProjectBadge && (
                                                    <button
                                                        type="button"
                                                        onClick={() => navigateWith({ project: selectedProjectBadge.slug })}
                                                        className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 font-medium text-gray-800 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        <span
                                                            className="h-2 w-2 rounded-full shrink-0"
                                                            style={{ backgroundColor: selectedProjectBadge.color }}
                                                        />
                                                        {selectedProjectBadge.label}
                                                    </button>
                                                )}

                                                {selectedTodo.priority && (
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
                                                            selectedTodo.priority === 'urgent'
                                                                ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                                                                : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        {selectedTodo.priority === 'urgent' ? 'Urgent' : 'Not Urgent'}
                                                    </span>
                                                )}

                                                {selectedTodo.importance && (
                                                    <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 font-medium text-blue-700 dark:text-blue-300">
                                                        {selectedTodo.importance === 'important' ? 'Important' : 'Not Important'}
                                                    </span>
                                                )}

                                                {selectedTodo.due_date && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 font-medium text-amber-800 dark:text-amber-300">
                                                        <Calendar className="w-3 h-3" />
                                                        Due {formatFullDate(selectedTodo.due_date)}
                                                    </span>
                                                )}

                                                <span className="text-gray-400 dark:text-slate-500">
                                                    Added {formatFullDate(selectedTodo.created_at)}
                                                </span>
                                            </div>

                                            {selectedTodo.focus && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                                                    <Target className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    <span className="font-medium text-gray-700 dark:text-slate-300">Focus:</span>
                                                    <span className="truncate">{selectedTodo.focus.title}</span>
                                                </div>
                                            )}

                                            {selectedSecondaryTags.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {selectedSecondaryTags.map((tag) => (
                                                        <button
                                                            key={tag.id}
                                                            type="button"
                                                            onClick={() => navigateWith({ tag: tag.id })}
                                                            title={tag.name}
                                                            className="inline-flex items-center rounded-full border border-gray-200 dark:border-slate-700 px-2 py-0.5 text-[11px] text-gray-600 dark:text-slate-400 hover:border-gray-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors"
                                                        >
                                                            {splitTagName(tag.name).value}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Full Rendered Description */}
                                        <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                                            {selectedTodo.description ? (
                                                <SanitizedHtml
                                                    html={selectedTodo.description}
                                                    className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-slate-300 leading-relaxed"
                                                />
                                            ) : (
                                                <p className="text-xs italic text-gray-400 dark:text-slate-500">
                                                    No description added yet. Click Edit to add context or acceptance notes.
                                                </p>
                                            )}
                                        </div>

                                        {/* Checklist Items (if any) */}
                                        {selectedChecklist.length > 0 && (
                                            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
                                                    <ListChecks className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>
                                                        Checklist ({selectedChecklist.filter((i) => i.is_completed).length}/{selectedChecklist.length})
                                                    </span>
                                                </div>
                                                <ul className="space-y-1.5">
                                                    {selectedChecklist.map((item) => (
                                                        <li
                                                            key={item.id}
                                                            className="flex items-start gap-2 text-xs text-gray-700 dark:text-slate-300"
                                                        >
                                                            {item.is_completed ? (
                                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                            ) : (
                                                                <Circle className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 mt-0.5 shrink-0" />
                                                            )}
                                                            <span>{item.title}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Related Tasks (if any) */}
                                        {selectedRelated.length > 0 && (
                                            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
                                                    <Link2 className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>Related ({selectedRelated.length})</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {selectedRelated.map((rel) => (
                                                        <Link
                                                            key={rel.id}
                                                            href={`/todos/${rel.id}`}
                                                            className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:underline"
                                                        >
                                                            <span className="text-gray-400">#{rel.id}</span>
                                                            <span className="truncate">{rel.title}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-gray-400 dark:text-slate-500">
                                    <Inbox className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-xs">Select a task on the left to read its full details.</p>
                                </div>
                            )}
                        </aside>
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-12 text-center">
                        <CheckCircle className="mx-auto w-7 h-7 text-emerald-400" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {hasAnyFilter
                                ? 'No matching tasks'
                                : activeFilter === 'pending'
                                    ? 'All open tasks are clear'
                                    : 'No completed tasks yet'}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            {hasAnyFilter
                                ? 'Try clearing one of your active filters or adjusting your search.'
                                : activeFilter === 'pending'
                                    ? "You're all caught up on active work. Create a new task or review Completed history."
                                    : 'Completed tasks will appear here once you finish them.'}
                        </p>
                        {hasAnyFilter ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchInput('');
                                    router.get('/todos', activeFilter === 'completed' ? { filter: 'completed' } : {}, { preserveScroll: true, replace: true });
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
                                New Todo
                            </Link>
                        )}
                    </div>
                )}
            </div>

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
