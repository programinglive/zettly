import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Code2,
    Compass,
    GitBranch,
    Layers,
    LayoutDashboard,
    LogIn,
    Network,
    PenTool,
    Target,
    UserPlus,
} from 'lucide-react';

import PublicLayout from '../../Layouts/PublicLayout';

const CORE_CAPABILITIES = [
    {
        icon: Network,
        title: 'Connected Knowledge',
        description:
            'Write atomic notes, link related ideas bidirectionally, and surface relevant context right beside the tasks that depend on it.',
    },
    {
        icon: Compass,
        title: 'Intentional Prioritization',
        description:
            'Combine Eisenhower Matrix quadrants with P0–P3 priority levels so urgent critical work rises above background noise.',
    },
    {
        icon: Target,
        title: 'Focused Execution',
        description:
            'Group related tasks, notes, and drawings inside named Focus containers with measurable task progress instead of flat lists.',
    },
    {
        icon: CheckCircle2,
        title: 'Traceable Progress',
        description:
            'Record completion evidence and durable outcomes so every finished milestone preserves why decisions were made.',
    },
    {
        icon: PenTool,
        title: 'Visual Thinking',
        description:
            'Sketch system flows, relationship diagrams, and architecture maps on collaborative canvases linked directly to your tasks.',
    },
];

const WORKFLOW_STAGES = [
    { step: '01', label: 'Capture', detail: 'Save atomic notes, engineering context, and incoming work.' },
    { step: '02', label: 'Connect', detail: 'Link notes, drawings, and tasks inside a shared Focus.' },
    { step: '03', label: 'Prioritize', detail: 'Rank what matters using Eisenhower quadrants and P0–P3 tiers.' },
    { step: '04', label: 'Execute', detail: 'Work through your Today Priority Queue with clear next actions.' },
    { step: '05', label: 'Reflect', detail: 'Close tasks with verified outcomes and searchable history.' },
];

const EISENHOWER_QUADRANTS = [
    {
        code: 'Q1 · Do First',
        title: 'Important & Urgent',
        summary: 'Active blockers, deadlines, and critical deliverables requiring immediate execution.',
        accent: 'border-red-200 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20',
    },
    {
        code: 'Q2 · Schedule',
        title: 'Important, Not Urgent',
        summary: 'Deep engineering work, architecture improvements, and high-leverage long-term goals.',
        accent: 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/60 dark:bg-indigo-950/20',
    },
    {
        code: 'Q3 · Delegate / Timebox',
        title: 'Urgent, Less Important',
        summary: 'Interruptions and routine operational requests kept separate from deep focus.',
        accent: 'border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20',
    },
    {
        code: 'Q4 · Defer',
        title: 'Neither Urgent Nor Important',
        summary: 'Optional backlog ideas preserved in context without cluttering today’s queue.',
        accent: 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40',
    },
];

export default function Index() {
    const { auth } = usePage().props;
    const isAuthenticated = Boolean(auth?.user);

    return (
        <PublicLayout title="Zettly — Where Knowledge Becomes Action">
            <Head title="Zettly — Where Knowledge Becomes Action">
                <meta
                    name="description"
                    content="Capture ideas, connect knowledge, prioritize what matters, and turn your thinking into meaningful progress with Zettly."
                />
            </Head>

            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-20">
                {/* SECTION 1: HERO */}
                <section className="max-w-3xl mx-auto text-center space-y-6" aria-labelledby="hero-heading">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                        <span>Zettelkasten Knowledge + Priority-Driven Execution</span>
                    </div>

                    <h1
                        id="hero-heading"
                        className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-950 dark:text-white leading-[1.1]"
                    >
                        Where Knowledge Becomes Action.
                    </h1>

                    <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
                        Capture ideas, connect knowledge, prioritize what matters, and turn your thinking into
                        meaningful progress — in one calm, connected workspace.
                    </p>

                    <div id="hero-cta" className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                                >
                                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                                    Open Zettly
                                </Link>
                                <a
                                    href="#features"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    Explore Features
                                </a>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/register"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                                >
                                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                                    Get Started
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    <LogIn className="h-4 w-4" aria-hidden="true" />
                                    Sign in
                                </Link>
                            </>
                        )}
                    </div>
                </section>

                {/* SECTION 2: REPRESENTATIVE PRODUCT WORKSPACE PREVIEW */}
                <section aria-label="Workspace Preview" className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                        <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                            <span>Today Workspace</span>
                            <span className="text-slate-400">·</span>
                            <span className="font-normal text-slate-500 dark:text-slate-400">Representative Preview</span>
                        </div>
                        <span className="font-mono text-[11px]">Priority Queue · Focus Progress · Linked Notes</span>
                    </div>
                    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-12">
                        <div className="lg:col-span-7 space-y-3">
                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="bg-slate-50/80 dark:bg-slate-900/60 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    <span>Priority Queue</span>
                                    <span>Ranked P0 → P3</span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                                    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">P0</span>
                                            <span className="truncate font-medium text-slate-900 dark:text-slate-100">Verify release synchronization before production cutover</span>
                                        </div>
                                        <span className="shrink-0 text-xs text-slate-400">Release Governance</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">P1</span>
                                            <span className="truncate font-medium text-slate-900 dark:text-slate-100">Connect architecture notes to active Focus milestones</span>
                                        </div>
                                        <span className="shrink-0 text-xs text-slate-400">Knowledge Graph</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">P2</span>
                                            <span className="truncate font-medium text-slate-900 dark:text-slate-100">Review weekly engineering retrospective outcomes</span>
                                        </div>
                                        <span className="shrink-0 text-xs text-slate-400">Operations</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 space-y-3">
                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold uppercase tracking-wider text-slate-500">Active Focus</span>
                                    <span className="font-mono text-indigo-600 dark:text-indigo-400">75% complete</span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    Q4 Knowledge &amp; Priority Workflow
                                </p>
                                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div className="h-full w-3/4 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span>3 open · 9 completed</span>
                                    <span>4 linked notes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 3: CORE PRODUCT CAPABILITIES */}
                <section id="features" className="space-y-8" aria-labelledby="features-heading">
                    <div className="max-w-2xl space-y-2">
                        <h2 id="features-heading" className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                            Built for connected thinking and measurable work
                        </h2>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                            Knowledge should not sit disconnected from execution. Zettly keeps your notes, focuses,
                            priorities, and verified outcomes in one place.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {CORE_CAPABILITIES.map(({ icon: Icon, title, description }) => (
                            <article
                                key={title}
                                className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 dark:border-slate-800 dark:bg-slate-900/50"
                            >
                                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400">
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
                                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* SECTION 4: HOW ZETTLY WORKS */}
                <section id="how-it-works" className="space-y-8 border-t border-slate-200 pt-14 dark:border-slate-800" aria-labelledby="workflow-heading">
                    <div className="max-w-2xl space-y-2">
                        <h2 id="workflow-heading" className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                            How Zettly works
                        </h2>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                            A repeatable five-stage loop connecting Zettelkasten notes with daily execution.
                        </p>
                    </div>

                    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {WORKFLOW_STAGES.map(({ step, label, detail }) => (
                            <li
                                key={step}
                                className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 dark:border-slate-800 dark:bg-slate-900/40"
                            >
                                <div className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{step}</div>
                                <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{label}</h3>
                                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{detail}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* SECTION 5: PRIORITY MANAGEMENT (EISENHOWER + P0-P3) */}
                <section id="why" className="space-y-8 border-t border-slate-200 pt-14 dark:border-slate-800" aria-labelledby="priority-heading">
                    <div className="max-w-2xl space-y-2">
                        <h2 id="priority-heading" className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                            Clear prioritization without guesswork
                        </h2>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                            Use the Eisenhower Matrix to classify importance and urgency, alongside P0–P3 priority
                            tiers for immediate execution order in your Today queue.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {EISENHOWER_QUADRANTS.map(({ code, title, summary, accent }) => (
                            <div key={code} className={`rounded-xl border p-5 space-y-1.5 ${accent}`}>
                                <div className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">{code}</div>
                                <h3 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{summary}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* SECTION 6: DEVELOPER & API */}
                <section id="developer" className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/50" aria-labelledby="developer-heading">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                <Code2 className="h-4 w-4" aria-hidden="true" />
                                <span>DEVELOPER &amp; API</span>
                            </div>
                            <h2 id="developer-heading" className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                                Built to fit your engineering workflow
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                Connect Zettly with scripts, dashboards, and AI coding workflows through personal
                                scoped API tokens, documented REST endpoints, and optional DevWorkflow MCP synchronization.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <Link
                                href="/developer"
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                            >
                                Explore Developer Docs
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            <Link
                                href="/docs"
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                <BookOpen className="h-4 w-4" aria-hidden="true" />
                                Documentation
                            </Link>
                        </div>
                    </div>
                </section>

                {/* SECTION 7: FINAL CTA & COMPACT TECHNICAL ATTRIBUTION */}
                <section className="text-center space-y-5 border-t border-slate-200 pt-14 dark:border-slate-800">
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                        Turn your ideas into progress.
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
                        Open Zettly and bring your knowledge, priorities, and active work into one connected workspace.
                    </p>
                    <div>
                        <Link
                            href={isAuthenticated ? '/dashboard' : '/register'}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            {isAuthenticated ? 'Open Zettly' : 'Get Started'}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>

                    <div className="pt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                            Collaborative canvas powered by{' '}
                            <a
                                href="https://tldraw.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                                tldraw
                            </a>
                        </span>
                        <span>·</span>
                        <a
                            href="mailto:mahatma.mahardhika@programinglive.com"
                            className="underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                            Contact
                        </a>
                        <span>·</span>
                        <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200">
                            Privacy Policy
                        </Link>
                        <span>·</span>
                        <Link href="/legal/terms" className="underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200">
                            Terms of Service
                        </Link>
                    </div>
                </section>
            </div>
        </PublicLayout>
    );
}
