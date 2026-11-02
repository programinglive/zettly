import React from 'react';
import { Head, router } from '@inertiajs/react';
import DashboardLayout from '../../Layouts/DashboardLayout';
import { BookOpen, Calendar, Filter, Search, Tag as TagIcon } from 'lucide-react';
import { Button } from '../../Components/ui/button';

/**
 * Journal timeline.
 *
 * The entries existed since the legacy import, but only through the API — there
 * was no page, so /journal returned 404. Read-only by design: entries are
 * written by the agent hook and the importer, not by hand.
 */

const KIND_STYLES = {
    activity: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    decision: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    blocker: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    outcome: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    handoff: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
};

const formatDate = (value) => {
    if (!value) return 'undated';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const preview = (text, limit = 320) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > limit ? `${clean.slice(0, limit).trim()}…` : clean;
};

export default function JournalIndex({ entries, filters = {}, kinds = [], stats = {}, tags = [] }) {
    const rows = entries?.data ?? [];
    const isPaginated = !!entries?.data;

    const apply = (patch) => {
        const next = { ...filters, ...patch };
        Object.keys(next).forEach((k) => {
            if (!next[k]) delete next[k];
        });
        router.get('/journal', next, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <DashboardLayout title="Journal">
            <Head title="Journal" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                        <BookOpen className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                            Activity log
                        </span>
                    </div>
                    <h1 className="mt-4 text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                        Journal
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                        {stats?.total ?? 0} entries recorded
                        {stats?.first ? ` · ${formatDate(stats.first)} → ${formatDate(stats.last)}` : ''}
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            defaultValue={filters?.q ?? ''}
                            placeholder="Search entries…"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') apply({ q: e.currentTarget.value });
                            }}
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-slate-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={filters?.kind ?? ''}
                            onChange={(e) => apply({ kind: e.target.value })}
                            className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                        >
                            <option value="">All kinds</option>
                            {kinds.map((k) => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>

                        {(filters?.kind || filters?.q || filters?.source) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.get('/journal', {}, { preserveScroll: true, replace: true })}
                            >
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Entries */}
                {rows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-12 text-center">
                        <BookOpen className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600" />
                        <p className="mt-4 text-sm text-gray-600 dark:text-slate-400">
                            No journal entries match this filter.
                        </p>
                    </div>
                ) : (
                    <ol className="relative border-l border-gray-200 dark:border-slate-800 ml-2 space-y-8">
                        {rows.map((entry) => (
                            <li key={entry.id} className="ml-6">
                                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-gray-300 dark:bg-slate-600" />
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${KIND_STYLES[entry.kind] ?? 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                        {entry.kind}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(entry.entry_date)}
                                    </span>
                                    {entry.source && (
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                                            <TagIcon className="w-3 h-3" />
                                            {entry.source}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm leading-relaxed text-gray-800 dark:text-slate-200 whitespace-pre-line">
                                    {preview(entry.content)}
                                </p>
                            </li>
                        ))}
                    </ol>
                )}

                {/* Pagination */}
                {isPaginated && entries.last_page > 1 && (
                    <div className="mt-10 flex items-center justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!entries.prev_page_url}
                            onClick={() => entries.prev_page_url && router.get(entries.prev_page_url, {}, { preserveScroll: true })}
                        >
                            Previous
                        </Button>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                            Page {entries.current_page} of {entries.last_page}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!entries.next_page_url}
                            onClick={() => entries.next_page_url && router.get(entries.next_page_url, {}, { preserveScroll: true })}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
