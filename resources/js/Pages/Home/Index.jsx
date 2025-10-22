import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { CheckSquare, Plus, ArrowRight, LayoutDashboard, LogIn, UserPlus } from 'lucide-react';

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

                    <div id="hero-cta" className="flex flex-wrap justify-center gap-4 mb-10">
                        {!auth?.user ? (
                            <>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-slate-800"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Sign In
                                </Link>
                                <Link
                                    href="/register"
                                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Create Account
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    Open Dashboard
                                </Link>
                                <Link
                                    href="/todos"
                                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-slate-800"
                                >
                                    <CheckSquare className="w-4 h-4" />
                                    View My Todos
                                </Link>
                            </>
                        )}
                    </div>
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

                <div className="mt-16 rounded-3xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white px-8 py-10 text-center shadow-xl">
                    <h2 className="text-3xl font-bold mb-3">Start organizing your tasks today!</h2>
                    <p className="text-base text-slate-200 max-w-2xl mx-auto mb-6">
                        Join thousands of users who trust Zettly to manage their daily tasks efficiently.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {!auth?.user ? (
                            <>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-white/20"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Sign In
                                </Link>
                                <Link
                                    href="/register"
                                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-400"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Create Account
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/todos"
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-white/20"
                                >
                                    <CheckSquare className="w-4 h-4" />
                                    Go to Todos
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-400"
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    Open Dashboard
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                <p className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    Built for devs who code, create, and conquer — one task at a time.
                </p>
            </div>
        </PublicLayout>
    );
}
