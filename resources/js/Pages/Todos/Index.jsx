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
        if (!filter || filter === 'all') return todos;
        return todos.filter(todo =>
            filter === 'completed' ? todo.is_completed : !todo.is_completed
        );
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
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredTodos.map((todo) => (
                            <div key={todo.id} className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-500 transition-all duration-200 overflow-hidden">
                                <div className="p-6">
                                    {/* Header with status and priority */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleToggle(todo)}
                                                className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                                    todo.is_completed
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                                }`}
                                            >
                                                {todo.is_completed ? (
                                                    <CheckCircle className="w-5 h-5" />
                                                ) : (
                                                    <Circle className="w-5 h-5" />
                                                )}
                                            </button>
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                todo.is_completed
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                                            }`}>
                                                {todo.is_completed ? 'Completed' : 'Pending'}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(todo.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className={`text-lg font-semibold mb-2 transition-colors ${
                                        todo.is_completed
                                            ? 'text-gray-500 dark:text-gray-400 line-through'
                                            : 'text-gray-900 dark:text-gray-100 group-hover:text-black dark:group-hover:text-white'
                                    }`}>
                                        {todo.title}
                                    </h3>

                                    {/* Description */}
                                    {todo.description && (
                                        <p className={`text-sm mb-4 leading-relaxed ${
                                            todo.is_completed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'
                                        }`}>
                                            {todo.description.length > 120
                                                ? `${todo.description.substring(0, 120)}...`
                                                : todo.description
                                            }
                                        </p>
                                    )}

                                    {/* Tags */}
                                    {todo.tags && todo.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {todo.tags.map(tag => (
                                                <TagBadge key={tag.id} tag={tag} />
                                            ))}
                                        </div>
                                    )}

                                    {/* Completion timestamp */}
                                    {todo.is_completed && todo.completed_at && (
                                        <div className="flex items-center text-xs text-green-600 dark:text-green-400 mb-4">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Completed {new Date(todo.completed_at).toLocaleDateString()}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex space-x-2">
                                        <Link href={`/todos/${todo.id}`} className="flex-1">
                                            <button className={`w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-black bg-gray-100 border-gray-200 hover:bg-gray-200 hover:border-gray-300 dark:text-white dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:hover:border-gray-500 transition-colors`}>
                                                <Eye className="w-4 h-4 mr-2" />
                                                View
                                            </button>
                                        </Link>
                                        <Link href={`/todos/${todo.id}/edit`} className="flex-1">
                                            <button className={`w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:hover:border-gray-500 transition-colors`}>
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit
                                            </button>
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteClick(todo)}
                                            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 transition-colors"
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
