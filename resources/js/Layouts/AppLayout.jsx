import React from 'react';
import { Head, usePage } from '@inertiajs/react';

export default function AppLayout({ children, title }) {
    const { flash } = usePage().props;

    return (
        <>
            <Head title={title || 'Todo App'} />
            <div className="min-h-screen bg-gray-50 font-sans antialiased">
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
                <nav className="border-b bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex items-center">
                                <h1 className="text-xl font-semibold text-gray-900">
                                    📝 Todo App
                                </h1>
                            </div>
                            <div className="flex items-center space-x-4">
                                <a
                                    href="/todos/create"
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-500"
                                >
                                    ➕ New Todo
                                </a>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </>
    );
}
