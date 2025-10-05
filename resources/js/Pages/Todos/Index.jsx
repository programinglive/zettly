import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle, Circle, Plus, Eye, Edit, Trash2 } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';

export default function Index({ todos, filter }) {
    const toggleForm = useForm();

    const handleToggle = (todo) => {
        toggleForm.post(`/todos/${todo.id}/toggle`);
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
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            New Todo
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex space-x-2">
                    {[
                        { key: null, label: 'All' },
                        { key: 'pending', label: 'Pending' },
                        { key: 'completed', label: 'Completed' },
                    ].map(({ key, label }) => (
                        <Link
                            key={key || 'all'}
                            href={key ? `/todos?filter=${key}` : '/todos'}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                filter === key
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            {label}
                        </Link>
                    ))}
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
                                            : 'text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
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
                                            <button className={`w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:border-emerald-600 transition-colors`}>
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
                                <button className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-md font-semibold text-white text-sm uppercase tracking-widest hover:bg-emerald-700">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create Your First Todo
                                </button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
