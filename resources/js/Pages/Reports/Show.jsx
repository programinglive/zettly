import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import DashboardLayout from '../../Layouts/DashboardLayout';
import ReportContent from '../../Components/ReportContent';
import { ArrowLeft, ChevronDown } from 'lucide-react';

const KIND_LABELS = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
};

/**
 * Format a period range the way the report headings read:
 * "Nov 8, 2026" for a single day, "Nov 2 – Nov 8, 2026" for a range.
 */
function formatPeriod(start, end, kind) {
    if (!start) {
        return '';
    }

    const locale = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

    if (kind === 'yearly') {
        return new Intl.DateTimeFormat('en', { year: 'numeric' }).format(new Date(`${start}T00:00:00`));
    }

    if (kind === 'monthly') {
        return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(`${start}T00:00:00`));
    }

    if (start === end) {
        return locale.format(new Date(`${start}T00:00:00`));
    }

    return `${locale.format(new Date(`${start}T00:00:00`))} – ${locale.format(new Date(`${end}T00:00:00`))}`;
}

const DETAILS_MARKER = '## Work by project';

export default function ReportsShow({ report }) {
    const generatedLabel = report.generated_at
        ? `Generated ${new Date(report.generated_at.replace(' ', 'T')).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
        : '';

    // The recap (title, headline stats and the human summary) stays visible;
    // the per-project drill-down is progressive disclosure.
    const markerIndex = typeof report.content === 'string' ? report.content.indexOf(DETAILS_MARKER) : -1;
    const leadContent = markerIndex > -1 ? report.content.slice(0, markerIndex) : report.content || '';
    const detailContent = markerIndex > -1 ? report.content.slice(markerIndex) : '';

    const [detailsOpen, setDetailsOpen] = useState(false);

    return (
        <DashboardLayout title={`${KIND_LABELS[report.period_kind] || 'Report'} — Zettly`}>
            <div className="mx-auto max-w-3xl space-y-6 py-8">
                <Link
                    href="/reports"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All reports
                </Link>

                <header className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                            {KIND_LABELS[report.period_kind] || report.period_kind}
                        </span>
                        <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                            {formatPeriod(report.period_start, report.period_end, report.period_kind)}
                        </h1>
                    </div>
                    {generatedLabel ? (
                        <span className="text-[11px] text-gray-400 dark:text-slate-500">{generatedLabel}</span>
                    ) : null}
                </header>

                <article className="rounded-lg border border-gray-200 bg-white px-5 py-6 dark:border-slate-800 dark:bg-slate-900">
                    <ReportContent content={leadContent} />

                    {detailContent ? (
                        <div className="mt-6 border-t border-gray-100 pt-4 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setDetailsOpen((open) => !open)}
                                aria-expanded={detailsOpen}
                                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300"
                            >
                                Full details
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {detailsOpen ? (
                                <div className="mt-4">
                                    <ReportContent content={detailContent} />
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </article>
            </div>
        </DashboardLayout>
    );
}
