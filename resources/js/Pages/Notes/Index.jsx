import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import DashboardLayout from '../../Layouts/DashboardLayout';
import {
    Plus,
    Edit,
    Trash2,
    FileText,
    Search,
    X,
    FolderKanban,
    ArrowUpDown,
    SlidersHorizontal,
    ChevronDown,
    ExternalLink,
    Link2,
} from 'lucide-react';

import { Button } from '../../Components/ui/button';
import ConfirmationModal from '../../Components/ConfirmationModal';
import SanitizedHtml from '../../Components/SanitizedHtml';

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

const getDescriptionPreview = (raw, limit = 110) => {
    const text = stripMarkdown(stripHtml(raw));

    if (!text) {
        return '';
    }

    if (text.length <= limit) {
        return text;
    }

    return `${text.slice(0, limit).trim()}…`;
};

const splitTagName = (name) => {
    const text = String(name || '');
    const index = text.indexOf(':');
    if (index <= 0) return { axis: '', value: text };
    return { axis: text.slice(0, index), value: text.slice(index + 1) };
};

const formatShortDate = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatFullDate = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const AXIS_TITLES = { tipe: 'Type', area: 'Area', sumber: 'Source', other: 'Topic' };
const AXIS_ORDER = ['area', 'tipe', 'sumber', 'other'];

const groupSecondaryTags = (tags) => {
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
};

const PAGE_CHUNK_SIZE = 20;

export default function NotesIndex({
    notes,
    tags = [],
    canonicalProjects = [],
    totalNotes = null,
    selectedTag = null,
    filters = {},
}) {
    const isPaginated = !!(notes && notes.data);
    const notesData = isPaginated ? notes.data : (Array.isArray(notes) ? notes : []);
    const currentPage = isPaginated ? (notes.current_page ?? 1) : 1;
    const nextPageUrl = isPaginated ? notes.next_page_url : null;

    const activeProject = filters.project ?? null;
    const activeTagIds = useMemo(() => {
        if (Array.isArray(filters.tags) && filters.tags.length > 0) {
            return filters.tags.map((id) => Number(id)).filter((id) => id > 0);
        }
        const single = filters.tag ?? selectedTag;
        return single ? [Number(single)].filter((id) => id > 0) : [];
    }, [filters.tags, filters.tag, selectedTag]);
    const activeSearch = filters.q ?? '';
    const activeSort = filters.sort ?? 'updated';

    const [searchInput, setSearchInput] = useState(activeSearch);
    const [tagsOpen, setTagsOpen] = useState(false);

    useEffect(() => {
        setSearchInput(activeSearch);
    }, [activeSearch]);

    const deleteForm = useForm();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);

    const projectMap = useMemo(() => {
        const map = new Map();
        for (const proj of canonicalProjects) {
            map.set(proj.key, proj);
        }
        return map;
    }, [canonicalProjects]);

    const secondaryTagGroups = useMemo(() => groupSecondaryTags(tags), [tags]);

    const selectedTagObjects = useMemo(
        () => activeTagIds
            .map((id) => tags.find((t) => Number(t.id) === id))
            .filter(Boolean),
        [tags, activeTagIds]
    );

    const hasAnyFilter = Boolean(activeSearch || activeProject || activeTagIds.length > 0);

    const buildQueryObject = (overrides = {}) => {
        const next = {
            project: activeProject,
            tags: activeTagIds.length > 0 ? activeTagIds.join(',') : null,
            q: activeSearch || null,
            sort: activeSort !== 'updated' ? activeSort : null,
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
        router.get('/notes', buildQueryObject(overrides), {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const toggleTagFilter = (tagId) => {
        const numericId = Number(tagId);
        const exists = activeTagIds.includes(numericId);
        const nextIds = exists
            ? activeTagIds.filter((id) => id !== numericId)
            : [...activeTagIds, numericId];
        navigateWith({ tags: nextIds.length > 0 ? nextIds.join(',') : null });
    };

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

    const [accNotes, setAccNotes] = useState(notesData);
    const appendNextRef = useRef(false);
    const sentinelRef = useRef(null);
    const listSignature = JSON.stringify({
        project: activeProject,
        tags: activeTagIds,
        q: activeSearch,
        sort: activeSort,
    });

    const hasMoreServer = !!nextPageUrl;
    const hasMoreLocal = !isPaginated && accNotes.length < notesData.length;
    const hasMore = hasMoreServer || hasMoreLocal;

    useEffect(() => {
        if (appendNextRef.current && isPaginated && currentPage > 1) {
            setAccNotes((prev) => [...prev, ...notesData]);
        } else {
            setAccNotes(notesData);
        }
        appendNextRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notesData, isPaginated, currentPage, listSignature]);

    useEffect(() => {
        if (!hasMore) return undefined;
        if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                if (hasMoreServer && nextPageUrl) {
                    appendNextRef.current = true;
                    router.get(nextPageUrl, {}, { preserveScroll: true, preserveState: true, only: ['notes'] });
                } else if (hasMoreLocal) {
                    setAccNotes((prev) => notesData.slice(0, Math.min(prev.length + PAGE_CHUNK_SIZE, notesData.length)));
                }
            });
        }, { rootMargin: '200px 0px' });

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, hasMoreServer, hasMoreLocal, nextPageUrl, notesData]);

    const visibleNotes = accNotes;

    // Master-Detail selected note state (auto-selects first note like /todos & Apple Mail)
    const [selectedNoteId, setSelectedNoteId] = useState(() => visibleNotes[0]?.id ?? null);

    useEffect(() => {
        if (visibleNotes.length === 0) {
            setSelectedNoteId(null);
            return;
        }
        const stillExists = visibleNotes.some((n) => n.id === selectedNoteId);
        if (!stillExists) {
            setSelectedNoteId(visibleNotes[0].id);
        }
    }, [visibleNotes, selectedNoteId]);

    const selectedNote = useMemo(
        () => visibleNotes.find((n) => n.id === selectedNoteId) || visibleNotes[0] || null,
        [visibleNotes, selectedNoteId]
    );

    const handleDeleteClick = (note) => {
        setNoteToDelete(note);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        if (noteToDelete) {
            deleteForm.delete(`/todos/${noteToDelete.id}`);
            setShowDeleteModal(false);
            setNoteToDelete(null);
        }
    };

    const resolveProjectBadge = (note) => {
        const noteTags = Array.isArray(note?.tags) ? note.tags : [];
        const proyekTag = noteTags.find((t) => String(t.name || '').toLowerCase().startsWith('proyek:'));
        if (!proyekTag) return null;
        const slug = String(proyekTag.name).slice('proyek:'.length).toLowerCase();
        const canonical = projectMap.get(slug);
        return {
            slug,
            label: canonical?.label || slug,
            color: canonical?.color || proyekTag.color || '#64748B',
        };
    };

    const resolveTopicTags = (note) => {
        const noteTags = Array.isArray(note?.tags) ? note.tags : [];
        return noteTags.filter((t) => !String(t.name || '').toLowerCase().startsWith('proyek:'));
    };

    const selectedProjectBadge = selectedNote ? resolveProjectBadge(selectedNote) : null;
    const selectedTopicTags = selectedNote ? resolveTopicTags(selectedNote) : [];
    const selectedRelated = useMemo(() => {
        if (!selectedNote) return [];
        const out = [
            ...(Array.isArray(selectedNote.related_todos) ? selectedNote.related_todos : []),
            ...(Array.isArray(selectedNote.linked_by_todos) ? selectedNote.linked_by_todos : []),
        ];
        const seen = new Set();
        return out.filter((item) => {
            if (!item || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    }, [selectedNote]);

    const displayCount = totalNotes !== null ? totalNotes : (isPaginated ? (notes.total ?? visibleNotes.length) : visibleNotes.length);

    return (
        <DashboardLayout title="Notes">
            <Head title="Notes" />
            <div className="w-full px-4 sm:px-6 py-4 space-y-3.5">
                {/* Calm Header */}
                <div className="pb-3 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                            Notes
                        </h1>
                        <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-slate-300 tabular-nums">
                            {displayCount} {displayCount === 1 ? 'note' : 'notes'}
                        </span>
                    </div>
                    <Link
                        href="/todos/create?type=note"
                        className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Note
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
                                placeholder="Search notes by title or content..."
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
                                aria-label="Filter notes by canonical project"
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

                        <div className="relative">
                            <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <select
                                aria-label="Sort notes"
                                value={activeSort}
                                onChange={(e) => navigateWith({ sort: e.target.value === 'updated' ? null : e.target.value })}
                                className="appearance-none rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-7 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600 focus:border-gray-400 focus:outline-none"
                            >
                                <option value="updated">Recently Updated</option>
                                <option value="newest">Newest First</option>
                                <option value="title">Title A–Z</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        </div>

                        {secondaryTagGroups.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setTagsOpen((prev) => !prev)}
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                    tagsOpen || activeTagIds.length > 0
                                        ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Tags</span>
                                {activeTagIds.length > 0 && (
                                    <span className="rounded-full bg-white/20 dark:bg-gray-900/20 px-1.5 text-[10px]">
                                        {activeTagIds.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>

                    {tagsOpen && secondaryTagGroups.length > 0 && (
                        <div className="rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/60 p-3 space-y-2">
                            {secondaryTagGroups.map((group) => (
                                <div key={group.axis} className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 w-14 shrink-0">
                                        {group.label}
                                    </span>
                                    {group.tags.map((tag) => {
                                        const isSelected = activeTagIds.includes(Number(tag.id));
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => toggleTagFilter(tag.id)}
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
                            {selectedTagObjects.map((tag) => {
                                const { axis, value } = splitTagName(tag.name);
                                const prefix = AXIS_TITLES[axis] || 'Tag';
                                return (
                                    <span key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-gray-700 dark:text-slate-200">
                                        {prefix}: {value}
                                        <button type="button" onClick={() => toggleTagFilter(tag.id)} aria-label={`Remove ${value} filter`}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                );
                            })}
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
                                    router.get('/notes', {}, { preserveScroll: true, replace: true });
                                }}
                                className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white ml-1"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>

                {/* Email-Style Master-Detail Split View */}
                {visibleNotes.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* Left Master Note List (~40% on desktop) */}
                        <section className="lg:col-span-5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden">
                            <div className="divide-y divide-gray-100 dark:divide-slate-800/80 lg:max-h-[calc(100vh-205px)] lg:overflow-y-auto">
                                {visibleNotes.map((note) => {
                                    const isSelected = selectedNote?.id === note.id;
                                    const preview = getDescriptionPreview(note.description);
                                    const projectBadge = resolveProjectBadge(note);
                                    const topicTags = resolveTopicTags(note).slice(0, 2);

                                    return (
                                        <div
                                            key={note.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setSelectedNoteId(note.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSelectedNoteId(note.id);
                                                }
                                            }}
                                            className={`group relative px-3.5 py-3 cursor-pointer transition-colors ${
                                                isSelected
                                                    ? 'bg-gray-50 dark:bg-slate-800/80 border-l-2 border-l-gray-900 dark:border-l-white'
                                                    : 'hover:bg-gray-50/70 dark:hover:bg-slate-800/40 border-l-2 border-l-transparent'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-sm font-medium leading-snug text-gray-900 dark:text-slate-100 line-clamp-2">
                                                    <span className="hidden lg:inline">{note.title}</span>
                                                    <Link
                                                        href={`/todos/${note.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="lg:hidden hover:underline"
                                                    >
                                                        {note.title}
                                                    </Link>
                                                </h3>
                                                <span className="text-[11px] text-gray-400 dark:text-slate-500 shrink-0 tabular-nums">
                                                    {formatShortDate(note.updated_at || note.created_at)}
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

                                                {topicTags.map((tag) => (
                                                    <span
                                                        key={tag.id}
                                                        className="inline-flex items-center rounded-full border border-gray-200 dark:border-slate-700 px-2 py-0.5 text-gray-500 dark:text-slate-400"
                                                    >
                                                        {splitTagName(tag.name).value}
                                                    </span>
                                                ))}
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
                                                    router.get(nextPageUrl, {}, { preserveScroll: true, preserveState: true, only: ['notes'] });
                                                } else if (hasMoreLocal) {
                                                    setAccNotes((prev) => notesData.slice(0, Math.min(prev.length + PAGE_CHUNK_SIZE, notesData.length)));
                                                }
                                            }}
                                        >
                                            Load More Notes
                                        </Button>
                                    </div>
                                )}
                                {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}
                            </div>
                        </section>

                        {/* Right Live Reading & Action Pane (~60% on desktop) */}
                        <aside className="hidden lg:flex lg:col-span-7 flex-col rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 lg:sticky lg:top-4 lg:max-h-[calc(100vh-205px)] overflow-hidden">
                            {selectedNote ? (
                                <>
                                    <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/80 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-gray-700 dark:text-slate-300">
                                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                Note
                                            </span>
                                            <span className="text-[11px] text-gray-400 dark:text-slate-500 tabular-nums">
                                                #{selectedNote.id}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <Link
                                                href={`/todos/${selectedNote.id}/edit`}
                                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 hover:border-gray-400 transition-colors"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                                Edit
                                            </Link>
                                            <Link
                                                href={`/todos/${selectedNote.id}`}
                                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 hover:border-gray-400 transition-colors"
                                                title="Open full page"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                Full View
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteClick(selectedNote)}
                                                className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400 transition-colors"
                                                title="Delete note"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                                        <div className="space-y-3">
                                            <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                                                {selectedNote.title}
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

                                                <span className="text-gray-400 dark:text-slate-500">
                                                    Updated {formatFullDate(selectedNote.updated_at || selectedNote.created_at)}
                                                </span>
                                            </div>

                                            {selectedTopicTags.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {selectedTopicTags.map((tag) => (
                                                        <button
                                                            key={tag.id}
                                                            type="button"
                                                            onClick={() => toggleTagFilter(tag.id)}
                                                            title={tag.name}
                                                            className="inline-flex items-center rounded-full border border-gray-200 dark:border-slate-700 px-2 py-0.5 text-[11px] text-gray-600 dark:text-slate-400 hover:border-gray-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors"
                                                        >
                                                            {splitTagName(tag.name).value}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                                            {selectedNote.description ? (
                                                <SanitizedHtml
                                                    html={selectedNote.description}
                                                    className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-slate-300 leading-relaxed"
                                                />
                                            ) : (
                                                <p className="text-xs italic text-gray-400 dark:text-slate-500">
                                                    This note has no body yet. Click Edit to write.
                                                </p>
                                            )}
                                        </div>

                                        {selectedRelated.length > 0 && (
                                            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
                                                    <Link2 className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>Zettelkasten Links ({selectedRelated.length})</span>
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
                                    <FileText className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-xs">Select a note on the left to read its full content.</p>
                                </div>
                            )}
                        </aside>
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-10 text-center">
                        <FileText className="mx-auto w-7 h-7 text-gray-300 dark:text-slate-600" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {hasAnyFilter ? 'No matching notes' : 'No notes yet'}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            {hasAnyFilter
                                ? 'Try clearing your active filters or adjusting your search query.'
                                : 'Your knowledge base is ready. Start capturing permanent notes today.'}
                        </p>
                        {hasAnyFilter ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchInput('');
                                    router.get('/notes', {}, { preserveScroll: true, replace: true });
                                }}
                                className="mt-3 inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                                Reset filters
                            </button>
                        ) : (
                            <Link
                                href="/todos/create?type=note"
                                className="mt-3 inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Create First Note
                            </Link>
                        )}
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setNoteToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                title="Delete Note"
                message={`Are you sure you want to delete "${noteToDelete?.title}"? This permanent action cannot be undone.`}
                confirmText="Delete Permanently"
                confirmButtonVariant="destructive"
                isLoading={deleteForm.processing}
            />
        </DashboardLayout>
    );
}
