import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import DashboardLayout from '../../Layouts/DashboardLayout';
import { CheckCircle2, AlertTriangle, Compass, Sparkles, ArrowRight, FileText } from 'lucide-react';

const PERIOD_TABS = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
];

function RetrospectiveCard({ retro }) {
    if (!retro) {
        return (
            <section className="rounded-md border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                    Retrospective data is currently unavailable. Reload to try again.
                </p>
            </section>
        );
    }

    const doneHighlights = Array.isArray(retro.done_highlights) ? retro.done_highlights : [];
    const wentWell = Array.isArray(retro.went_well) ? retro.went_well : [];
    const blockers = Array.isArray(retro.blockers) ? retro.blockers : [];
    const improvements = Array.isArray(retro.improvements) ? retro.improvements : [];

    return (
        <div className="space-y-4">
            {/* Human Summary Lead */}
            <section className="rounded-md border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2.5 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-gray-700 dark:text-gray-200" aria-hidden="true" />
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {retro.label} Retrospective
                        </h2>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                            {retro.range_label}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                        <span>
                            <strong className="text-gray-900 dark:text-gray-100">{retro.completed_count ?? 0}</strong> completed
                        </span>
                        <span>·</span>
                        <span>
                            <strong className="text-gray-900 dark:text-gray-100">{retro.completed_focus_count ?? 0}</strong> focuses closed
                        </span>
                    </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                    {retro.summary}
                </p>
            </section>

            {/* Structured Human Reflection Grid */}
            <div className="grid gap-4 lg:grid-cols-2 items-start">
                {/* What Went Well */}
                <section className="rounded-md border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2.5 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        What Went Well
                    </h3>
                    {wentWell.length > 0 ? (
                        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                            {wentWell.map((line, idx) => (
                                <li key={idx} className="leading-relaxed">• {line}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-slate-400">No highlights recorded for this period yet.</p>
                    )}
                </section>

                {/* Blockers & Waiting */}
                <section className="rounded-md border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2.5 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        Blockers & Waiting
                    </h3>
                    {blockers.length > 0 ? (
                        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                            {blockers.map((line, idx) => (
                                <li key={idx} className="leading-relaxed">• {line}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            No active blockers or overdue commitments right now.
                        </p>
                    )}
                </section>

                {/* What to Improve */}
                <section className="rounded-md border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-2.5 flex items-center gap-1.5">
                        <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                        What to Improve
                    </h3>
                    {improvements.length > 0 ? (
                        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                            {improvements.map((line, idx) => (
                                <li key={idx} className="leading-relaxed">• {line}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-slate-400">No improvements flagged for this period.</p>
                    )}
                </section>

                {/* Completed Work Highlights */}
                <section className="rounded-md border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2.5">
                        Key Accomplishments
                    </h3>
                    {doneHighlights.length > 0 ? (
                        <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                            {doneHighlights.map((item) => (
                                <li key={item.id} className="py-1.5 first:pt-0 last:pb-0">
                                    <Link
                                        href={`/todos/${item.id}`}
                                        className="block truncate text-sm text-gray-800 hover:underline dark:text-gray-200"
                                    >
                                        {item.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            No completed tasks recorded in this window yet.
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}

export default function ReportsIndex({ retrospectives = {}, periodKind }) {
    const initialTab = ['daily', 'weekly', 'monthly'].includes(periodKind) ? periodKind : 'daily';
    const [activePeriod, setActivePeriod] = useState(initialTab);
    const activeRetro = retrospectives?.[activePeriod] || null;

    return (
        <DashboardLayout title="Reports">
            <div className="w-full px-4 sm:px-6 py-4 space-y-4">
                <header className="pb-3 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-3">
                        <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Reports</h1>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            Human-readable Daily, Weekly, and Monthly retrospectives — without raw machine noise.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/summary"
                            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                        >
                            Summary Charts
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                        <Link
                            href="/reports/technical"
                            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                        >
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            Technical Details & Raw Archive
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                    </div>
                </header>

                <nav aria-label="Retrospective periods" className="inline-flex rounded-md bg-gray-100 p-1 dark:bg-slate-900">
                    {PERIOD_TABS.map((tab) => {
                        const active = activePeriod === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActivePeriod(tab.key)}
                                className={`rounded px-3 py-1 text-xs font-semibold tracking-wide transition-colors ${
                                    active
                                        ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-800 dark:text-white'
                                        : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                <RetrospectiveCard retro={activeRetro} />
            </div>
        </DashboardLayout>
    );
}
