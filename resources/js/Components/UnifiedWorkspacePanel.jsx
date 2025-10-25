import React, { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';

import TodosPanel from './NotesPanel';
import TagBadge from './TagBadge';

const stripHtml = (html) => {
    if (!html || typeof html !== 'string') {
        return '';
    }

    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const buildNotePreview = (note) => {
    if (!note) {
        return '';
    }

    const plain = stripHtml(note.description);
    return plain.length > 160 ? `${plain.slice(0, 160).trim()}…` : plain;
};

export default function UnifiedWorkspacePanel({
    todos = [],
    notes = [],
    tags = [],
}) {
    const [activeTab, setActiveTab] = useState('todos');

    const noteTagSummary = useMemo(() => {
        const seen = new Map();

        notes.slice(0, 5).forEach((note) => {
            if (!Array.isArray(note?.tags)) {
                return;
            }

            note.tags.forEach((tag) => {
                if (!tag || seen.has(tag.id)) {
                    return;
                }

                seen.set(tag.id, tag);
            });
        });

        return Array.from(seen.values());
    }, [notes]);

    return (
        <div className="flex h-full flex-col gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Workspace</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Focus on tasks or notes without leaving the page.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Link
                            href="/todos/create"
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            New Todo
                        </Link>
                        <Link
                            href="/todos/create?type=note"
                            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 px-3 py-1 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            New Note
                        </Link>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900/60">
                    {[
                        { key: 'todos', label: 'Todos' },
                        { key: 'notes', label: 'Notes' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                                activeTab === tab.key
                                    ? 'bg-white shadow-sm text-gray-900 dark:bg-slate-800 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0">
                {activeTab === 'todos' ? (
                    <TodosPanel
                        todos={todos}
                        allTags={tags}
                        hideCreate
                        subtitle="Filter, search, and jump into your tasks."
                    />
                ) : (
                    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 sm:p-5">
                        <div className="space-y-4 overflow-y-auto pr-1">
                            {notes.length ? (
                                notes.slice(0, 5).map((note) => (
                                    <div
                                        key={note.id}
                                        className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white/90 p-4 shadow-sm transition hover:border-indigo-200 dark:bg-slate-900/50 dark:hover:border-indigo-500/40"
                                    >
                                        <Link
                                            href={`/todos/${note.id}`}
                                            className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-300"
                                        >
                                            {note.title || 'Untitled note'}
                                        </Link>
                                        {note.description && (
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                                {buildNotePreview(note)}
                                            </p>
                                        )}
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {note.created_at ? new Date(note.created_at).toLocaleDateString() : ''}
                                            </span>
                                            {Array.isArray(note.tags) && note.tags.length > 0 && note.tags.slice(0, 3).map((tag) => (
                                                <TagBadge key={tag.id} tag={tag} />
                                            ))}
                                            {Array.isArray(note.tags) && note.tags.length > 3 && (
                                                <span className="text-[11px] text-gray-400 dark:text-gray-500">+{note.tags.length - 3}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/40">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet. Capture your next idea.</p>
                                    <Link
                                        href="/todos/create?type=note"
                                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                                    >
                                        <Plus className="h-4 w-4" />
                                        New Note
                                    </Link>
                                </div>
                            )}
                        </div>

                        {noteTagSummary.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-slate-800">
                                {noteTagSummary.map((tag) => (
                                    <TagBadge key={tag.id} tag={tag} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
