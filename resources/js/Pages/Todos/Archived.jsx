import React from 'react';
import { Head, Link } from '@inertiajs/react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import TagBadge from '../../Components/TagBadge';
import SanitizedHtml from '../../Components/SanitizedHtml';

export default function Archived({ todos }) {
    return (
        <AppLayout>
            <Head title="Archived Todos" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-xl sm:rounded-lg">
                        <div className="p-6 lg:p-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <Link href="/todos" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                        <ArrowLeft className="w-5 h-5" />
                                    </Link>
                                    <div className="flex items-center space-x-2">
                                        <Archive className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                            Archived Todos
                                        </h1>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {todos.length} archived {todos.length === 1 ? 'todo' : 'todos'}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 lg:p-8">
                            {todos.length === 0 ? (
                                <div className="text-center py-12">
                                    <Archive className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                        No archived todos
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Completed todos that you archive will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {todos.map((todo) => (
                                        <div
                                            key={todo.id}
                                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white line-through">
                                                            {todo.title}
                                                        </h3>
                                                        {todo.priority && (
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                todo.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                                todo.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                                                todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            }`}>
                                                                {todo.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {todo.description && (
                                                        <SanitizedHtml
                                                            className="text-gray-600 dark:text-gray-300 mb-3"
                                                            html={todo.description}
                                                        />
                                                    )}

                                                    {/* Tags */}
                                                    {todo.tags && todo.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {todo.tags.map(tag => (
                                                                <TagBadge key={tag.id} tag={tag} />
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Related Todos */}
                                                    {(todo.related_todos?.length > 0 || todo.linked_by_todos?.length > 0) && (
                                                        <div className="mb-3">
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                                                Related todos: {(todo.related_todos?.length || 0) + (todo.linked_by_todos?.length || 0)}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                                        <div className="flex items-center space-x-1">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>Completed: {new Date(todo.completed_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <Archive className="w-4 h-4" />
                                                            <span>Archived: {new Date(todo.archived_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="ml-4">
                                                    <Link
                                                        href={`/todos/${todo.id}`}
                                                        className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                                                    >
                                                        View Details
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
