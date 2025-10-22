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

                    <div id="hero-cta" className="flex flex-col items-center gap-3 mb-10">
                        {!auth?.user ? (
                            <>
                                <Link
                                    href="/register"
                                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Get Started
                                </Link>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Already have an account?{' '}
                                    <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200">
                                        Sign in
                                    </Link>
                                </p>
                            </>
                        ) : (
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Open Dashboard
                            </Link>
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

                <p className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    Built for devs who code, create, and conquer — one task at a time.
                </p>
            </div>
        </PublicLayout>
    );
}
