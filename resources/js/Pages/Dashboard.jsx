import React, { useMemo, lazy, Suspense } from 'react';
import { Head, router } from '@inertiajs/react';
import { Filter } from 'lucide-react';

import DashboardLayout from '../Layouts/DashboardLayout';

const KanbanBoard = lazy(() => import('../Components/KanbanBoard'));

export default function Dashboard({
    todos = [],
    stats = { total: 0, completed: 0, pending: 0, urgent: 0, high: 0, archived: 0 },
    filters = { tags: [] },
    availableTags = [],
}) {
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
        <DashboardLayout title="Dashboard">
            <Head title="Dashboard" />
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400">Stay on top of your latest activity.</p>
                </div>

                <div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
                        {[
                            {
                                label: 'Total Todos',
                                value: stats.total,
                                icon: '📝',
                                accent: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200',
                            },
                            {
                                label: 'Completed',
                                value: stats.completed,
                                icon: '✅',
                                accent: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200',
                            },
                            {
                                label: 'Pending',
                                value: stats.pending,
                                icon: '⏳',
                                accent: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-200',
                            },
                            {
                                label: 'Urgent',
                                value: stats.urgent || 0,
                                icon: '🚨',
                                accent: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-200',
                            },
                            {
                                label: 'High',
                                value: stats.high || 0,
                                icon: '🔥',
                                accent: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-200',
                            },
                            {
                                label: 'Archived',
                                value: stats.archived || 0,
                                icon: '🗃️',
                                accent: 'bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-200',
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="rounded-2xl border border-gray-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700/60 dark:bg-gray-900/70"
                            >
                                <div className="flex items-center gap-4 p-4">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl font-medium ${item.accent}`}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</p>
                                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{item.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="bg-white/90 dark:bg-slate-950/70 border border-gray-200 dark:border-slate-800 rounded-lg p-4 mb-6 shadow-sm">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                <Filter className="w-4 h-4" />
                                <span className="text-sm font-medium">Tag Filters</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{filterDescription}</span>
                            </div>
                            {selectedTagIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleTagFilterToggle(null)}
                                    className="text-xs text-indigo-600 dark:text-indigo-300 hover:underline"
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
                                    const baseColor = tag.color || '#3B82F6';

                                    return (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => handleTagFilterToggle(tag.id)}
                                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                                isActive
                                                    ? 'ring-gray-400 dark:ring-offset-gray-900'
                                                    : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                                            }`}
                                            style={{
                                                backgroundColor: baseColor + '20',
                                                color: baseColor,
                                                border: `1px solid ${baseColor}40`,
                                            }}
                                        >
                                            <span
                                                className="inline-block h-2 w-2 rounded-full"
                                                style={{ backgroundColor: baseColor }}
                                            />
                                            {tag.name}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <Suspense
                    fallback={
                        <div className="bg-white/90 dark:bg-slate-950/70 border border-gray-200 dark:border-slate-800 rounded-lg p-12 text-center text-gray-500 dark:text-gray-400">
                            Loading board...
                        </div>
                    }
                >
                    <KanbanBoard todos={todos} />
                </Suspense>
            </div>
        </DashboardLayout>
    );
}
