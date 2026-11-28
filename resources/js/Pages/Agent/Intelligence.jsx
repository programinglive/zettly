import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';

export default function Intelligence({
    retrospectives = [],
    improvements = [],
    lessons = [],
    scorecard = {},
    concurrency_limit = 2,
    budgets = {},
}) {
    const triggerRetro = (kind) => {
        router.post('/agent/intelligence/generate', { kind, regenerate: true });
    };

    const summary = scorecard.summary || {};

    return (
        <AppLayout title="Engineering Intelligence & Retrospectives">
            <Head title="Engineering Intelligence · V1.7" />
            <div className="w-full space-y-6 py-6 pb-20 [&_a]:min-h-[44px] [&_button]:min-h-[44px]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Zettly V1.7 · Autonomous AI Engineering Organization
                        </p>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Engineering Intelligence & Continuous Improvement
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/agent/jobs"
                            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        >
                            ← Coding Agent Jobs
                        </Link>
                        <button
                            type="button"
                            onClick={() => triggerRetro('daily')}
                            className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                        >
                            + Generate Daily Retro
                        </button>
                        <button
                            type="button"
                            onClick={() => triggerRetro('weekly')}
                            className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                            + Generate Weekly Retro
                        </button>
                        <button
                            type="button"
                            onClick={() => triggerRetro('monthly')}
                            className="rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-purple-700"
                        >
                            + Generate Monthly Review
                        </button>
                    </div>
                </div>

                {/* Top KPI Strip */}
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="text-xs text-gray-500">Verified Outcomes</div>
                        <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {summary.verified_outcomes ?? 0} / {summary.assigned_tasks ?? 0}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="text-xs text-gray-500">First-Pass Success</div>
                        <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {summary.first_pass_success_rate ?? 0}%
                        </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="text-xs text-gray-500">Parallel Slots</div>
                        <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {concurrency_limit} Active Slots
                        </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="text-xs text-gray-500">Total Tokens (Free)</div>
                        <div className="mt-1 text-2xl font-bold text-teal-600 dark:text-teal-400">
                            {summary.total_tokens ?? 0}
                        </div>
                        <div className="text-[11px] text-gray-400">
                            Daily Budget: {budgets.daily_tokens ?? 500000}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="text-xs text-gray-500">Security Violations</div>
                        <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {summary.security_violations ?? 0}
                        </div>
                    </div>
                </section>

                {/* Retrospectives (Daily / Weekly / Monthly) */}
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                        Daily, Weekly & Monthly Retrospectives (Asia/Jakarta)
                    </h2>
                    <div className="mt-4 space-y-3">
                        {retrospectives.length === 0 ? (
                            <p className="text-xs text-gray-500">
                                No retrospectives generated yet. Click a Generate button above or wait for the scheduled WIB cron.
                            </p>
                        ) : (
                            retrospectives.map((r) => (
                                <div
                                    key={r.id}
                                    className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <span className="mr-2 rounded bg-indigo-100 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                                {r.period_kind} · v{r.version}
                                            </span>
                                            <span className="font-semibold text-gray-900 dark:text-gray-100">{r.title}</span>
                                        </div>
                                        <span className="font-mono text-xs text-gray-500">Status: {r.status}</span>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                                        {r.sections?.A_executive_summary}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Continuous Improvement Backlog & Lessons Learned */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                            Continuous Improvement Backlog ({improvements.length})
                        </h2>
                        <div className="mt-3 space-y-2.5 text-xs">
                            {improvements.length === 0 ? (
                                <p className="text-gray-500">No recurring failure patterns detected.</p>
                            ) : (
                                improvements.map((imp) => (
                                    <div key={imp.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
                                        <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                                            <span>{imp.action_code} · {imp.title}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">
                                                    {imp.priority} · Score {imp.priority_score ?? 80} · {imp.safety_level ?? 'safe_auto'} · {imp.status} (x{imp.occurrence_count})
                                                </span>
                                                {imp.promoted_todo_id && (
                                                    <Link
                                                        href={`/todos/${imp.promoted_todo_id}`}
                                                        className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900 hover:bg-emerald-200"
                                                    >
                                                        Priority Todo #{imp.promoted_todo_id}
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                        <p className="mt-1 text-gray-600 dark:text-gray-400">{imp.expected_outcome}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                            Engineering Memory & Lessons Learned ({lessons.length})
                        </h2>
                        <div className="mt-3 space-y-2.5 text-xs">
                            {lessons.length === 0 ? (
                                <p className="text-gray-500">No durable lessons recorded yet.</p>
                            ) : (
                                lessons.map((l) => (
                                    <div key={l.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
                                        <div className="flex items-center justify-between font-semibold">
                                            <span>{l.title}</span>
                                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] uppercase text-emerald-900">
                                                {l.confidence} · v{l.version}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-gray-600 dark:text-gray-400">{l.context}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
