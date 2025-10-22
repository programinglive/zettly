import React from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function Footer() {
    const year = new Date().getFullYear();
    const page = usePage();
    const appVersion = page?.props?.appVersion ?? null;

    return (
        <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-16" role="contentinfo">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid gap-10 md:grid-cols-4 text-sm text-gray-600 dark:text-gray-300">
                    <section aria-labelledby="footer-brand" className="md:col-span-2 space-y-3">
                        <div className="flex items-center space-x-2" id="footer-brand">
                            <span className="text-2xl" aria-hidden>📝</span>
                            <span className="text-xl font-semibold text-gray-900 dark:text-white">Zettly</span>
                        </div>
                        <p className="max-w-md">
                            Zettly is a productivity platform built with Laravel and Inertia.js. Organize tasks, collaborate with your team, and connect your own software via our REST API.
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

                    <nav aria-labelledby="footer-legal">
                        <h2 id="footer-legal" className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Legal</h2>
                        <ul className="mt-4 space-y-2">
                            <li><Link href="/legal/terms" className="hover:text-gray-900 dark:hover:text-white">Terms of Service</Link></li>
                            <li><Link href="/legal/privacy" className="hover:text-gray-900 dark:hover:text-white">Privacy Policy</Link></li>
                        </ul>
                    </nav>
                </div>

                <div className="mt-12 flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                    <p>© {year} Zettly. All rights reserved.</p>
                    <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
                        <p>
                            Have questions? Email{' '}
                            <a href="mailto:mahatma.mahardhika@programinglive.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                                mahatma.mahardhika@programinglive.com
                            </a>
                        </p>
                        {appVersion && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-300">
                                <span className="text-gray-400 dark:text-gray-500">Version</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-100">v{appVersion}</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
}
