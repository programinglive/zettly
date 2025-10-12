import React, { useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { Filter } from 'lucide-react';

import AppLayout from '../Layouts/AppLayout';
import KanbanBoard from '../Components/KanbanBoard';

export default function Dashboard({ todos, stats, filters = { tags: [] }, availableTags = [] }) {
    const selectedTagIds = useMemo(
        () => (filters?.tags ?? []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)),
        [filters]
    );

    const handleTagFilterToggle = (tagId) => {
        let nextTags;

        if (tagId === null) {
            nextTags = [];
        } else if (selectedTagIds.includes(tagId)) {
            nextTags = selectedTagIds.filter((id) => id !== tagId);
        } else {
            nextTags = [...selectedTagIds, tagId];
        }

        nextTags = nextTags.map((id) => Number(id)).filter((id) => !Number.isNaN(id));

        router.get(
            '/dashboard',
            { tags: nextTags },
            {
                preserveScroll: true,
                preserveState: true,
            }
        );
    };

    const filterDescription = useMemo(() => {
        if (!selectedTagIds.length) {
            return 'All tags';
        }

        if (!availableTags.length) {
            return `${selectedTagIds.length} tag${selectedTagIds.length === 1 ? '' : 's'}`;
        }

        const names = availableTags
            .filter((tag) => selectedTagIds.includes(tag.id))
            .map((tag) => tag.name);

        return names.length ? names.join(', ') : `${selectedTagIds.length} tag${selectedTagIds.length === 1 ? '' : 's'}`;
    }, [selectedTagIds, availableTags]);

    return (
        <AppLayout title="Dashboard">
            <div className="max-w-6xl mx-auto">
                <Head title="Dashboard" />
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
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 shadow-sm">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <Filter className="w-4 h-4" />
                                <span className="text-sm font-medium">Tag Filters</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{filterDescription}</span>
                            </div>
                            {selectedTagIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleTagFilterToggle(null)}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {availableTags.length === 0 ? (
                                <span className="text-xs text-gray-500 dark:text-gray-400">No tags yet</span>
                            ) : (
                                availableTags.map((tag) => {
                                    const isActive = selectedTagIds.includes(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => handleTagFilterToggle(tag.id)}
                                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                                isActive
                                                    ? 'border-transparent bg-black text-white dark:bg-white dark:text-black'
                                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            <span
                                                className="inline-block h-2 w-2 rounded-full"
                                                style={{ backgroundColor: tag.color || '#3B82F6' }}
                                            />
                                            {tag.name}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <KanbanBoard todos={todos} />
            </div>
        </AppLayout>
    );
}
