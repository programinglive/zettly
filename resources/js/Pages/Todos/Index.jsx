import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle, Circle, Plus, Eye, Edit, Trash2, X } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import TagBadge from '../../Components/TagBadge';
import ConfirmationModal from '../../Components/ConfirmationModal';

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

const getDescriptionPreview = (html, limit = 120) => {
    const text = stripHtml(html).replace(/\s+/g, ' ').trim();

    if (!text) {
        return '';
    }

    if (text.length <= limit) {
        return text;
    }

    return `${text.slice(0, limit).trim()}…`;
};

export default function Index({ todos, tags, filter, selectedTag, selectedType }) {
    const type = selectedType ?? 'todo';
    const isNoteView = type === 'note';
    const toggleForm = useForm();
    const deleteForm = useForm();

    // Confirmation modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [todoToDelete, setTodoToDelete] = useState(null);

    const handleToggle = (todo) => {
        toggleForm.post(`/todos/${todo.id}/toggle`);
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

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setTodoToDelete(null);
    };

    const formatPriorityLabel = (priority) => {
        if (!priority) {
            return '';
        }

        return priority.charAt(0).toUpperCase() + priority.slice(1);
    };

    const getPriorityStyle = (priority) => {
        const palette = {
            low: {
                badgeBg: '#10B981',
                badgeText: '#FFFFFF',
            },
            medium: {
                badgeBg: '#F59E0B',
                badgeText: '#FFFFFF',
            },
            high: {
                badgeBg: '#EF4444',
                badgeText: '#FFFFFF',
            },
            urgent: {
                badgeBg: '#DC2626',
                badgeText: '#FFFFFF',
            },
            default: {
                badgeBg: '#111827',
                badgeText: '#FFFFFF',
            },
        };

        return palette[priority] ?? palette.default;
    };

    const getFilteredTodos = () => {
        let filtered;
        if (!filter || filter === 'all' || isNoteView) {
            filtered = todos;
        } else {
            filtered = todos.filter(todo =>
                filter === 'completed' ? todo.is_completed : !todo.is_completed
            );
        }

        if (isNoteView) {
            return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        // Sort todos: pending first, completed last, then by priority
        return filtered.sort((a, b) => {
            if (a.is_completed === b.is_completed) {
                // If both have same completion status, sort by priority first
                const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
                const aPriority = priorityOrder[a.priority] || 2;
                const bPriority = priorityOrder[b.priority] || 2;

                if (aPriority !== bPriority) {
                    return bPriority - aPriority; // Higher priority first
                }

                // If same priority, sort by created_at (newest first)
                return new Date(b.created_at) - new Date(a.created_at);
            }
            // Pending todos (false) come before completed todos (true)
            return a.is_completed - b.is_completed;
        });
    };

    const filteredTodos = getFilteredTodos();

    const baseParams = new URLSearchParams();
    if (!isNoteView && filter) {
        baseParams.set('filter', filter);
    }
    if (selectedTag) {
        baseParams.set('tag', selectedTag);
    }

    const buildUrl = (params = {}) => {
        const search = new URLSearchParams(baseParams.toString());

        const nextType = params.type ?? type;
        if (nextType) {
            search.set('type', nextType);
        }

        if (!isNoteView) {
            if (params.filter !== undefined) {
                if (params.filter) {
                    search.set('filter', params.filter);
                } else {
                    search.delete('filter');
                }
            }
        } else {
            search.delete('filter');
        }

        if (params.tag !== undefined) {
            if (params.tag) {
                search.set('tag', params.tag);
            } else {
                search.delete('tag');
            }
        }

        const query = search.toString();
        return query ? `/todos?${query}` : '/todos';
    };

    return (
        <AppLayout title="Todos">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-10">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                            {isNoteView ? 'My Notes' : 'My Todos'}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isNoteView
                                ? 'Capture ideas and information without due dates or priorities.'
                                : 'Plan, prioritize, and complete your work efficiently.'}
                        </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="flex rounded-md bg-gray-100 dark:bg-gray-800/80 p-1">
                            {[{ value: 'todo', label: 'Todos' }, { value: 'note', label: 'Notes' }].map(option => (
                                <Link
                                    key={option.value}
                                    href={buildUrl({ type: option.value, filter: option.value === 'note' ? null : filter })}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                        type === option.value
                                            ? 'bg-black text-white dark:bg-indigo-500 dark:text-white'
                                            : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white/90'
                                    }`}
                                >
                                    {option.label}
                                </Link>
                            ))}
                        </div>
                        <Link
                            href={`/todos/create${type === 'note' ? '?type=note' : ''}`}
                            className="flex-1 sm:flex-none"
                        >
                            <Button className="w-full bg-black hover:bg-gray-800 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                {isNoteView ? 'New Note' : 'New Todo'}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="space-y-4">
                    {/* Status Filters */}
                    {!isNoteView && (
                        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                {[
                                    { key: null, label: 'All' },
                                    { key: 'pending', label: 'Pending' },
                                    { key: 'completed', label: 'Completed' },
                                    { key: 'high_priority', label: 'High Priority' },
                                    { key: 'low_priority', label: 'Low Priority' },
                                ].map(({ key, label }) => (
                                    <Link
                                        key={key || 'all'}
                                        href={buildUrl({ filter: key })}
                                        className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                            filter === key
                                                ? 'bg-black text-white hover:bg-gray-800 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-400'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tag Filters */}
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
                                {tags.map(tag => {
                                    const isSelected = selectedTag == tag.id;

                                    return (
                                        <Link
                                            key={tag.id}
                                            href={buildUrl({ tag: tag.id })}
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                                                isSelected
                                                    ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/70'
                                            }`}
                                            style={{
                                                backgroundColor: `${tag.color}20`,
                                                color: tag.color,
                                                border: `1px solid ${tag.color}40`,
                                            }}
                                        >
                                            {tag.name}
                                            {isSelected && (
                                                <X className="w-3 h-3 ml-1" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Todos List */}
                {filteredTodos.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredTodos.map((todo) => {
                            const priorityStyle = getPriorityStyle(todo.priority);
                            const descriptionPreview = getDescriptionPreview(todo.description);

                            return (
                                <div
                                    key={todo.id}
                                    className={`group relative aspect-square rounded-2xl border border-gray-200 bg-white dark:border-gray-700/70 dark:bg-gray-900/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                                        todo.is_completed ? 'ring-2 ring-green-200/60 dark:ring-green-700/40' : ''
                                    }`}
                                >
                                    <div className="flex h-full flex-col p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <button
                                                onClick={() => handleToggle(todo)}
                                                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                                                    todo.is_completed
                                                        ? 'border-green-200 bg-green-50 text-green-600 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'border-white/60 bg-white/90 text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:text-gray-100'
                                                }`}
                                                disabled={toggleForm.processing}
                                            >
                                                {todo.is_completed ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                            </button>
                                            <div className="flex gap-1 text-gray-500 dark:text-gray-400">
                                                <Link
                                                    href={`/todos/${todo.id}`}
                                                    className="rounded-full p-2 hover:bg-white/60 dark:hover:bg-gray-800/70"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/todos/${todo.id}/edit`}
                                                    className="rounded-full p-2 hover:bg-white/60 dark:hover:bg-gray-800/70"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteClick(todo)}
                                                    className="rounded-full p-2 text-red-500 hover:bg-white/60"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {todo.priority && !isNoteView && (
                                                <span
                                                    className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide"
                                                    style={{
                                                        backgroundColor: priorityStyle.badgeBg,
                                                        color: priorityStyle.badgeText,
                                                    }}
                                                >
                                                    {formatPriorityLabel(todo.priority)}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                                                {new Date(todo.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex-1 space-y-2">
                                            <h3
                                                className={`text-lg font-semibold leading-snug ${
                                                    todo.is_completed
                                                        ? 'text-gray-500 line-through dark:text-gray-500'
                                                        : 'text-gray-900 dark:text-gray-100'
                                                }`}
                                            >
                                                {todo.title}
                                            </h3>
                                            {descriptionPreview && (
                                                <p
                                                    className={`text-sm leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-2 ${
                                                        todo.is_completed ? 'text-gray-500 dark:text-gray-500' : ''
                                                    }`}
                                                >
                                                    {descriptionPreview}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-4">
                                            {todo.tags && todo.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {todo.tags.map(tag => (
                                                        <TagBadge key={tag.id} tag={tag} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-center py-12">
                            <div className="text-6xl mb-4">{isNoteView ? '🗒️' : '📝'}</div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                {isNoteView ? 'No notes yet' : 'No todos yet'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                {isNoteView
                                    ? 'Capture your first idea by creating a note.'
                                    : 'Get started by creating your first todo item.'}
                            </p>
                            <Link href={`/todos/create${isNoteView ? '?type=note' : ''}`}>
                                <button className="inline-flex items-center px-6 py-3 bg-black text-white rounded-md font-semibold text-sm uppercase tracking-widest hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors">
                                    <Plus className="w-5 h-5 mr-2" />
                                    {isNoteView ? 'Create Your First Note' : 'Create Your First Todo'}
                                </button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
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
