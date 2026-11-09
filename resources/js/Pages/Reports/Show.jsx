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
const SUMMARY_MARKER = '## Summary';

/**
 * Remove the human summary section from the report lead so the digest can be
 * rendered once, from the structured recap, instead of twice.
 */
function stripSummarySection(content) {
    const start = content.indexOf(SUMMARY_MARKER);
    if (start === -1) {
        return content;
    }

    const after = content.slice(start + SUMMARY_MARKER.length);
    const nextHeading = after.search(/\n## /);
    const end = nextHeading === -1 ? after.length : nextHeading;

    return content.slice(0, start) + after.slice(end);
}

/**
 * Horizontal share bars: where the active time went. Pure CSS/Tailwind -
 * no chart library - so the monochrome design system stays intact.
 *
 * @param {{ name: string, minutes: number }[]} items
 */
function ShareBars({ items }) {
    if (!items.length) {
        return null;
    }

    const max = Math.max(...items.map((item) => item.minutes), 1);

    return (
        <div className="space-y-1.5">
            {items.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                    <span className="w-24 flex-shrink truncate text-[11px] font-medium text-gray-600 dark:text-slate-300">
                        {item.name}
                    </span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                        <div
                            className="h-full rounded-full bg-gray-900 dark:bg-white"
                            style={{ width: `${Math.max(Math.round((item.minutes / max) * 100), 2)}%` }}
                        />
                    </div>
                    <span className="w-12 flex-shrink text-right text-[11px] tabular-nums text-gray-400 dark:text-slate-500">
                        {item.minutes} min
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * A small labelled block of the "At a glance" panel.
 *
 * @param {string} label
 * @param {React.ReactNode} children
 */
function GlanceBlock({ label, children }) {
    return (
        <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                {label}
            </h3>
            {children}
        </div>
    );
}

/**
 * @param {{ name: string, count: number }[]} items
 */
function TagChips({ items }) {
    if (!items.length) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
                <span
                    key={item.name}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                    <span className="font-medium">{item.name}</span>
                    <span className="tabular-nums text-gray-400 dark:text-slate-500">{item.count}</span>
                </span>
            ))}
        </div>
    );
}

export default function ReportsShow({ report }) {
    const generatedLabel = report.generated_at
        ? `Generated ${new Date(report.generated_at.replace(' ', 'T')).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
        : '';

    // The recap (title, headline stats and the human summary) stays visible;
    // the per-project drill-down is progressive disclosure.
    const markerIndex = typeof report.content === 'string' ? report.content.indexOf(DETAILS_MARKER) : -1;
    const rawLead = markerIndex > -1 ? report.content.slice(0, markerIndex) : report.content || '';
    const detailContent = markerIndex > -1 ? report.content.slice(markerIndex) : '';

    // The digest and the "At a glance" numbers come from the structured
    // recap (report_summaries). The summary section is cut out of the lead
    // so it renders exactly once - the raw content below stays untouched.
    const headlineContent = stripSummarySection(rawLead).trim();
    const visuals = report.visuals || { projects: [], categories: [], tags: [] };
    const hasVisuals = visuals.projects.length > 0 || visuals.categories.length > 0 || visuals.tags.length > 0;
    const comparison = report.comparison || { lines: [], previous_label: null };

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
                    {report.digest ? (
                        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{report.digest}</p>
                    ) : null}

                    {hasVisuals ? (
                        <div className="mt-5 rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                            <div className="space-y-4">
                                {visuals.projects.length > 0 ? (
                                    <GlanceBlock label="Time by project">
                                        <ShareBars items={visuals.projects} />
                                    </GlanceBlock>
                                ) : null}
                                {visuals.categories.length > 0 ? (
                                    <GlanceBlock label="Time by category">
                                        <ShareBars items={visuals.categories} />
                                    </GlanceBlock>
                                ) : null}
                                {visuals.tags.length > 0 ? (
                                    <GlanceBlock label="Tags">
                                        <TagChips items={visuals.tags} />
                                    </GlanceBlock>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    {comparison.lines.length > 0 ? (
                        <div className="mt-5">
                            <div className="mb-1.5 flex items-baseline gap-2">
                                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                                    Historical comparison
                                </h3>
                                {comparison.previous_label ? (
                                    <span className="text-[11px] text-gray-400 dark:text-slate-500">
                                        vs {comparison.previous_label}
                                    </span>
                                ) : null}
                            </div>
                            <ul className="space-y-1">
                                {comparison.lines.map((line, i) => (
                                    <li key={i} className="text-xs leading-relaxed text-gray-600 dark:text-slate-300">{line}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {headlineContent ? <ReportContent content={headlineContent} /> : null}

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
