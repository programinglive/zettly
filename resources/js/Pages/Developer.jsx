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
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Todo App Developer Portal</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Integrate Todo App features into your applications using our secure REST API.
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

                {/* Endpoints */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Todos API</h2>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {[
                            {
                                method: 'GET',
                                path: '/todos',
                                summary: 'List todos',
                                description: 'Retrieve a paginated list of todos. Optional query parameter `filter=completed|pending`.'
                            },
                            {
                                method: 'POST',
                                path: '/todos',
                                summary: 'Create todo',
                                description: 'Create a new todo. Send `title` (required) and `description` (optional) in the JSON body.'
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
                                description: 'Update todo fields. Accepts `title`, `description`, and `is_completed`.'
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
                            }
                        ].map(({ method, path, summary, description }) => (
                            <article
                                key={`${method}-${path}`}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow"
                            >
                                <header className="flex items-center justify-between mb-3">
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
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
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Example cURL Request</h2>
                    <div className="bg-gray-900 text-gray-100 font-mono text-sm rounded-xl p-4 overflow-x-auto">
                        <pre>{`curl -X POST \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Build awesome integrations"}' \\
  https://yourdomain.com/api/todos`}</pre>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mt-4">
                        Need help? Reach out via the <Link href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">contact form</Link> or open an issue in our repository.
                    </p>
                </section>
            </div>
        </AppLayout>
    );
}
