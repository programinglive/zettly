import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle, Circle, Plus, Eye, ArrowRight } from 'lucide-react';

import AppLayout from '../Layouts/AppLayout';

export default function Dashboard({ todos, stats }) {
    const toggleForm = useForm();

    const handleToggle = (todo) => {
        toggleForm.post(`/todos/${todo.id}/toggle`);
    };

    return (
        <AppLayout title="Dashboard">
            <div className="max-w-6xl mx-auto">
                {/* Welcome Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400">Welcome back! Here's your recent activity.</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                        <div className="flex items-center">
                            <div className="text-2xl mr-4">📝</div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Todos</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                        <div className="flex items-center">
                            <div className="text-2xl mr-4">✅</div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                        <div className="flex items-center">
                            <div className="text-2xl mr-4">⏳</div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.pending}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Todos */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Todos</h2>
                            <div className="flex space-x-3">
                                <Link href="/todos">
                                    <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                        <Eye className="w-4 h-4 mr-2" />
                                        View All
                                    </button>
                                </Link>
                                <Link href="/todos/create">
                                    <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-500 transition-colors">
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Todo
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {todos.length > 0 ? (
                            <div className="space-y-4">
                                {todos.map((todo) => (
                                    <div key={todo.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors">
                                        <div className="flex items-center space-x-3 flex-1">
                                            <button
                                                onClick={() => handleToggle(todo)}
                                                className="flex-shrink-0"
                                            >
                                                {todo.is_completed ? (
                                                    <CheckCircle className="w-6 h-6 text-green-500 dark:text-green-400" />
                                                ) : (
                                                    <Circle className="w-6 h-6 text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400" />
                                                )}
                                            </button>

                                            <div className="flex-1">
                                                <h3 className={`text-sm font-medium ${todo.is_completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                    {todo.title}
                                                </h3>
                                                {todo.description && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-md">
                                                        {todo.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(todo.created_at).toLocaleDateString()}
                                            </span>
                                            <Link href={`/todos/${todo.id}`}>
                                                <button className="inline-flex items-center p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}

                                {todos.length >= 5 && (
                                    <div className="text-center pt-4">
                                        <Link href="/todos">
                                            <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors">
                                                View all todos
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-4">📝</div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No todos yet</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first todo to get started!</p>
                                <Link href="/todos/create">
                                    <button className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-500 transition-colors">
                                        <Plus className="w-5 h-5 mr-2" />
                                        Create Your First Todo
                                    </button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
