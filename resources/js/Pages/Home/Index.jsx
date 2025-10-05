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

                    {/* CTA for non-authenticated users */}
                    {!auth?.user && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-8 mb-8 border border-blue-200 dark:border-blue-800">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Start organizing your tasks today!
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Join thousands of users who trust Todo App to manage their daily tasks efficiently.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Link href="/login">
                                    <button className="w-full sm:w-auto inline-flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Sign In
                                    </button>
                                </Link>
                                <Link href="/register">
                                    <button className="w-full sm:w-auto inline-flex items-center px-8 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-lg text-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                        Create Account
                                    </button>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* CTA for authenticated users */}
                    {auth?.user && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-8 mb-8 border border-green-200 dark:border-green-800">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Welcome back, {auth.user.name}!
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Ready to tackle your tasks? Let's get organized!
                            </p>
                            <Link href="/todos">
                                <button className="inline-flex items-center px-8 py-3 bg-green-600 text-white rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg">
                                    <CheckSquare className="w-5 h-5 mr-2" />
                                    View My Todos
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </button>
                            </Link>
                        </div>
                    )}
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

                {/* Additional Info Section */}
                <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Why choose Todo App?
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                        Experience the perfect blend of simplicity and power. Our todo app adapts to your workflow,
                        whether you're managing personal tasks or collaborating with a team.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center justify-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Real-time synchronization
                        </div>
                        <div className="flex items-center justify-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Secure & Private
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
