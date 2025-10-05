import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';

import { ModeToggle } from '../Components/mode-toggle';

export default function AppLayout({ children, title }) {
    const { auth, flash } = usePage().props;

    return (
        <>
            <Head title={title || 'Todo App'} />
            <div className="min-h-screen bg-white dark:bg-gray-900 font-sans antialiased transition-colors">
                {/* Flash Messages */}
                {(flash?.success || flash?.error) && (
                    <div className="fixed top-4 right-4 z-50 max-w-sm">
                        {flash.success && (
                            <div className="mb-2 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                                <span className="block sm:inline">{flash.success}</span>
                            </div>
                        )}
                        {flash.error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                                <span className="block sm:inline">{flash.error}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation */}
                <nav className="border-b bg-white dark:bg-gray-800 transition-colors">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex items-center">
                                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    📝 Todo App
                                </h1>
                            </div>
                            <div className="flex items-center space-x-4">
                                <ModeToggle />
                                {auth?.user ? (
                                    <>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            Welcome, {auth.user.name}!
                                        </span>
                                        <Link href="/dashboard">
                                            <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-500">
                                                My Todos
                                            </button>
                                        </Link>
                                        <Link href="/profile">
                                            <button className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-500">
                                                Profile
                                            </button>
                                        </Link>
                                        <form method="POST" action="/logout" className="inline">
                                            <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')} />
                                            <button type="submit" className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-500">
                                                Logout
                                            </button>
                                        </form>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/login">
                                            <button className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-500">
                                                Login
                                            </button>
                                        </Link>
                                        <Link href="/register">
                                            <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-500">
                                                Register
                                            </button>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="py-8 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </>
    );
}
