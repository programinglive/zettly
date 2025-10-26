import React, { useMemo, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import { LinkIcon, CheckCircle, Circle } from 'lucide-react';
import SanitizedHtml from './SanitizedHtml';
import TagBadge from './TagBadge';
import { cn } from '../utils';

const stripHtml = (html) => {
    if (!html) return '';
    if (typeof window !== 'undefined' && window.DOMParser) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }
    return html.replace(/<[^>]*>/g, ' ');
};

export default function ContextPanel({ selectedTask = null, linkedTodos = [], className }) {
    const safeLinked = Array.isArray(linkedTodos) ? linkedTodos : [];
    const contentRef = useRef(null);
    const relatedTodos = useMemo(() => {
        if (!selectedTask) return [];
        return safeLinked.filter(t => t.id !== selectedTask.id);
    }, [selectedTask, safeLinked]);

    useEffect(() => {
        if (!selectedTask) return;
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [selectedTask?.id]);

    if (!selectedTask) {
        return null;
    }

    return (
        <div
            ref={contentRef}
            className={cn('flex h-full flex-col gap-6 overflow-y-auto px-6 py-6', className)}
        >
            <header className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                    Context
                </p>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{selectedTask.title}</h2>
                {selectedTask.description && (
                    <SanitizedHtml
                        html={selectedTask.description}
                        className="prose prose-sm text-gray-600 dark:prose-invert dark:text-gray-300 max-w-none"
                    />
                )}
            </header>

            <section className="space-y-4">
                <div className="space-y-2">
                    {/* Priority & Importance */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Priority
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
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

                </div>

                {/* Status */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Status
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                        {selectedTask.is_completed ? (
                            <>
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="font-medium text-green-600 dark:text-green-400">Completed</span>
                            </>
                        ) : (
                            <>
                                <Circle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <span className="font-medium text-gray-600 dark:text-gray-300">Pending</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Created Date */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Created
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(selectedTask.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                </div>

                {Array.isArray(selectedTask.tags) && selectedTask.tags.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Tags
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {selectedTask.tags.map((tag) => (
                                <TagBadge key={tag.id} tag={tag} />
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {relatedTodos.length > 0 && (
                <section>
                    <div className="mb-3 flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Related Tasks ({relatedTodos.length})
                        </p>
                    </div>
                    <div className="space-y-2">
                        {relatedTodos.map((todo) => (
                            <Link key={todo.id} href={`/todos/${todo.id}`}>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-colors hover:border-indigo-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-indigo-500/40">
                                    <div className="flex items-start gap-2">
                                        {todo.is_completed ? (
                                            <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                                        ) : (
                                            <Circle className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                                                {todo.title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {todo.is_completed ? 'Completed' : 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
