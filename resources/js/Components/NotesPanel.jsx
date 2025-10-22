import React, { useState, useMemo } from 'react';
import { Link } from '@inertiajs/react';
import { Search, Plus, Calendar, Clock, Tag } from 'lucide-react';
import TagBadge from './TagBadge';

const stripHtml = (html) => {
    if (!html) return '';
    if (typeof window !== 'undefined' && window.DOMParser) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }
    return html.replace(/<[^>]*>/g, ' ');
};

const getPreview = (html, limit = 100) => {
    const text = stripHtml(html).replace(/\s+/g, ' ').trim();
    if (!text || text.length <= limit) return text;
    return `${text.slice(0, limit).trim()}…`;
};

export default function NotesPanel({ notes = [], allTags = [] }) {
    const safeNotes = Array.isArray(notes) ? notes : [];
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTagId, setSelectedTagId] = useState(null);

    const filteredNotes = useMemo(() => {
        return safeNotes.filter(note => {
            const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (note.description && getPreview(note.description).toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesTag = !selectedTagId || (note.tags && note.tags.some(t => t.id === selectedTagId));

            return matchesSearch && matchesTag;
        });
    }, [safeNotes, searchTerm, selectedTagId]);

    const todayNotes = useMemo(() => {
        const today = new Date().toDateString();
        return filteredNotes.filter(note => new Date(note.created_at).toDateString() === today);
    }, [filteredNotes]);

    const recentNotes = useMemo(() => {
        return filteredNotes.filter(note => new Date(note.created_at).toDateString() !== new Date().toDateString()).slice(0, 5);
    }, [filteredNotes]);

    const usedTags = useMemo(() => {
        const tagSet = new Set();
        notes.forEach(note => {
            if (note.tags) {
                note.tags.forEach(tag => tagSet.add(tag.id));
            }
        });
        return allTags.filter(tag => tagSet.has(tag.id));
    }, [safeNotes, allTags]);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notes</h2>
                    <Link href="/todos/create?type=note">
                        <button className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Tag Filter */}
            {usedTags.length > 0 && (
                <div className="px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-1">
                        <button
                            onClick={() => setSelectedTagId(null)}
                            className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                                selectedTagId === null
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            All
                        </button>
                        {usedTags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => setSelectedTagId(tag.id)}
                                className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                                    selectedTagId === tag.id
                                        ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-900'
                                        : 'hover:opacity-80'
                                }`}
                                style={{
                                    backgroundColor: `${tag.color}20`,
                                    color: tag.color,
                                    border: `1px solid ${tag.color}40`,
                                }}
                            >
                                {tag.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Today's Notes */}
                {todayNotes.length > 0 && (
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Today</h3>
                        </div>
                        <div className="space-y-2">
                            {todayNotes.map(note => (
                                <Link key={note.id} href={`/todos/${note.id}`}>
                                    <div className="p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                                            {note.title}
                                        </h4>
                                        {note.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                {getPreview(note.description)}
                                            </p>
                                        )}
                                        {note.tags && note.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {note.tags.slice(0, 2).map(tag => (
                                                    <TagBadge key={tag.id} tag={tag} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Notes */}
                {recentNotes.length > 0 && (
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent</h3>
                        </div>
                        <div className="space-y-2">
                            {recentNotes.map(note => (
                                <Link key={note.id} href={`/todos/${note.id}`}>
                                    <div className="p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                                            {note.title}
                                        </h4>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            {new Date(note.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {filteredNotes.length === 0 && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notes yet</p>
                        <Link href="/todos/create?type=note">
                            <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2">
                                Create your first note
                            </button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
