import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { CheckSquare, Plus, ArrowRight, LayoutDashboard } from 'lucide-react';

import PublicLayout from '../../Layouts/PublicLayout';

export default function Index({ message }) {
    const { auth } = usePage().props;
    const firstName = auth?.user?.name ? auth.user.name.split(' ')[0] : null;
    return (
        <PublicLayout title="Home">
            <div className="max-w-4xl mx-auto" id="features">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="text-6xl mb-6">📝</div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Welcome to Zettly 🌊
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                        Stay in the flow — manage your tasks, not your stress.
                    </p>
                    <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
                        Built with React, Inertia.js, and shadcn/ui for a clean, modern experience.
                    </p>

                    {/* CTA for non-authenticated users */}
                    {!auth?.user && (
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-600">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Start organizing your tasks today!
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Join thousands of users who trust Zettly to manage their daily tasks efficiently.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Link href="/login">
                                    <button className="w-full sm:w-auto inline-flex items-center px-8 py-3 bg-black text-white rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg dark:bg-white dark:text-black dark:hover:bg-gray-100">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Sign In
                                    </button>
                                </Link>
                                <Link href="/register">
                                    <button className="w-full sm:w-auto inline-flex items-center px-8 py-3 bg-black text-white border-2 border-black rounded-lg text-lg font-semibold hover:bg-gray-800 hover:border-gray-800 transition-colors dark:bg-white dark:text-black dark:border-white dark:hover:bg-gray-100 dark:hover:border-gray-100">
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
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-600">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Welcome back, {firstName ?? auth.user.name}!
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Ready to surf through your tasks? Let's ride that productivity wave 🌊
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Link href="/todos">
                                    <button className="inline-flex items-center px-8 py-3 bg-black text-white rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg dark:bg-white dark:text-black dark:hover:bg-gray-100">
                                        <span className="mr-2">🏁</span>
                                        View My Todos
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </button>
                                </Link>
                                <Link href="/dashboard">
                                    <button className="inline-flex items-center px-8 py-3 bg-white text-gray-900 rounded-lg text-lg font-semibold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-lg dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800">
                                        <span className="mr-2">📊</span>
                                        Go to Dashboard
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </button>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                        <div className="text-3xl mb-4 text-gray-600 dark:text-gray-400">✅</div>
                        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Finish Fast</h3>
                        <p className="text-gray-600 dark:text-gray-300">Check off tasks in one click and feel that instant win.</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                        <div className="text-3xl mb-4 text-gray-600 dark:text-gray-400">🧭</div>
                        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Stay Organized</h3>
                        <p className="text-gray-600 dark:text-gray-300">Add, edit, or clear tasks in seconds — no clutter, no chaos.</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover_border-gray-600 transition-all duration-200">
                        <div className="text-3xl mb-4 text-gray-600 dark:text-gray-400">🎨</div>
                        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Look Good Doing It</h3>
                        <p className="text-gray-600 dark:text-gray-300">Built with shadcn/ui — smooth, modern, and easy on the eyes.</p>
                    </div>
                </div>

                {/* Additional Info Section */}
                <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg" id="why">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Why choose Zettly?
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                        Find your flow — experience the perfect mix of speed and simplicity.
                        Zettly adapts to your workflow, whether you're managing personal projects or collaborating with your team.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center justify-center">⚡ Real-time sync — updates land instantly across your devices</div>
                        <div className="flex items-center justify-center">🔒 Secure & private — your data stays yours</div>
                        <div className="flex items-center justify-center">🧠 Smart workflow — built to fit how you already work</div>
                        <div className="flex items-center justify-center">🧩 API-first — everything you can click, you can code</div>
                        <div className="flex items-center justify-center sm:col-span-2">👫 Team-ready — collaborate without chaos</div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="mt-16 bg-gray-900 dark:bg-gray-800 text-white rounded-3xl p-8 text-center shadow-xl" id="api">
                    <h2 className="text-2xl font-bold mb-4">Build on top of the Zettly API</h2>
                    <p className="text-gray-200 mb-6">
                        Ship faster with a clean, secure REST API for listing, creating, updating, and completing tasks.
                        Get started in minutes with copy-paste examples and simple authentication.
                    </p>
                    <Link
                        href="/developer"
                        className="inline-flex items-center px-6 py-3 bg-white text-gray-900 font-semibold rounded-full shadow hover:bg-gray-200 transition-colors"
                    >
                        <span className="mr-2">🚀</span>
                        Explore the API
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                    <p className="text-gray-400 text-sm mt-4">Ready-made examples for fetch, Axios, and cURL.</p>
                </div>

                <p className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    Built for devs who code, create, and conquer — one task at a time.
                </p>
            </div>
        </PublicLayout>
    );
}
