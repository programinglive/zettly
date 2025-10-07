import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle, Circle, Plus, Eye, Edit, Trash2, X } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import TagBadge from '../../Components/TagBadge';
import ConfirmationModal from '../../Components/ConfirmationModal';

export default function Index({ todos, tags, filter, selectedTag }) {
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
        if (!filter || filter === 'all') {
            filtered = todos;
        } else {
            filtered = todos.filter(todo =>
                filter === 'completed' ? todo.is_completed : !todo.is_completed
            );
        }
        
        // Sort todos: pending first, completed last
        return filtered.sort((a, b) => {
            if (a.is_completed === b.is_completed) {
                // If both have same completion status, sort by created_at (newest first)
                return new Date(b.created_at) - new Date(a.created_at);
            }
            // Pending todos (false) come before completed todos (true)
            return a.is_completed - b.is_completed;
        });
    };

    const filteredTodos = getFilteredTodos();

    return (
        <AppLayout title="Todos">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Todos</h1>
                    <Link href="/todos/create">
                        <Button className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black">
                            <Plus className="w-4 h-4 mr-2" />
                            New Todo
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <div className="space-y-4">
                    {/* Status Filters */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: null, label: 'All' },
                            { key: 'pending', label: 'Pending' },
                            { key: 'completed', label: 'Completed' },
                        ].map(({ key, label }) => (
                            <Link
                                key={key || 'all'}
                                href={key ? `/todos?filter=${key}${selectedTag ? `&tag=${selectedTag}` : ''}` : `/todos${selectedTag ? `?tag=${selectedTag}` : ''}`}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    filter === key
                                        ? 'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Tag Filters */}
                    {tags && tags.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Filter by Tag
                                </label>
                                {selectedTag && (
                                    <Link
                                        href={filter ? `/todos?filter=${filter}` : '/todos'}
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
                                        href={`/todos?${filter ? `filter=${filter}&` : ''}tag=${tag.id}`}
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
                            <div key={todo.id} className={`bg-white dark:bg-gray-800 rounded-lg border p-4 hover:shadow-sm transition-all ${
                                todo.is_completed ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'
                            }`}>
                                <div className="flex items-start gap-4">
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => handleToggle(todo)}
                                        className={`mt-1 transition-colors ${
                                            todo.is_completed
                                                ? 'text-green-600 hover:text-green-700'
                                                : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                        disabled={toggleForm.processing}
                                    >
                                        {todo.is_completed ? (
                                            <CheckCircle className="w-5 h-5" />
                                        ) : (
                                            <Circle className="w-5 h-5" />
                                        )}
                                    </button>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className={`font-medium text-base ${
                                                    todo.is_completed
                                                        ? 'text-gray-500 dark:text-gray-400 line-through'
                                                        : 'text-gray-900 dark:text-gray-100'
                                                }`}>
                                                    {todo.title}
                                                </h3>
                                                {todo.description && (
                                                    <p className={`text-sm mt-1 ${
                                                        todo.is_completed ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'
                                                    }`}>
                                                        {todo.description.length > 100
                                                            ? `${todo.description.substring(0, 100)}...`
                                                            : todo.description
                                                        }
                                                    </p>
                                                )}
                                                {/* Tags */}
                                                {todo.tags && todo.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {todo.tags.map(tag => (
                                                            <TagBadge key={tag.id} tag={tag} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 ml-4">
                                                {new Date(todo.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        <Link href={`/todos/${todo.id}`}>
                                            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </Link>
                                        <Link href={`/todos/${todo.id}/edit`}>
                                            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteClick(todo)}
                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-center py-12">
                            <div className="text-6xl mb-4">📝</div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No todos yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">Get started by creating your first todo item.</p>
                            <Link href="/todos/create">
                                <button className="inline-flex items-center px-6 py-3 bg-black text-white rounded-md font-semibold text-white text-sm uppercase tracking-widest hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create Your First Todo
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
