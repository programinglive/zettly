import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const DOC_BASE_URL = 'https://github.com/programinglive/zettly/blob/main/docs';

const guides = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        summary: 'Set up Zettly locally, sync data, and understand the product fundamentals.',
        icon: '🚀',
        items: [
            {
                title: 'Installation & Local Setup',
                description: 'Step-by-step instructions to run Zettly locally, configure env vars, and seed baseline data.',
                href: `${DOC_BASE_URL}/DATABASE_SYNC.md`,
            },
            {
                title: 'Debug Tooling',
                description: 'How to enable verbose logging, access the debug toolbar, and inspect PWA state.',
                href: `${DOC_BASE_URL}/DEBUG_TROUBLESHOOTING.md`,
            },
            {
                title: 'Design System',
                description: 'Visual foundation, typography stacks, and spacing tokens used across the app.',
                href: `${DOC_BASE_URL}/DESIGN_SYSTEM.md`,
            },
        ],
    },
    {
        id: 'product-guides',
        title: 'Product Guides',
        summary: 'Deep dives into the major experiences shipped with Zettly.',
        icon: '📘',
        items: [
            {
                title: 'Organizations',
                description: 'Modeling multi-tenant workspaces, invitations, and permissions.',
                href: `${DOC_BASE_URL}/ORGANIZATIONS_IMPLEMENTATION_SUMMARY.md`,
            },
            {
                title: 'Focus Sessions',
                description: 'How the focus timer, events, and priority coaching operate together.',
                href: `${DOC_BASE_URL}/reference/FOCUS_FEATURE.md`,
            },
            {
                title: 'Graph Service',
                description: 'Link analysis, relationship syncing, and debugging real-time edges.',
                href: `${DOC_BASE_URL}/reference/REORDER_DEBUG.md`,
            },
        ],
    },
    {
        id: 'api-reference',
        title: 'API Reference',
        summary: 'Endpoints, authentication, rate limits, and payload structures for external integrations.',
        icon: '🧩',
        items: [
            {
                title: 'REST API Overview',
                description: 'Authentication, pagination, and common response shapes.',
                href: `${DOC_BASE_URL}/reference/API_DOCUMENTATION.md`,
            },
            {
                title: 'Realtime & Webhooks',
                description: 'How Zettly uses Pusher and how to subscribe to change events.',
                href: `${DOC_BASE_URL}/reference/PUSHER_PAYLOAD_FIX.md`,
            },
            {
                title: 'Error Handling & SLOs',
                description: 'Sentry integration, alerting strategy, and operational playbooks.',
                href: `${DOC_BASE_URL}/reference/SENTRY_INTEGRATION_SETUP.md`,
            },
        ],
    },
];

export default function Docs() {
    return (
        <AppLayout title="Documentation">
            <Head title="Documentation" />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="flex-1">
                        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                            Documentation
                        </h1>
                        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
                            Discover how Zettly is built and how to extend it. Every feature—Todos, Focus plans, Gemini insights, and integrations—ships with an accompanying guide.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/developer">
                            <button className="rounded-full px-6 py-3 text-sm font-semibold transition bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-lg">
                                Developer Portal
                            </button>
                        </Link>
                        <a
                            href={`${DOC_BASE_URL}/PRD.md`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <button className="rounded-full px-6 py-3 text-sm font-semibold border border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-slate-900 transition-all dark:text-white">
                                Download PRD
                            </button>
                        </a>
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Search Bar */}
                    <div className="mb-12 relative max-w-2xl">
                        <svg
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="search"
                            placeholder="Search the playbooks, e.g. “focus sessions”"
                            className="w-full rounded-full border border-gray-100 bg-white dark:bg-slate-900/60 dark:border-gray-800 px-12 py-4 text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 shadow-sm"
                        />
                    </div>

                    <div className="mt-12 grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
                        <aside className="space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">On this page</div>
                            <nav className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                {guides.map(({ id, title, summary }) => (
                                    <a
                                        key={id}
                                        href={`#${id}`}
                                        className="block rounded-xl px-3 py-2 font-medium text-slate-800 transition hover:bg-indigo-50 dark:text-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <div>{title}</div>
                                        <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{summary}</p>
                                    </a>
                                ))}
                            </nav>
                            <div className="mt-6 rounded-2xl bg-slate-900/90 p-4 text-slate-100">
                                <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Need help?</p>
                                <p className="mt-2 text-sm text-slate-200">
                                    Email{' '}
                                    <a href="mailto:mahatma.mahardhika@programinglive.com" className="underline underline-offset-4">
                                        mahatma.mahardhika@programinglive.com
                                    </a>{' '}
                                    or open a GitHub discussion.
                                </p>
                            </div>
                        </aside>

                        <section className="space-y-16">
                            {guides.map(({ id, title, summary, icon, items }) => (
                                <div key={id} id={id} className="scroll-mt-32 space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-2xl dark:bg-indigo-500/20">{icon}</div>
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">{title}</p>
                                            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{summary}</h2>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        {items.map((item) => (
                                            <article
                                                key={item.title}
                                                className="group relative flex flex-col rounded-[2.5rem] border border-slate-100 bg-white/90 p-8 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90"
                                            >
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</div>
                                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                                                <a
                                                    href={item.href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition group-hover:gap-3"
                                                >
                                                    Open guide
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M7 17 17 7" />
                                                        <path d="M7 7h10v10" />
                                                    </svg>
                                                </a>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className="rounded-[2.5rem] border border-indigo-200 bg-indigo-50/80 p-12 shadow-sm dark:border-indigo-500/40 dark:bg-indigo-500/10">
                                <p className="text-sm uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-300">Contribute</p>
                                <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">Help us keep the docs evergreen.</h2>
                                <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-200">
                                    Documentation lives inside the <code className="rounded bg-white/70 px-2 py-0.5 text-xs font-mono dark:bg-slate-900/60">/docs</code> directory. Submit a PR
                                    with updates, new diagrams, or troubleshooting steps whenever you ship a feature.
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <a
                                        href="https://github.com/programinglive/zettly/tree/main/docs"
                                        className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-slate-900"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Browse docs repo
                                    </a>
                                    <Link
                                        href="/developer"
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 dark:border-slate-700 dark:text-white"
                                    >
                                        View API surface
                                    </Link>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
