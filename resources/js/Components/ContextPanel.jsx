import React, { useMemo } from 'react';
import { Link } from '@inertiajs/react';
import { LinkIcon, FileText, CheckCircle, Circle } from 'lucide-react';
import SanitizedHtml from './SanitizedHtml';
import TagBadge from './TagBadge';

const stripHtml = (html) => {
    if (!html) return '';
    if (typeof window !== 'undefined' && window.DOMParser) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }
    return html.replace(/<[^>]*>/g, ' ');
};

export default function ContextPanel({ selectedTask = null, linkedTodos = [] }) {
    const safeLinked = Array.isArray(linkedTodos) ? linkedTodos : [];
    const relatedTodos = useMemo(() => {
        if (!selectedTask) return [];
        return safeLinked.filter(t => t.id !== selectedTask.id);
    }, [selectedTask, safeLinked]);

    if (!selectedTask) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 text-center">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Select a task to view context
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Context</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">Task details & relationships</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Task Title */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        {selectedTask.title}
                    </h3>
                    {selectedTask.description && (
                        <SanitizedHtml
                            html={selectedTask.description}
                            className="text-xs text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none"
                        />
                    )}
                </div>

                {/* Metadata */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                    {/* Priority & Importance */}
                    <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Priority</p>
                        <div className="flex gap-2">
                            {selectedTask.priority && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                    style={{
                                        backgroundColor: selectedTask.priority_color + '20',
                                        color: selectedTask.priority_color,
                                    }}>
                                    {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
                                </span>
                            )}
                            {selectedTask.importance && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    selectedTask.importance === 'high'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                    {selectedTask.importance === 'high' ? '⭐ Important' : 'Regular'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</p>
                        <div className="flex items-center gap-2">
                            {selectedTask.is_completed ? (
                                <>
                                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Completed</span>
                                </>
                            ) : (
                                <>
                                    <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Pending</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Created Date */}
                    <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Created</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(selectedTask.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    </div>
                </div>

                {/* Tags */}
                {Array.isArray(selectedTask.tags) && selectedTask.tags.length > 0 && (
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                            {selectedTask.tags.map(tag => (
                                <TagBadge key={tag.id} tag={tag} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Related Tasks */}
                {relatedTodos.length > 0 && (
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <LinkIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Related Tasks ({relatedTodos.length})
                            </p>
                        </div>
                        <div className="space-y-2">
                            {relatedTodos.map(todo => (
                                <Link key={todo.id} href={`/todos/${todo.id}`}>
                                    <div className="p-2 rounded-md bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
                                        <div className="flex items-start gap-2">
                                            {todo.is_completed ? (
                                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                                                    {todo.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {todo.is_completed ? 'Completed' : 'Pending'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
