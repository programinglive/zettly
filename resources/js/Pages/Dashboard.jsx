import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle, Circle, Plus, Eye, ArrowRight } from 'lucide-react';

import AppLayout from '../Layouts/AppLayout';
import TagBadge from '../Components/TagBadge';
import KanbanBoard from '../Components/KanbanBoard';

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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                        <div className="flex items-center">
                            <div className="text-2xl mr-4">🚨</div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Urgent</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.urgent || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                        <div className="flex items-center">
                            <div className="text-2xl mr-4">🔥</div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">High</p>
                                <p className="text-2xl font-bold text-red-500 dark:text-red-300">{stats.high || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kanban Board */}
                <KanbanBoard todos={todos} />
            </div>
        </AppLayout>
    );
}
