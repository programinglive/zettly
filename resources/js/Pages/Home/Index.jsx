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
                <div className="text-center mb-10 sm:mb-12">
                    <div className="text-5xl sm:text-6xl mb-5 sm:mb-6">📝</div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                        Welcome to Zettly 🌊
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8">
                        Stay in the flow — manage your tasks, not your stress.
                    </p>
                    <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 mb-6 sm:mb-8">
                        Built with React, Inertia.js, and shadcn/ui for a clean, modern experience.
                    </p>

                    <div id="hero-cta" className="flex flex-col items-center gap-4 mb-8 sm:mb-10">
                        {!auth?.user ? (
                            <div className="w-full max-w-sm rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 shadow-sm backdrop-blur-sm dark:border-indigo-900 dark:bg-indigo-950/70 sm:w-auto sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none dark:sm:border-none dark:sm:bg-transparent dark:sm:shadow-none dark:sm:backdrop-blur-none">
                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
                                    <Link
                                        href="/register"
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:w-auto"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Get Started
                                    </Link>
                                    <span className="text-center text-sm text-indigo-700 dark:text-indigo-200 sm:w-auto">or</span>
                                    <Link
                                        href="/login"
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200 sm:w-auto"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Sign in
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 sm:w-auto sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none dark:sm:border-none dark:sm:bg-transparent dark:sm:shadow-none dark:sm:backdrop-blur-none">
                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:w-auto"
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        Open Dashboard
                                    </Link>
                                    <span className="text-center text-sm text-gray-500 dark:text-gray-300 sm:w-auto">or</span>
                                    <Link
                                        href="/todos"
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition hover:text-gray-900 dark:text-gray-200 dark:hover:text-white sm:w-auto"
                                    >
                                        <CheckSquare className="w-4 h-4" />
                                        View my todos
                                    </Link>
                                </div>
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

                <section id="developer" className="mt-16">
                    <div className="mx-auto max-w-4xl rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 px-4 py-6 sm:px-6 sm:py-8 shadow-lg dark:border-indigo-900/40 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950">
                        <header className="flex flex-col gap-4 text-left">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-2xl dark:bg-indigo-900/40">👩‍💻</div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Build on the Zettly API</h2>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 sm:text-base">
                                    Automate workflows, integrate dashboards, and ship extensions without wrestling with boilerplate. Tokens, REST endpoints, and webhooks are ready the moment you are.
                                </p>
                            </div>
                        </header>

                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                            {[{
                                icon: '🔐',
                                title: 'Secure personal tokens',
                                body: 'Issue scoped tokens from your profile and call authenticated endpoints instantly.',
                                cta: { label: 'View token guide', href: '/developer#auth' },
                            }, {
                                icon: '🧪',
                                title: 'Interactive playground',
                                body: 'Prototype requests in the browser, persist examples, and export reusable curl snippets.',
                                cta: { label: 'Launch playground', href: '/developer#playground' },
                            }].map(({ icon, title, body, cta }) => (
                                <article key={title} className="rounded-xl border border-indigo-100 bg-white/95 p-5 shadow-sm transition hover:shadow-md dark:border-indigo-900/40 dark:bg-slate-900/80">
                                    <div className="mb-3 flex items-center gap-3">
                                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-lg dark:bg-indigo-900/40">{icon}</span>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">{title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 sm:text-[0.95rem]">{body}</p>
                                    <Link href={cta.href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">
                                        {cta.label}
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </article>
                            ))}
                        </div>

                        <div className="mt-8 rounded-xl border border-indigo-100 bg-white/95 p-5 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/80">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">Todo API at a glance</h3>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {[{
                                    method: 'GET',
                                    desc: 'List and filter todos with priority, status, and Eisenhower quadrants.',
                                }, {
                                    method: 'POST',
                                    desc: 'Create todos with tags, checklists, and rich descriptions.',
                                }, {
                                    method: 'PATCH',
                                    desc: 'Toggle completion or update Eisenhower placement in a single request.',
                                }, {
                                    method: 'GET',
                                    desc: 'Fetch tags with usage counts to power custom dashboards.',
                                }].map(({ method, desc }, index) => (
                                    <div key={`${method}-${index}`} className="flex items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-sm leading-relaxed dark:border-indigo-900/50 dark:bg-indigo-950/40">
                                        <span className={`inline-flex min-w-[3rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            method === 'POST'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                                : method === 'PATCH'
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                        }`}>{method}</span>
                                        <p className="text-gray-700 dark:text-gray-200">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <footer className="mt-8 text-left sm:text-center">
                            <Link
                                href="/developer"
                                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                            >
                                Explore full developer portal
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </footer>
                    </div>
                </section>

                <p className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    Built for devs who code, create, and conquer — one task at a time.
                </p>
            </div>
        </PublicLayout>
    );
}
