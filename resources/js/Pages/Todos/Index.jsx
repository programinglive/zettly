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
                    <h1 className="text-3xl font-bold text-foreground">My Todos</h1>
                    <Link href="/todos/create">
                        <Button>
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
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                            <div key={todo.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 overflow-hidden">
                                <div className="p-6">
                                    {/* Header with status and priority */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleToggle(todo)}
                                                className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                                    todo.is_completed
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
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
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-orange-100 text-orange-800'
                                            }`}>
                                                {todo.is_completed ? 'Completed' : 'Pending'}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(todo.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className={`text-lg font-semibold mb-2 transition-colors ${
                                        todo.is_completed
                                            ? 'text-gray-500 line-through'
                                            : 'text-gray-900 group-hover:text-indigo-600'
                                    }`}>
                                        {todo.title}
                                    </h3>

                                    {/* Description */}
                                    {todo.description && (
                                        <p className={`text-sm mb-4 leading-relaxed ${
                                            todo.is_completed ? 'text-gray-400' : 'text-gray-600'
                                        }`}>
                                            {todo.description.length > 120
                                                ? `${todo.description.substring(0, 120)}...`
                                                : todo.description
                                            }
                                        </p>
                                    )}

                                    {/* Completion timestamp */}
                                    {todo.is_completed && todo.completed_at && (
                                        <div className="flex items-center text-xs text-green-600 mb-4">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Completed {new Date(todo.completed_at).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="px-6 pb-6">
                                    <div className="flex space-x-2">
                                        <Link href={`/todos/${todo.id}`} className="flex-1">
                                            <button className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 hover:border-indigo-300 transition-colors">
                                                <Eye className="w-4 h-4 mr-2" />
                                                View
                                            </button>
                                        </Link>
                                        <Link href={`/todos/${todo.id}/edit`} className="flex-1">
                                            <button className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors">
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
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-center py-12">
                            <div className="text-6xl mb-4">📝</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No todos yet</h3>
                            <p className="text-gray-500 mb-6">Get started by creating your first todo item.</p>
                            <Link href="/todos/create">
                                <button className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md font-semibold text-white text-sm uppercase tracking-widest hover:bg-indigo-500">
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
