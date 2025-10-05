import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { CheckSquare, Plus, ArrowRight } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';

export default function Index({ message }) {
    const { auth } = usePage().props;
    return (
        <AppLayout title="Home">
            <div className="max-w-4xl mx-auto">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="text-6xl mb-6">📝</div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Welcome to Todo App
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                        {message}
                    </p>
                    <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
                        A modern, beautiful todo application built with React, Inertia.js, and shadcn/ui
                    </p>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                        <div className="text-3xl mb-4 text-gray-600 dark:text-gray-400">✅</div>
                        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Complete Tasks</h3>
                        <p className="text-gray-600 dark:text-gray-300">Mark tasks as complete with a single click</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                        <div className="text-3xl mb-4 text-gray-600 dark:text-gray-400">📝</div>
                        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Organize Tasks</h3>
                        <p className="text-gray-600 dark:text-gray-300">Create, edit, and delete tasks with ease</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                        <div className="text-3xl mb-4 text-gray-600 dark:text-gray-400">🎨</div>
                        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Beautiful UI</h3>
                        <p className="text-gray-600 dark:text-gray-300">Modern interface with shadcn/ui components</p>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Ready to get started?
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        Create your first todo and start organizing your tasks!
                    </p>
                    {auth?.user ? (
                        <Link href="/todos">
                            <button className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-md text-lg font-medium hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200">
                                <CheckSquare className="w-5 h-5 mr-2" />
                                View My Todos
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </button>
                        </Link>
                    ) : (
                        <div className="space-x-4">
                            <Link href="/login">
                                <button className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-md text-lg font-medium hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200">
                                    Get Started - Login
                                </button>
                            </Link>
                            <Link href="/register">
                                <button className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-md text-lg font-medium hover:bg-gray-500">
                                    Create Account
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
