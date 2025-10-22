import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { CheckSquare, Plus, ArrowRight, LayoutDashboard, LogIn, UserPlus } from 'lucide-react';

import PublicLayout from '../../Layouts/PublicLayout';

export default function Index({ message }) {
    const { auth } = usePage().props;
    const firstName = auth?.user?.name ? auth.user.name.split(' ')[0] : null;
    return (
        <PublicLayout title="Home">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8" id="features">
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

                    <div id="hero-cta" className="flex flex-col items-center gap-4 mb-10">
                        {!auth?.user ? (
                            <div className="flex flex-wrap items-center gap-3 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-2 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/60">
                                <Link
                                    href="/register"
                                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Get Started
                                </Link>
                                <span className="text-sm text-indigo-700 dark:text-indigo-200">or</span>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Sign in
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    Open Dashboard
                                </Link>
                                <span className="text-sm text-gray-500 dark:text-gray-300">or</span>
                                <Link
                                    href="/todos"
                                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
                                >
                                    <CheckSquare className="w-4 h-4" />
                                    View my todos
                                </Link>
                            </div>
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

                <section
                    id="developer"
                    className="mt-16 rounded-3xl border border-gray-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 p-12 shadow-lg dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950"
                >
                    <header className="text-center space-y-4 mb-10">
                        <div className="text-4xl">👩‍💻</div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Developer Toolkit</h2>
                        <p className="text-base text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                            Everything you need to automate workflows, sync tasks, and build extensions. Secure tokens, clean REST endpoints, real-time webhooks, and comprehensive docs are included out of the box.
                        </p>
                    </header>

                    <div className="grid gap-8 lg:grid-cols-[1.1fr_minmax(0,1.4fr)]">
                        <div className="space-y-6">
                            <article className="rounded-2xl border border-indigo-100 bg-white/90 p-6 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/80">
                                <h3 className="text-xl font-semibold text-indigo-700 dark:text-indigo-200 mb-2">Authenticate with Personal Tokens</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                    Issue personal access tokens from the profile page and send them as bearer tokens with every request.
                                </p>
                                <div className="bg-gray-900 text-gray-100 font-mono text-xs rounded-xl p-4 overflow-x-auto">
                                    <div className="text-emerald-400 mb-2"># Request header</div>
                                    <pre>{`Authorization: Bearer YOUR_TOKEN_HERE`}</pre>
                                </div>
                            </article>

                            <article className="rounded-2xl border border-indigo-100 bg-white/90 p-6 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/80">
                                <h3 className="text-xl font-semibold text-indigo-700 dark:text-indigo-200 mb-2">Sandbox Playground</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                    Experiment with endpoints in the interactive playground. Craft requests, persist examples, and export curl snippets instantly.
                                </p>
                                <Link
                                    href="/developer#playground"
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
                                >
                                    Explore playground
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </article>
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-slate-700 dark:bg-slate-900">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Todo API highlights</h3>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {[
                                        { method: 'GET', path: '/todos', desc: 'List and filter todos by status or priority.' },
                                        { method: 'POST', path: '/todos', desc: 'Create todos with rich descriptions and tags.' },
                                        { method: 'PATCH', path: '/todos/{id}/toggle', desc: 'Toggle completion in a single request.' },
                                        { method: 'GET', path: '/tags', desc: 'Fetch tags with usage counts for analytics.' },
                                    ].map(({ method, path, desc }) => (
                                        <article
                                            key={`${method}-${path}`}
                                            className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-sm dark:border-indigo-900/50 dark:bg-indigo-950/40"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                        method === 'GET'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                            : method === 'POST'
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                    }`}
                                                >
                                                    {method}
                                                </span>
                                                <code className="font-mono text-xs text-gray-700 dark:text-gray-200">{path}</code>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">{desc}</p>
                                        </article>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-slate-700 dark:bg-slate-900">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Example requests</h3>
                                <div className="space-y-4">
                                    <div className="bg-gray-900 text-gray-100 font-mono text-xs rounded-xl p-4 overflow-x-auto">
                                        <div className="text-emerald-400 mb-2"># Create a high-priority todo</div>
                                        <pre>{`curl -X POST \\
 -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
 -H "Content-Type: application/json" \\
 -d '{"title": "Deploy critical fix", "priority": "urgent"}' \\
 https://todo.test/api/todos`}</pre>
                                    </div>
                                    <div className="bg-gray-900 text-gray-100 font-mono text-xs rounded-xl p-4 overflow-x-auto">
                                        <div className="text-blue-400 mb-2"># Filter high-priority todos</div>
                                        <pre>{`curl -X GET \\
 -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
 "https://todo.test/api/todos?filter=high_priority"`}</pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="mt-12 text-center">
                        <Link
                            href="/developer"
                            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                            Explore full developer portal
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </footer>
                </section>

                <p className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    Built for devs who code, create, and conquer — one task at a time.
                </p>
            </div>
        </PublicLayout>
    );
}
