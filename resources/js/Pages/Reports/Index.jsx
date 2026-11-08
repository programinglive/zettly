import React, { useMemo } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import DashboardLayout from '../../Layouts/DashboardLayout';
import { Zap, Inbox, Radio } from 'lucide-react';
import { Button } from '../../Components/ui/button';

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

    const startLocale = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });
    const monthLocale = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });

    if (kind === 'yearly') {
        return new Intl.DateTimeFormat('en', { year: 'numeric' }).format(new Date(`${start}T00:00:00`));
    }

    if (kind === 'monthly') {
        return monthLocale.format(new Date(`${start}T00:00:00`));
    }

    if (start === end) {
        return startLocale.format(new Date(`${start}T00:00:00`));
    }

    return `${startLocale.format(new Date(`${start}T00:00:00`))} – ${startLocale.format(new Date(`${end}T00:00:00`))}`;
}

export default function ReportsIndex({ reports, channels, periodKind, kinds }) {
    const activeKind = periodKind || 'all';
    const generateForm = useForm();

    const handleSelectKind = (kind) => {
        const url = kind === 'all' ? '/reports' : `/reports?period_kind=${kind}`;

        router.get(url, {}, { preserveState: true, only: ['reports', 'periodKind'] });
    };

    const handleGenerateNow = () => {
        generateForm.post('/reports/generate', {
            preserveScroll: true,
            onSuccess: () => generateForm.reset(),
        });
    };

    const tabs = useMemo(() => ['all', ...(kinds || [])], [kinds]);

    return (
        <DashboardLayout title="Reports">
            <div className="mx-auto max-w-3xl space-y-6 py-8">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Reports</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                            Recaps of your work, generated automatically every night at 23:55 (WIB).
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateNow}
                        disabled={generateForm.processing}
                        title="Regenerate today's daily report and send it to your delivery channels"
                    >
                        <Zap className="h-3.5 w-3.5" />
                        {generateForm.processing ? 'Generating…' : 'Generate now'}
                    </Button>
                </header>

                {Array.isArray(channels) && channels.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                        <Radio className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
                        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Delivery</span>
                        {channels.map((channel) => (
                            <span
                                key={channel.channel}
                                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${channel.enabled
                                    ? 'border-gray-300 bg-gray-50 text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300'
                                    : 'border-dashed border-gray-300 text-gray-400 dark:border-slate-700 dark:text-slate-500'
                                }`}
                            >
                                {channel.channel} {channel.enabled ? 'on' : 'off'}
                            </span>
                        ))}
                    </div>
                ) : null}

                <nav aria-label="Report periods" className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-900">
                    {tabs.map((kind) => {
                        const active = activeKind === kind;

                        return (
                            <button
                                key={kind}
                                onClick={() => handleSelectKind(kind)}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${active
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-800 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                {kind === 'all' ? 'All' : KIND_LABELS[kind] || kind}
                            </button>
                        );
                    })}
                </nav>

                {Array.isArray(reports) && reports.length > 0 ? (
                    <ul className="space-y-2">
                        {reports.map((report) => (
                            <li key={report.id}>
                                <Link
                                    href={`/reports/${report.id}`}
                                    className="group block rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                                                {KIND_LABELS[report.period_kind] || report.period_kind}
                                            </span>
                                            <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                                {formatPeriod(report.period_start, report.period_end, report.period_kind)}
                                            </span>
                                        </div>
                                        <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-slate-500">
                                            {report.generated_at ? new Date(report.generated_at.replace(' ', 'T')).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}
                                        </span>
                                    </div>
                                    {report.summary ? (
                                        <p className="mt-1.5 truncate text-xs text-gray-500 dark:text-slate-400">{report.summary}</p>
                                    ) : null}
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
                        <Inbox className="h-8 w-8 text-gray-300 dark:text-slate-600" />
                        <h2 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                            {activeKind === 'all' ? 'No reports yet' : `No ${KIND_LABELS[activeKind] || activeKind} reports yet`}
                        </h2>
                        <p className="mt-1 max-w-sm text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                            Recaps are generated every night at 23:55 (WIB). Use "Generate now" to create today's report right away.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
