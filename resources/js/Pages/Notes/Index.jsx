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
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="flex-1">
                        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                            My Notes
                        </h1>
                        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
                            Capture ideas and reference information without worrying about due dates or priorities.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/todos/create?type=note">
                            <Button className="rounded-full px-6 py-6 h-auto text-base font-semibold transition shadow-sm bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                                <Plus className="w-5 h-5 mr-2" />
                                New Note
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                {tags && tags.length > 0 && (
                    <div className="space-y-4 mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
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
                            {tags.map((tag) => {
                                const isSelected = selectedTag == tag.id;

                                return (
                                    <Link
                                        key={tag.id}
                                        href={buildUrl({ tag: tag.id })}
                                        className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium border transition-all shadow-sm ${isSelected
                                            ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                                            : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300 hover:text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-400 dark:hover:border-slate-700 dark:hover:text-white'
                                            }`}
                                    >
                                        {tag.name}
                                        {isSelected && <span className="ml-2">×</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Notes Grid */}
                {visibleNotes.length > 0 ? (
                    <div className="[column-fill:_balance] [column-gap:1.5rem] columns-1 md:columns-2 lg:columns-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        {visibleNotes.map((note) => {
                            const descriptionPreview = getDescriptionPreview(note.description);

                            return (
                                <div key={note.id} className="mb-6 group">
                                    <article className="relative flex flex-col p-6 rounded-[2rem] border transition-all duration-300 bg-white border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-gray-200 dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-slate-700 h-full">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                                                    Added {new Date(note.created_at).toLocaleDateString()}
                                                </span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/todos/${note.id}`}
                                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 hover:bg-gray-900 hover:text-white dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-white dark:hover:text-gray-900 transition-all shadow-sm"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <Link
                                                        href={`/todos/${note.id}/edit`}
                                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 hover:bg-gray-900 hover:text-white dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-white dark:hover:text-gray-900 transition-all shadow-sm"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteClick(note)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-red-50 bg-red-10 text-red-400 hover:bg-red-500 hover:text-white dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white transition-all shadow-sm"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-xl font-bold leading-tight text-gray-900 dark:text-white">
                                                    {note.title}
                                                </h3>
                                                {descriptionPreview && (
                                                    <p className="mt-2 text-base leading-relaxed text-gray-600 dark:text-gray-400 font-light line-clamp-4">
                                                        {descriptionPreview}
                                                    </p>
                                                )}
                                            </div>

                                            {note.tags && note.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-2">
                                                    {note.tags.map((tag) => (
                                                        <TagBadge key={tag.id} tag={tag} />
                                                    ))}
                                                </div>
                                            )}
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
                            No notes yet
                        </h3>
                        <p className="text-xl text-gray-500 dark:text-gray-400 font-light mb-12 max-w-md mx-auto leading-relaxed">
                            Capture your first idea by creating a note.
                        </p>
                        <Link href="/todos/create?type=note">
                            <Button className="rounded-full px-8 py-7 h-auto text-lg font-bold shadow-xl shadow-gray-200 dark:shadow-none bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all hover:scale-105 active:scale-95">
                                <Plus className="w-6 h-6 mr-2" />
                                Create Your First Note
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
