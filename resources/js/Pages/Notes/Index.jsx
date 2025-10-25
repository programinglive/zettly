import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
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
        <AppLayout title="Notes">
            <Head title="My Notes" />
            <div className="w-full px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 pb-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                            My Notes
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Capture ideas and reference information without worrying about due dates or priorities.
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <Link
                            href="/todos/create?type=note"
                            className="w-full sm:w-auto"
                        >
                            <Button className="w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                                <Plus className="w-4 h-4" />
                                New Note
                            </Button>
                        </Link>
                    </div>
                </div>

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
                            {tags.map((tag) => {
                                const isSelected = selectedTag == tag.id;

                                return (
                                    <Link
                                        key={tag.id}
                                        href={buildUrl({ tag: tag.id })}
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                                            isSelected
                                                ? 'ring-2 ring-offset-2 ring-purple-400 dark:ring-offset-gray-900'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/70'
                                        }`}
                                        style={{
                                            backgroundColor: `${tag.color}20`,
                                            color: tag.color,
                                            border: `1px solid ${tag.color}40`,
                                        }}
                                    >
                                        {tag.name}
                                        {isSelected && <span className="ml-1 text-xs">×</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {visibleNotes.length > 0 ? (
                    <div className="[column-fill:_balance] [column-gap:1.25rem] columns-1 sm:columns-2 xl:columns-3">
                        {visibleNotes.map((note) => {
                            const descriptionPreview = getDescriptionPreview(note.description);

                            return (
                                <div key={note.id} className="mb-4" style={{ breakInside: 'avoid' }}>
                                    <article className="group relative flex h-full flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-700/70 dark:bg-gray-900/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
                                        <div className="flex h-full flex-col p-4">
                                            <div className="flex items-start justify-end gap-2">
                                                <div className="flex gap-1 text-gray-500 dark:text-gray-400">
                                                    <Link
                                                        href={`/todos/${note.id}`}
                                                        className="rounded-full p-2 hover:bg-white/60 dark:hover:bg-gray-800/70"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link
                                                        href={`/todos/${note.id}/edit`}
                                                        className="rounded-full p-2 hover:bg-white/60 dark:hover:bg-gray-800/70"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteClick(note)}
                                                        className="rounded-full p-2 text-red-500 hover:bg-white/60"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                                                    {new Date(note.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div className="mt-4 flex-1 space-y-2">
                                                <h3 className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">
                                                    {note.title}
                                                </h3>
                                                {descriptionPreview && (
                                                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-3">
                                                        {descriptionPreview}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mt-4">
                                                {note.tags && note.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {note.tags.map((tag) => (
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
                            <div className="text-6xl mb-4">🗒️</div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No notes yet
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Capture your first idea by creating a note.
                            </p>
                            <Link href="/todos/create?type=note">
                                <button className="inline-flex items-center px-6 py-3 bg-black text-white rounded-md font-semibold text-sm uppercase tracking-widest hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create Your First Note
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
                                router.get(nextPageUrl, {}, { preserveScroll: true, preserveState: true, only: ['notes'] });
                            } else if (hasMoreLocal) {
                                setAccNotes((prev) => filteredNotes.slice(0, Math.min(prev.length + PAGE_CHUNK_SIZE, filteredNotes.length)));
                            }
                        }}
                    >
                        Load more notes
                    </Button>
                </div>
            )}

            {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                title="Delete Note"
                message={`Are you sure you want to delete "${noteToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmButtonVariant="destructive"
                isLoading={deleteForm.processing}
            />
        </AppLayout>
    );
}
