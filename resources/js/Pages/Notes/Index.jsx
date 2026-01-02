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
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header Section */}
                <div className="mb-20">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                        <div className="flex-1 space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-4 duration-500">
                                <FileText className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                    Personal Archive
                                </span>
                            </div>
                            <h1 className="text-5xl sm:text-6xl font-black text-gray-900 dark:text-white leading-[1.05] tracking-tight animate-in fade-in slide-in-from-left-4 duration-700 delay-75">
                                My <span className="text-gray-400 dark:text-slate-600 italic">Notes</span>
                            </h1>
                            <p className="text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl animate-in fade-in slide-in-from-left-4 duration-1000 delay-150">
                                Capture ideas, documentation, and reference information in your centralized personal workspace.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
                            <Link href="/todos/create?type=note">
                                <Button className="group relative overflow-hidden rounded-full px-8 py-7 h-auto text-lg font-bold shadow-2xl shadow-gray-200 dark:shadow-none bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-95">
                                    <Plus className="w-5 h-5 mr-2 transition-transform group-hover:rotate-90" />
                                    New Note
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Tags Carousel/Filter Area */}
                    {tags && tags.length > 0 && (
                        <div className="mt-16 pt-8 border-t border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-gray-400" />
                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                                        Filter by Tag
                                    </label>
                                </div>
                                {selectedTag && (
                                    <Link
                                        href={buildUrl({ tag: null })}
                                        className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white hover:opacity-60 transition-opacity flex items-center gap-1"
                                    >
                                        Clear filter <span className="text-lg leading-none">×</span>
                                    </Link>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                                {tags.map((tag) => {
                                    const isSelected = selectedTag == tag.id;

                                    return (
                                        <Link
                                            key={tag.id}
                                            href={buildUrl({ tag: tag.id })}
                                            className={`inline-flex items-center px-5 py-2 rounded-full text-xs font-bold border transition-all duration-300 ${isSelected
                                                ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white shadow-lg'
                                                : 'bg-white text-gray-500 border-gray-100 hover:border-gray-900 hover:text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-400 dark:hover:border-white dark:hover:text-white shadow-sm'
                                                }`}
                                        >
                                            {tag.name}
                                            {isSelected && <span className="ml-2 font-normal opacity-50">×</span>}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Notes Grid */}
                {visibleNotes.length > 0 ? (
                    <div className="[column-fill:_balance] [column-gap:2rem] columns-1 md:columns-2 lg:columns-3 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                        {visibleNotes.map((note) => {
                            const descriptionPreview = getDescriptionPreview(note.description, 200);

                            return (
                                <div key={note.id} className="mb-8 break-inside-avoid-column group">
                                    <article className="relative flex flex-col p-8 rounded-[2.5rem] border transition-all duration-500 bg-white border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-2 hover:border-gray-900/10 dark:bg-slate-900/40 dark:border-slate-800 dark:hover:border-white/20 dark:hover:shadow-none h-full overflow-hidden">
                                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                            <div className="flex items-center gap-1.5">
                                                <Link
                                                    href={`/todos/${note.id}`}
                                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 hover:bg-gray-900 hover:text-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-white dark:hover:text-gray-900 transition-all shadow-sm"
                                                    title="View Note"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/todos/${note.id}/edit`}
                                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 hover:bg-gray-900 hover:text-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-white dark:hover:text-gray-900 transition-all shadow-sm"
                                                    title="Edit Note"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteClick(note)}
                                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 hover:bg-gray-900 hover:text-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-white dark:hover:text-gray-900 transition-all shadow-sm"
                                                    title="Delete Note"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-6">
                                            <div>
                                                <span className="text-[10px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-[0.2em]">
                                                    {new Date(note.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <h3 className="mt-4 text-2xl font-black leading-tight text-gray-900 dark:text-white group-hover:text-gray-500 dark:group-hover:text-slate-300 transition-colors">
                                                    {note.title}
                                                </h3>
                                                {descriptionPreview && (
                                                    <p className="mt-4 text-base leading-relaxed text-gray-500 dark:text-gray-400 font-light line-clamp-6">
                                                        {descriptionPreview}
                                                    </p>
                                                )}
                                            </div>

                                            {note.tags && note.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-4 border-t border-gray-50 dark:border-slate-800/50">
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
                    <div className="py-32 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="inline-flex items-center justify-center w-32 h-32 rounded-[3.5rem] bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 mb-10 shadow-inner group">
                            <FileText className="w-12 h-12 text-gray-200 dark:text-slate-800 transition-transform group-hover:scale-110 duration-500" />
                        </div>
                        <h3 className="text-4xl font-black text-gray-900 dark:text-white mb-6">
                            No notes found
                        </h3>
                        <p className="text-xl text-gray-500 dark:text-gray-400 font-light mb-16 max-w-lg mx-auto leading-relaxed">
                            {selectedTag ? "No notes are currently tagged with this selection. Try clearing the filter or creating a new note with this tag." : "Your personal knowledge base is empty. Start capturing your thoughts and ideas today."}
                        </p>
                        <Link href="/todos/create?type=note">
                            <Button className="rounded-full px-12 py-8 h-auto text-xl font-black shadow-2xl shadow-gray-200 dark:shadow-none bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all hover:scale-105 active:scale-95">
                                <Plus className="w-6 h-6 mr-3" />
                                Create First Note
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {hasMore && (
                <div className="flex justify-center pt-20 pb-32">
                    <Button
                        variant="outline"
                        className="rounded-full px-12 py-7 h-auto text-base font-bold border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 dark:border-slate-800 dark:text-slate-500 dark:hover:border-white dark:hover:text-white transition-all duration-300 shadow-sm"
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
