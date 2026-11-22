import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import DashboardLayout from '../../Layouts/DashboardLayout';
import { Plus, Eye, Edit, Trash2, FileText, Hash } from 'lucide-react';

import { Button } from '../../Components/ui/button';
import ConfirmationModal from '../../Components/ConfirmationModal';
import TagBadge from '../../Components/TagBadge';

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

const getDescriptionPreview = (html, limit = 140) => {
    const text = stripHtml(html).replace(/\s+/g, ' ').trim();

    if (!text) {
        return '';
    }

    if (text.length <= limit) {
        return text;
    }

    return `${text.slice(0, limit).trim()}…`;
};

const PAGE_CHUNK_SIZE = 12;

export default function NotesIndex({ notes, tags, selectedTag }) {
    const isPaginated = !!(notes && notes.data);
    const notesData = isPaginated ? notes.data : (Array.isArray(notes) ? notes : []);
    const currentPage = isPaginated ? (notes.current_page ?? 1) : 1;
    const nextPageUrl = isPaginated ? notes.next_page_url : null;

    const deleteForm = useForm();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);

    const filteredNotes = useMemo(() => [...notesData], [notesData]);
    const [accNotes, setAccNotes] = useState(filteredNotes);
    const appendNextRef = useRef(false);
    const sentinelRef = useRef(null);

    const hasMoreServer = !!nextPageUrl;
    const hasMoreLocal = !isPaginated && accNotes.length < filteredNotes.length;
    const hasMore = hasMoreServer || hasMoreLocal;

    useEffect(() => {
        if (appendNextRef.current && isPaginated && currentPage > 1) {
            setAccNotes((prev) => [...prev, ...filteredNotes]);
        } else {
            setAccNotes(filteredNotes.slice(0, PAGE_CHUNK_SIZE));
        }
        appendNextRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredNotes, isPaginated, currentPage, selectedTag]);

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
                    setAccNotes((prev) => filteredNotes.slice(0, Math.min(prev.length + PAGE_CHUNK_SIZE, filteredNotes.length)));
                }
            });
        }, { rootMargin: '200px 0px' });

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, hasMoreServer, hasMoreLocal, nextPageUrl, filteredNotes]);

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

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setNoteToDelete(null);
    };

    const baseParams = new URLSearchParams();
    if (selectedTag) {
        baseParams.set('tag', selectedTag);
    }

    const buildUrl = (params = {}) => {
        const search = new URLSearchParams(baseParams.toString());

        if (params.tag !== undefined) {
            if (params.tag) {
                search.set('tag', params.tag);
            } else {
                search.delete('tag');
            }
        }

        const query = search.toString();
        return query ? `/notes?${query}` : '/notes';
    };

    const visibleNotes = accNotes;

    return (
        <DashboardLayout title="Notes">
            <Head title="My Notes" />
            <div className="w-full px-4 sm:px-6 py-4">
                {/* Compact Notion-style Header */}
                <div className="mb-4 pb-3 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-3">
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                            Notes
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Capture ideas, documentation, and reference information.
                        </p>
                    </div>
                    <Link
                        href="/todos/create?type=note"
                        className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Note
                    </Link>
                </div>

                {/* Compact Tag Filter Bar */}
                {tags && tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mr-1">
                            <Hash className="w-3 h-3" />
                            Tags
                        </span>
                        {tags.map((tag) => {
                            const isSelected = selectedTag == tag.id;

                            return (
                                <Link
                                    key={tag.id}
                                    href={buildUrl({ tag: tag.id })}
                                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${isSelected
                                        ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-400 dark:hover:border-slate-600 dark:hover:text-white'
                                        }`}
                                >
                                    {tag.name}
                                    {isSelected && <span className="ml-1.5 opacity-60">×</span>}
                                </Link>
                            );
                        })}
                        {selectedTag && (
                            <Link
                                href={buildUrl({ tag: null })}
                                className="ml-1 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            >
                                Clear filter
                            </Link>
                        )}
                    </div>
                )}

                {/* Compact Full-Width Notes Grid */}
                {visibleNotes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {visibleNotes.map((note) => {
                            const descriptionPreview = getDescriptionPreview(note.description, 160);

                            return (
                                <article
                                    key={note.id}
                                    className="group relative flex flex-col justify-between p-3 rounded-md border border-gray-200 bg-white hover:border-gray-400 dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-slate-600 transition-colors"
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] text-gray-400 dark:text-slate-500">
                                                {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/todos/${note.id}`}
                                                    className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-900 hover:text-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-white dark:hover:text-gray-900"
                                                    title="View Note"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </Link>
                                                <Link
                                                    href={`/todos/${note.id}/edit`}
                                                    className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-900 hover:text-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-white dark:hover:text-gray-900"
                                                    title="Edit Note"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteClick(note)}
                                                    className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-red-600 hover:text-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-red-600 dark:hover:text-white"
                                                    title="Delete Note"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <Link href={`/todos/${note.id}`} className="block">
                                            <h3 className="text-sm font-semibold leading-snug text-gray-900 dark:text-white group-hover:underline line-clamp-2">
                                                {note.title}
                                            </h3>
                                        </Link>

                                        {descriptionPreview && (
                                            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-3">
                                                {descriptionPreview}
                                            </p>
                                        )}
                                    </div>

                                    {note.tags && note.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-2 mt-2 border-t border-gray-100 dark:border-slate-800/70">
                                            {note.tags.map((tag) => (
                                                <TagBadge key={tag.id} tag={tag} />
                                            ))}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-md border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-10 text-center">
                        <FileText className="mx-auto w-7 h-7 text-gray-300 dark:text-slate-600" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            No notes found
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            {selectedTag ? 'No notes are currently tagged with this selection. Clear the filter or create a new note.' : 'Your knowledge base is empty. Start capturing notes today.'}
                        </p>
                        <Link
                            href="/todos/create?type=note"
                            className="mt-3 inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Create First Note
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
                                router.get(nextPageUrl, {}, { preserveScroll: true, preserveState: true, only: ['notes'] });
                            } else if (hasMoreLocal) {
                                setAccNotes((prev) => filteredNotes.slice(0, Math.min(prev.length + PAGE_CHUNK_SIZE, filteredNotes.length)));
                            }
                        }}
                    >
                        Load More Notes
                    </Button>
                </div>
            )}

            {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
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
