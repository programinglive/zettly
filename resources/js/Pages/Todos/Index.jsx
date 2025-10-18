import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle, Circle, Plus, Eye, Edit, Trash2, X } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import TagBadge from '../../Components/TagBadge';
import ConfirmationModal from '../../Components/ConfirmationModal';

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
                        <div className="flex rounded-md bg-gray-100 dark:bg-gray-800 p-1">
                            {[{ value: 'todo', label: 'Todos' }, { value: 'note', label: 'Notes' }].map(option => (
                                <Link
                                    key={option.value}
                                    href={buildUrl({ type: option.value, filter: option.value === 'note' ? null : filter })}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                        type === option.value
                                            ? 'bg-black text-white dark:bg-white dark:text-black'
                                            : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
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
                            <Button className="w-full bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black">
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
                                                ? 'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
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
                                {tags.map(tag => (
                                    <Link
                                        key={tag.id}
                                        href={buildUrl({ tag: tag.id })}
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                            selectedTag == tag.id
                                                ? 'text-white ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800'
                                                : 'text-white hover:opacity-80'
                                        }`}
                                        style={{ backgroundColor: tag.color }}
                                    >
                                        {tag.name}
                                        {selectedTag == tag.id && (
                                            <X className="w-3 h-3 ml-1" />
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Todos List */}
                {filteredTodos.length > 0 ? (
                    <div className="space-y-3">
                        {filteredTodos.map((todo) => (
                            <div
                                key={todo.id}
                                className={`group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                                    todo.is_completed ? 'ring-2 ring-green-100 dark:ring-green-900/40' : ''
                                }`}
                            >
                                <div className="flex items-start gap-3 p-4 sm:p-5">
                                    <button
                                        onClick={() => handleToggle(todo)}
                                        className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                                            todo.is_completed
                                                ? 'border-green-200 bg-green-50 text-green-600 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                : 'border-gray-200 bg-white text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-800'
                                        }`}
                                        disabled={toggleForm.processing}
                                    >
                                        {todo.is_completed ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {todo.priority && !isNoteView && (
                                                        <span
                                                            className="inline-flex items-center rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white dark:bg-gray-100 dark:text-gray-900"
                                                            style={{
                                                                backgroundColor:
                                                                    todo.priority === 'low'
                                                                        ? '#10B981'
                                                                        : todo.priority === 'medium'
                                                                            ? '#F59E0B'
                                                                            : todo.priority === 'high'
                                                                                ? '#EF4444'
                                                                                : todo.priority === 'urgent'
                                                                                    ? '#DC2626'
                                                                                    : '#111827',
                                                            }}
                                                        >
                                                            {todo.priority}
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                        {new Date(todo.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <h3
                                                    className={`truncate text-lg font-semibold leading-snug ${
                                                        todo.is_completed
                                                            ? 'text-gray-400 line-through dark:text-gray-500'
                                                            : 'text-gray-900 dark:text-gray-100'
                                                    }`}
                                                >
                                                    {todo.title}
                                                </h3>
                                                {todo.description && (
                                                    <p
                                                        className={`text-sm leading-relaxed text-gray-600 line-clamp-3 dark:text-gray-300 ${
                                                            todo.is_completed ? 'text-gray-400' : ''
                                                        }`}
                                                    >
                                                        {todo.description}
                                                    </p>
                                                )}
                                                {/* Tags */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {todo.tags && todo.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {todo.tags.map(tag => (
                                                                <TagBadge key={tag.id} tag={tag} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-3 text-xs text-gray-400">
                                                <div className="flex gap-2 text-gray-400 dark:text-gray-500">
                                                    <Link href={`/todos/${todo.id}`} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link href={`/todos/${todo.id}/edit`} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteClick(todo)}
                                                        className="rounded-full p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/30"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                                <button className="inline-flex items-center px-6 py-3 bg-black text-white rounded-md font-semibold text-white text-sm uppercase tracking-widest hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors">
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
