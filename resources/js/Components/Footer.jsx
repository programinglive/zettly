import React from 'react';
import { Link } from '@inertiajs/react';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-16" role="contentinfo">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid gap-10 md:grid-cols-4 text-sm text-gray-600 dark:text-gray-300">
                    <section aria-labelledby="footer-brand" className="md:col-span-2 space-y-3">
                        <div className="flex items-center space-x-2" id="footer-brand">
                            <span className="text-2xl" aria-hidden>📝</span>
                            <span className="text-xl font-semibold text-gray-900 dark:text-white">Todo App</span>
                        </div>
                        <p className="max-w-md">
                            Todo App is a productivity platform built with Laravel and Inertia.js. Organize tasks, collaborate with your team, and connect your own software via our REST API.
                        </p>
                        <p>
                            Need integrations? Visit the{' '}
                            <Link href="/developer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                developer portal
                            </Link>{' '}
                            for authentication details, endpoints, and examples.
                        </p>
                    </section>

                    <nav aria-labelledby="footer-navigation">
                        <h2 id="footer-navigation" className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Navigation</h2>
                        <ul className="mt-4 space-y-2">
                            <li><Link href="/" className="hover:text-gray-900 dark:hover:text-white">Home</Link></li>
                            <li><Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white">Dashboard</Link></li>
                            <li><Link href="/todos" className="hover:text-gray-900 dark:hover:text-white">My Todos</Link></li>
                            <li><Link href="/developer" className="hover:text-gray-900 dark:hover:text-white">Todo API Docs</Link></li>
                        </ul>
                    </nav>

                    <section aria-labelledby="footer-api" className="space-y-3">
                        <h2 id="footer-api" className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Todo API</h2>
                        <p>
                            Secure, token-based endpoints for CRUD operations:
                        </p>
                        <ul className="space-y-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                            <li>GET /api/todos</li>
                            <li>POST /api/todos</li>
                            <li>PUT /api/todos/&lbrace;id&rbrace;</li>
                            <li>PATCH /api/todos/&lbrace;id&rbrace;/toggle</li>
                            <li>DELETE /api/todos/&lbrace;id&rbrace;</li>
                        </ul>
                    </section>
                </div>

                <div className="mt-12 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 dark:text-gray-400 gap-2">
                    <p>© {year} Todo App. All rights reserved.</p>
                    <p>
                        Have questions? Email{' '}
                        <a href="mailto:dev@todoapp.test" className="text-blue-600 dark:text-blue-400 hover:underline">
                            dev@todoapp.test
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
