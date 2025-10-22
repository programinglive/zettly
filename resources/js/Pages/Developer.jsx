import React from 'react';
import { Head, Link } from '@inertiajs/react';

import AppLayout from '../Layouts/AppLayout';

export default function Developer() {
    return (
        <AppLayout title="Developer Portal">
            <Head title="Developer Portal" />
            <div className="max-w-5xl mx-auto space-y-12">
                {/* Hero */}
                <section className="text-center space-y-4">
                    <div className="text-5xl">👩‍💻</div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Zettly Developer Portal</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Integrate Zettly features into your applications using our secure REST API.
                    </p>
                </section>

                {/* Getting Started */}
                <section className="bg-white dark:bg-gray-800 shadow rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Authentication</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        Authenticate every request with a personal access token. Generate tokens from the <Link href="/profile" className="text-blue-600 dark:text-blue-400 hover:underline">Profile → API Tokens</Link> section.
                    </p>
                    <div className="bg-gray-900 text-gray-100 font-mono text-sm rounded-xl p-4 overflow-x-auto">
                        <div className="text-emerald-400 mb-2"># Example request header</div>
                        <pre>{`Authorization: Bearer YOUR_TOKEN_HERE`}</pre>
                    </div>
                </section>

                {/* Base URL */}
                <section className="bg-white dark:bg-gray-800 shadow rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Base URL</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">All endpoints are prefixed with:</p>
                    <code className="inline-block bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-4 py-2 rounded text-sm font-mono">
                        https://yourdomain.com/api
                    </code>
                </section>

                {/* Priority System */}
                <section className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 shadow rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">🚀 Priority System</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        New in v0.1.0: Comprehensive 4-level priority system for better task management.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { level: 'Low', color: '#10B981', desc: 'Nice to have' },
                            { level: 'Medium', color: '#F59E0B', desc: 'Should be done' },
                            { level: 'High', color: '#EF4444', desc: 'Important' },
                            { level: 'Urgent', color: '#DC2626', desc: 'Critical' }
                        ].map(({ level, color, desc }) => (
                            <div key={level} className="text-center">
                                <div
                                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm"
                                    style={{ backgroundColor: color }}
                                >
                                    {level.charAt(0)}
                                </div>
                                <div className="font-medium text-gray-900 dark:text-white">{level}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{desc}</div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-gray-900 text-gray-100 font-mono text-sm rounded-xl p-4 overflow-x-auto">
                        <div className="text-emerald-400 mb-2"># Get priority levels</div>
                        <pre>{`GET /api/todos/priorities`}</pre>
                    </div>
                </section>

                {/* Endpoints */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Todos API</h2>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {[
                            {
                                method: 'GET',
                                path: '/todos',
                                summary: 'List todos',
                                description: 'Retrieve a paginated list of todos. Optional query parameters: `filter=completed|pending|high_priority|low_priority`, `priority=low|medium|high|urgent`.'
                            },
                            {
                                method: 'POST',
                                path: '/todos',
                                summary: 'Create todo',
                                description: 'Create a new todo. Send `title` (required), `description` (optional), `priority` (low|medium|high|urgent), and `tag_ids` (array of tag IDs) in the JSON body.'
                            },
                            {
                                method: 'GET',
                                path: '/todos/{id}',
                                summary: 'Get todo',
                                description: 'Fetch a single todo resource by id.'
                            },
                            {
                                method: 'PUT',
                                path: '/todos/{id}',
                                summary: 'Update todo',
                                description: 'Update todo fields. Accepts `title`, `description`, `is_completed`, `priority` (low|medium|high|urgent), and `tag_ids`.'
                            },
                            {
                                method: 'DELETE',
                                path: '/todos/{id}',
                                summary: 'Delete todo',
                                description: 'Remove a todo permanently.'
                            },
                            {
                                method: 'PATCH',
                                path: '/todos/{id}/toggle',
                                summary: 'Toggle status',
                                description: 'Quickly invert the completion status of a todo.'
                            },
                            {
                                method: 'GET',
                                path: '/todos/priorities',
                                summary: 'Get priority levels',
                                description: 'Retrieve all available priority levels with labels and descriptions.'
                            }
                        ].map(({ method, path, summary, description }) => (
                            <article
                                key={`${method}-${path}`}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow"
                            >
                                <header className="flex items-center justify-between mb-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        method === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                        method === 'POST' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                        method === 'PUT' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                        method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                    }`}>
                                        {method}
                                    </span>
                                    <code className="font-mono text-sm text-gray-900 dark:text-gray-100">{path}</code>
                                </header>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{summary}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* Tags API */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Tags API</h2>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {[
                            {
                                method: 'GET',
                                path: '/tags',
                                summary: 'List tags',
                                description: 'Retrieve all tags for the authenticated user with todo count.'
                            },
                            {
                                method: 'POST',
                                path: '/tags',
                                summary: 'Create tag',
                                description: 'Create a new tag. Send `name` (required, max 50 chars) and `color` (required, hex format #RRGGBB) in the JSON body.'
                            },
                            {
                                method: 'PUT',
                                path: '/tags/{id}',
                                summary: 'Update tag',
                                description: 'Update tag fields. Accepts `name` and `color` (hex format #RRGGBB).'
                            },
                            {
                                method: 'DELETE',
                                path: '/tags/{id}',
                                summary: 'Delete tag',
                                description: 'Remove a tag. This will also remove the tag from all associated todos.'
                            },
                            {
                                method: 'GET',
                                path: '/tags/search',
                                summary: 'Search tags',
                                description: 'Search tags by name. Send query parameter `q` for search term.'
                            }
                        ].map(({ method, path, summary, description }) => (
                            <article
                                key={`${method}-${path}`}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow"
                            >
                                <header className="flex items-center justify-between mb-3">
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                        {method}
                                    </span>
                                    <code className="font-mono text-sm text-gray-900 dark:text-gray-100">{path}</code>
                                </header>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{summary}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* SDK */}
                <section className="bg-white dark:bg-gray-800 shadow rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Example cURL Requests</h2>
                    <div className="space-y-4">
                        <div className="bg-gray-900 text-gray-100 font-mono text-sm rounded-xl p-4 overflow-x-auto">
                            <div className="text-emerald-400 mb-2"># Create a high-priority todo</div>
                            <pre>{`curl -X POST \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Deploy critical fix", "priority": "urgent"}' \\
  https://yourdomain.com/api/todos`}</pre>
                        </div>
                        <div className="bg-gray-900 text-gray-100 font-mono text-sm rounded-xl p-4 overflow-x-auto">
                            <div className="text-blue-400 mb-2"># Get high-priority todos only</div>
                            <pre>{`curl -X GET \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  "https://yourdomain.com/api/todos?filter=high_priority"`}</pre>
                        </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mt-4">
                        Need help? Reach out via the <Link href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">contact form</Link> or open an issue in our repository.
                    </p>
                </section>
            </div>
        </AppLayout>
    );
}
