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

const normalizeDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isSameDay = (date, comparison) =>
    !!date &&
    !!comparison &&
    date.getFullYear() === comparison.getFullYear() &&
    date.getMonth() === comparison.getMonth() &&
    date.getDate() === comparison.getDate();

const sortTodos = (list) =>
    [...list].sort((a, b) => {
        if (!!a?.is_completed !== !!b?.is_completed) {
            return a?.is_completed ? 1 : -1;
        }

        const createdA = normalizeDate(a?.created_at);
        const createdB = normalizeDate(b?.created_at);

        if (createdA && createdB) {
            return createdB - createdA;
        }

        return 0;
    });

export default function TodosPanel({ todos = [], allTags = [] }) {
    const safeTodos = Array.isArray(todos) ? todos : [];
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTagId, setSelectedTagId] = useState(null);

    const filteredTodos = useMemo(() => {
        const loweredSearch = searchTerm.trim().toLowerCase();

        return safeTodos.filter((todo) => {
            if (!todo || todo.archived) {
                return false;
            }

            const titleMatch = todo.title?.toLowerCase().includes(loweredSearch);
            const descriptionMatch = todo.description
                ? getPreview(todo.description).toLowerCase().includes(loweredSearch)
                : false;

            const matchesSearch = !loweredSearch || titleMatch || descriptionMatch;
            const matchesTag =
                !selectedTagId ||
                (Array.isArray(todo.tags) && todo.tags.some((tag) => tag.id === selectedTagId));

            return matchesSearch && matchesTag;
        });
    }, [safeTodos, searchTerm, selectedTagId]);

    const todayTodos = useMemo(() => {
        const today = new Date();

        return sortTodos(
            filteredTodos.filter((todo) => {
                const createdAt = normalizeDate(todo?.created_at);
                return createdAt && isSameDay(createdAt, today);
            })
        );
    }, [filteredTodos]);

    const recentTodos = useMemo(() => {
        const today = new Date();

        return sortTodos(
            filteredTodos.filter((todo) => {
                const createdAt = normalizeDate(todo?.created_at);
                return createdAt && !isSameDay(createdAt, today);
            })
        ).slice(0, 10);
    }, [filteredTodos]);

    const usedTags = useMemo(() => {
        const tagSet = new Set();

        safeTodos.forEach((todo) => {
            if (Array.isArray(todo?.tags)) {
                todo.tags.forEach((tag) => tagSet.add(tag.id));
            }
        });

        return allTags.filter((tag) => tagSet.has(tag.id));
    }, [safeTodos, allTags]);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Todos</h2>
                    <Link href="/todos/create">
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
                        placeholder="Search todos..."
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
                        {usedTags.map((tag) => (
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
                {/* Today's Todos */}
                {todayTodos.length > 0 && (
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Today</h3>
                        </div>
                        <div className="space-y-2">
                            {todayTodos.map((todo) => (
                                <Link key={todo.id} href={`/todos/${todo.id}`}>
                                    <div className="p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group">
                                        <h4 className={`text-sm font-medium ${
                                            todo.is_completed
                                                ? 'text-gray-500 line-through dark:text-gray-500'
                                                : 'text-gray-900 dark:text-white'
                                        } group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1`}>
                                            {todo.title}
                                        </h4>
                                        {todo.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                {getPreview(todo.description)}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            {(() => {
                                                const createdAt = normalizeDate(todo.created_at);
                                                const status = todo.is_completed ? 'Completed' : 'Pending';
                                                return createdAt
                                                    ? `${status} • ${createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                    : status;
                                            })()}
                                        </p>
                                        {Array.isArray(todo.tags) && todo.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {todo.tags.slice(0, 2).map((tag) => (
                                                    <TagBadge key={tag.id} tag={tag} />
                                                ))}
                                                {todo.tags.length > 2 && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                        +{todo.tags.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Todos */}
                {recentTodos.length > 0 && (
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent</h3>
                        </div>
                        <div className="space-y-2">
                            {recentTodos.map((todo) => (
                                <Link key={todo.id} href={`/todos/${todo.id}`}>
                                    <div className="p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group">
                                        <h4 className={`text-sm font-medium ${
                                            todo.is_completed
                                                ? 'text-gray-500 line-through dark:text-gray-500'
                                                : 'text-gray-900 dark:text-white'
                                        } group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1`}>
                                            {todo.title}
                                        </h4>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            {(() => {
                                                const createdAt = normalizeDate(todo.created_at);
                                                const status = todo.is_completed ? 'Completed' : 'Pending';
                                                return createdAt
                                                    ? `${createdAt.toLocaleDateString()} • ${status}`
                                                    : status;
                                            })()}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {filteredTodos.length === 0 && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No todos match your filters</p>
                        <Link href="/todos/create">
                            <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2">
                                Create your first todo
                            </button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
