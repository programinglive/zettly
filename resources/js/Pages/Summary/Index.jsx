import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    BarChart3,
    CheckCircle2,
    FolderKanban,
    TrendingUp,
    TrendingDown,
    Clock,
    Sparkles,
    ArrowRight,
    Target,
} from 'lucide-react';
import DashboardLayout from '../../Layouts/DashboardLayout';

const WINDOW_OPTIONS = [
    { days: 7, label: '7 Days' },
    { days: 30, label: '30 Days' },
    { days: 90, label: '90 Days' },
];

/**
 * Pure-SVG Donut Chart for Project Distribution (zero external chart dependencies).
 */
function ProjectDonutChart({ projects = [] }) {
    const total = projects.reduce((sum, item) => sum + (item.total || 0), 0);
    const size = 168;
    const strokeWidth = 22;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    if (!projects.length || total === 0) {
        return (
            <div className="flex h-44 items-center justify-center text-xs text-gray-400 dark:text-slate-500">
                No project activity recorded in this window.
            </div>
        );
    }

    let offset = 0;

    return (
        <div className="relative mx-auto flex h-[168px] w-[168px] items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label="Projects worked on chart">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-gray-100 dark:text-slate-800"
                />
                {projects.map((project) => {
                    const fraction = (project.total || 0) / total;
                    const dashLength = Math.max(fraction * circumference, 2);
                    const dashOffset = -offset;
                    offset += fraction * circumference;

                    return (
                        <circle
                            key={project.key}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={project.color || '#3B82F6'}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${dashLength} ${circumference}`}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="butt"
                        >
                            <title>{`${project.label}: ${project.total} tasks (${project.share_pct}%)`}</title>
                        </circle>
                    );
                })}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{total}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    tasks
                </span>
            </div>
        </div>
    );
}

/**
 * Pure-SVG Daily Completion Trend Bar Chart.
 */
function CompletionTrendChart({ dailyTrend = [], peakDay = {} }) {
    const maxCount = Math.max(...dailyTrend.map((d) => d.count || 0), 1);
    const hasActivity = dailyTrend.some((d) => (d.count || 0) > 0);

    if (!dailyTrend.length || !hasActivity) {
        return (
            <div className="flex h-36 items-center justify-center text-xs text-gray-400 dark:text-slate-500">
                No completed tasks in this window yet.
            </div>
        );
    }

    const firstLabel = dailyTrend[0]?.label || '';
    const midLabel = dailyTrend[Math.floor(dailyTrend.length / 2)]?.label || '';
    const lastLabel = dailyTrend[dailyTrend.length - 1]?.label || '';

    return (
        <div className="space-y-2">
            <div className="flex h-36 items-end gap-[2px] pt-2" role="img" aria-label="Daily task completion trend">
                {dailyTrend.map((day) => {
                    const heightPct = day.count > 0 ? Math.max(Math.round((day.count / maxCount) * 100), 10) : 3;
                    const isPeak = peakDay?.date && day.date === peakDay.date && day.count > 0;
                    return (
                        <div
                            key={day.date}
                            className="group relative flex h-full flex-1 flex-col items-center justify-end"
                            title={`${day.label}: ${day.count} completed`}
                        >
                            <div
                                className={`w-full rounded-t-sm transition-all ${
                                    day.count === 0
                                        ? 'bg-gray-100 dark:bg-slate-800/70'
                                        : isPeak
                                            ? 'bg-emerald-500 dark:bg-emerald-400'
                                            : 'bg-gray-900/80 group-hover:bg-blue-600 dark:bg-gray-200/80 dark:group-hover:bg-blue-400'
                                }`}
                                style={{ height: `${heightPct}%` }}
                            />
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500">
                <span>{firstLabel}</span>
                <span>{midLabel}</span>
                <span>{lastLabel}</span>
            </div>
        </div>
    );
}

function KpiCard({ label, value, subtext, icon: Icon, badge }) {
    return (
        <div className="rounded-md border border-gray-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    {label}
                </span>
                {Icon ? <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" aria-hidden="true" /> : null}
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{value}</span>
                {badge}
            </div>
            {subtext ? (
                <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">{subtext}</p>
            ) : null}
        </div>
    );
}

export default function SummaryIndex({ days = 30, summary = {} }) {
    const kpis = summary?.kpis || {};
    const projects = Array.isArray(summary?.projects) ? summary.projects : [];
    const dailyTrend = Array.isArray(summary?.daily_trend) ? summary.daily_trend : [];
    const peakDay = summary?.peak_day || {};
    const priorityMix = Array.isArray(summary?.priority_mix) ? summary.priority_mix : [];
    const workTypes = Array.isArray(summary?.work_types) ? summary.work_types : [];
    const activeFocuses = Array.isArray(summary?.active_focuses) ? summary.active_focuses : [];

    const handleChangeWindow = (nextDays) => {
        router.get('/summary', { days: nextDays }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const deltaPct = kpis.completed_delta_pct ?? 0;
    const hasPrev = (kpis.prev_completed_tasks ?? 0) > 0;
    const deltaBadge = hasPrev ? (
        <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                deltaPct >= 0
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
            }`}
        >
            {deltaPct >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}
        </span>
    ) : null;

    const totalPriorityCount = priorityMix.reduce((sum, p) => sum + (p.count || 0), 0);

    return (
        <DashboardLayout title="Summary">
            <Head title="Summary" />
            <div className="w-full px-4 sm:px-6 py-4 space-y-4">
                {/* Compact Notion-Style Header */}
                <header className="pb-3 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-3">
                        <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                            Summary
                        </h1>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                            {summary?.range_label || `Last ${days} days`} · projects, velocity & focus health
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-md bg-gray-100 p-0.5 dark:bg-slate-900" role="group" aria-label="Summary timeframe">
                            {WINDOW_OPTIONS.map((opt) => (
                                <button
                                    key={opt.days}
                                    type="button"
                                    onClick={() => handleChangeWindow(opt.days)}
                                    className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                                        days === opt.days
                                            ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-800 dark:text-white'
                                            : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <Link
                            href="/reports"
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
                        >
                            Retrospectives
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </header>

                {/* Human Executive Takeaway */}
                {summary?.takeaway ? (
                    <section className="rounded-md border border-gray-200 bg-gray-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="flex items-start gap-2.5">
                            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gray-600 dark:text-gray-300" aria-hidden="true" />
                            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                                {summary.takeaway}
                            </p>
                        </div>
                    </section>
                ) : null}

                {/* Row 1: 4 Executive KPIs */}
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Executive KPIs">
                    <KpiCard
                        label="Tasks Completed"
                        value={kpis.completed_tasks ?? 0}
                        badge={deltaBadge}
                        subtext={`Avg ${kpis.avg_per_day ?? 0} tasks/day · ${kpis.open_tasks ?? 0} open now`}
                        icon={CheckCircle2}
                    />
                    <KpiCard
                        label="Active Projects"
                        value={kpis.active_projects ?? 0}
                        subtext={projects[0] ? `Top: ${projects[0].label} (${projects[0].share_pct}%)` : 'Tag tasks with proyek:* to group'}
                        icon={FolderKanban}
                    />
                    <KpiCard
                        label="Focuses Closed"
                        value={kpis.closed_focuses ?? 0}
                        subtext={`${kpis.active_focuses ?? 0} active focuses in progress`}
                        icon={Target}
                    />
                    <KpiCard
                        label="Schedule Health"
                        value={(kpis.overdue_tasks ?? 0) === 0 ? 'On Track' : `${kpis.overdue_tasks} Overdue`}
                        subtext={`${kpis.external_waiting_tasks ?? 0} external waiting tracked`}
                        icon={Clock}
                    />
                </section>

                {/* Row 2: Projects Worked On (Donut + Horizontal Bar Breakdown) */}
                <section className="rounded-md border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-label="Projects Worked On">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-gray-600 dark:text-gray-300" aria-hidden="true" />
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                                Projects Worked On
                            </h2>
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-slate-500">
                            Grouped by proyek:* tags (fallback to Focus)
                        </span>
                    </div>

                    <div className="mt-4 grid gap-6 lg:grid-cols-12 items-center">
                        <div className="lg:col-span-4">
                            <ProjectDonutChart projects={projects} />
                        </div>

                        <div className="lg:col-span-8 space-y-2.5">
                            {projects.length > 0 ? (
                                projects.map((project) => {
                                    const href = project.tag_id ? `/todos?tags[]=${project.tag_id}` : '/todos';
                                    const maxTotal = Math.max(...projects.map((p) => p.total || 0), 1);
                                    const barWidth = Math.max(Math.round((project.total / maxTotal) * 100), 4);
                                    const doneWidth = project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0;

                                    return (
                                        <Link
                                            key={project.key}
                                            href={href}
                                            className="block rounded-md px-2 py-1.5 transition hover:bg-gray-50 dark:hover:bg-slate-800/50"
                                        >
                                            <div className="flex items-center justify-between gap-3 text-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                        style={{ backgroundColor: project.color || '#3B82F6' }}
                                                    />
                                                    <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                                                        {project.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-slate-400">
                                                    <span>{project.completed} done</span>
                                                    <span>·</span>
                                                    <span>{project.open} open</span>
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100 w-9 text-right">
                                                        {project.share_pct}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-1.5 h-2 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full relative overflow-hidden"
                                                    style={{
                                                        width: `${barWidth}%`,
                                                        backgroundColor: `${project.color || '#3B82F6'}35`,
                                                    }}
                                                >
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${doneWidth}%`,
                                                            backgroundColor: project.color || '#3B82F6',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    No project activity recorded yet. Tag tasks with <code>proyek:*</code> or assign them to a Focus.
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Row 3: Daily Completion Trend + Priority & Work Type Mix */}
                <div className="grid gap-4 lg:grid-cols-12 items-start">
                    <section className="lg:col-span-7 rounded-md border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-label="Daily Completion Trend">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                                Daily Completion Trend
                            </h2>
                            {peakDay?.count > 0 ? (
                                <span className="text-[11px] text-gray-500 dark:text-slate-400">
                                    Peak: <strong className="text-emerald-600 dark:text-emerald-400">{peakDay.count}</strong> on {peakDay.label}
                                </span>
                            ) : null}
                        </div>
                        <div className="mt-3">
                            <CompletionTrendChart dailyTrend={dailyTrend} peakDay={peakDay} />
                        </div>
                    </section>

                    <section className="lg:col-span-5 rounded-md border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-4" aria-label="Priority and Work Mix">
                        <div>
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-200 pb-2 border-b border-gray-100 dark:border-slate-800">
                                Priority Balance (P0–P3)
                            </h2>

                            {totalPriorityCount > 0 ? (
                                <>
                                    <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                                        {priorityMix.filter((p) => p.count > 0).map((p) => (
                                            <div
                                                key={p.tier}
                                                style={{ width: `${p.share_pct}%`, backgroundColor: p.color }}
                                                title={`${p.label}: ${p.count} (${p.share_pct}%)`}
                                            />
                                        ))}
                                    </div>
                                    <ul className="mt-3 space-y-1.5">
                                        {priorityMix.filter((p) => p.count > 0).map((p) => (
                                            <li key={p.tier} className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                    {p.label}
                                                </span>
                                                <span className="tabular-nums text-gray-500 dark:text-slate-400">
                                                    {p.count} ({p.share_pct}%)
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">No prioritized tasks in this window.</p>
                            )}
                        </div>

                        {workTypes.length > 0 ? (
                            <div className="border-t border-gray-100 pt-3 dark:border-slate-800">
                                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                    Work Types (tipe:*)
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {workTypes.map((wt) => (
                                        <span
                                            key={wt.key}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: wt.color }} />
                                            <span>{wt.label}</span>
                                            <span className="tabular-nums text-gray-400 dark:text-slate-500">{wt.share_pct}%</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </section>
                </div>

                {/* Row 4: Active Focuses Snapshot */}
                <section className="rounded-md border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-label="Active Focuses Health">
                    <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-slate-800">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                            Active Focuses Snapshot
                        </h2>
                        <Link href="/dashboard" className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white">
                            Open Today →
                        </Link>
                    </div>
                    {activeFocuses.length > 0 ? (
                        <ul className="mt-2 divide-y divide-gray-100 dark:divide-slate-800">
                            {activeFocuses.map((focus) => (
                                <li key={focus.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                                    <Link href={`/focus/${focus.id}`} className="text-sm font-medium text-gray-900 hover:underline dark:text-gray-100 truncate">
                                        {focus.title}
                                    </Link>
                                    <div className="flex items-center gap-2 text-xs tabular-nums text-gray-500 dark:text-slate-400">
                                        <span>{focus.open_tasks_count} open · {focus.completed_tasks_count} done</span>
                                        {focus.progress_percent !== null ? (
                                            <span className="font-semibold text-gray-900 dark:text-gray-100">{focus.progress_percent}%</span>
                                        ) : null}
                                        {focus.ready_to_close ? (
                                            <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                Ready to close
                                            </span>
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                            No active focuses right now.
                        </p>
                    )}
                </section>
            </div>
        </DashboardLayout>
    );
}
