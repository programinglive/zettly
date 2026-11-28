import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';

const STATUS_STYLES = {
    SUCCESS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    FRESH: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    FAILED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    RUNNING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    QUEUED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    SKIPPED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    UNKNOWN: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    STALE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'code_graph', label: 'Zettly Code Graph' },
    { id: 'cicd', label: 'CI/CD' },
    { id: 'tests', label: 'Tests & Builds' },
    { id: 'releases', label: 'Releases & Deployments' },
    { id: 'agents', label: 'Agent Sessions' },
    { id: 'health', label: 'Runtime Health' },
    { id: 'activity', label: 'Activity & Evidence' },
];

function StatusBadge({ status }) {
    const key = String(status || 'UNKNOWN').toUpperCase();
    const cls = STATUS_STYLES[key] || STATUS_STYLES.UNKNOWN;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
            {key}
        </span>
    );
}

export default function EngineeringIndex({ projects = [] }) {
    const [selectedSlug, setSelectedSlug] = useState(projects[0]?.slug || null);
    const [activeTab, setActiveTab] = useState('overview');

    const selected = useMemo(
        () => projects.find((p) => p.slug === selectedSlug) || projects[0] || null,
        [projects, selectedSlug]
    );

    const fleetCodeStats = useMemo(() => {
        return projects.reduce(
            (acc, p) => {
                const s = p.code_graph?.stats;
                if (s) {
                    acc.indexedRepos += 1;
                    acc.files += Number(s.files_indexed || 0);
                    acc.symbols += Number(s.symbols_count || 0);
                    acc.edges += Number(s.relationships_count || 0);
                    acc.tests += Number(s.test_links_count || 0);
                    acc.annotations += Number(s.knowledge_annotations_count || 0);
                    acc.bugFixes += Number(s.bug_fixes_count || 0);
                }
                return acc;
            },
            { indexedRepos: 0, files: 0, symbols: 0, edges: 0, tests: 0, annotations: 0, bugFixes: 0 }
        );
    }, [projects]);

    const timeline = selected?.timeline || [];
    const testAndBuildEvents = timeline.filter((e) => ['ci', 'build'].includes(e.stage));
    const releaseAndDeployEvents = timeline.filter((e) => ['release', 'deploy', 'verify'].includes(e.stage));
    const selectedGraph = selected?.code_graph || null;

    return (
        <AppLayout title="Engineering Control Center">
            <Head title="Engineering Control Center" />
            <div className="w-full space-y-6 px-4 py-4 sm:px-6 [&_a]:min-h-[44px] [&_button]:min-h-[44px]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Engineering Control Center
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Centralized CI/CD, release drift, runtime health, and multi-device Zettly Code Knowledge Graph telemetry.
                        </p>
                    </div>
                    <a
                        href="https://github.com/programinglive/zettly-code"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90"
                    >
                        @programinglive/zettly-code (Open Source MIT)
                    </a>
                </div>

                {/* Fleet-Wide Zettly Code Knowledge Graph Summary Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3.5 border border-gray-200 dark:border-gray-700">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Indexed Repos
                        </div>
                        <div className="mt-1 text-xl font-bold font-mono text-gray-900 dark:text-white">
                            {fleetCodeStats.indexedRepos} / {projects.length}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3.5 border border-gray-200 dark:border-gray-700">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Source Files
                        </div>
                        <div className="mt-1 text-xl font-bold font-mono text-gray-900 dark:text-white">
                            {fleetCodeStats.files.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3.5 border border-gray-200 dark:border-gray-700">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Code Symbols
                        </div>
                        <div className="mt-1 text-xl font-bold font-mono text-gray-900 dark:text-white">
                            {fleetCodeStats.symbols.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3.5 border border-gray-200 dark:border-gray-700">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Graph Edges
                        </div>
                        <div className="mt-1 text-xl font-bold font-mono text-gray-900 dark:text-white">
                            {fleetCodeStats.edges.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3.5 border border-gray-200 dark:border-gray-700">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Test Links
                        </div>
                        <div className="mt-1 text-xl font-bold font-mono text-gray-900 dark:text-white">
                            {fleetCodeStats.tests.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3.5 border border-gray-200 dark:border-gray-700">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            @zettly-code Memory
                        </div>
                        <div className="mt-1 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {fleetCodeStats.annotations.toLocaleString()}
                        </div>
                    </div>
                </div>

                {projects.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                        No engineering projects registered yet.
                    </div>
                ) : (
                    <>
                        {/* Overview Project Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((proj) => {
                                const isActive = selected?.slug === proj.slug;
                                const cg = proj.code_graph?.stats;
                                return (
                                    <button
                                        key={proj.slug}
                                        type="button"
                                        onClick={() => setSelectedSlug(proj.slug)}
                                        className={`text-left rounded-xl p-5 border transition-all ${
                                            isActive
                                                ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-500 shadow-sm'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    {proj.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                    {proj.repo_full_name} ({proj.default_branch})
                                                </div>
                                            </div>
                                            <StatusBadge status={proj.code_graph?.freshness_status || (proj.is_stale ? 'STALE' : proj.ci_state)} />
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Latest Release: </span>
                                                <span className="font-mono text-gray-900 dark:text-gray-100">
                                                    {proj.latest_release_tag || 'None'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Deployed: </span>
                                                <span className="font-mono text-gray-900 dark:text-gray-100">
                                                    {proj.deployed_tag || 'Not deployed'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">GitHub: </span>
                                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                                    {proj.github_status}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">MCP: </span>
                                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                                    {proj.mcp?.status || 'not_connected'}
                                                </span>
                                            </div>
                                        </div>

                                        {cg && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-gray-600 dark:text-gray-300">
                                                <span>{cg.files_indexed} files · {cg.symbols_count} symbols</span>
                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    {cg.relationships_count} edges · {cg.knowledge_annotations_count} @zettly-code
                                                </span>
                                            </div>
                                        )}

                                        {proj.drift?.has_drift && (
                                            <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                                                {proj.drift.summary}
                                            </div>
                                        )}

                                        {proj.blocking_incident && !proj.drift?.has_drift && (
                                            <div className="mt-3 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 px-3 py-2 text-xs text-rose-800 dark:text-rose-200">
                                                Blocked: {proj.blocking_incident}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Project Detail */}
                        {selected && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {selected.name} — {selected.environment}
                                        </h2>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Last synced: {selected.code_graph?.synced_at || selected.last_synced_at || 'Never synced (Not connected / Stale)'}
                                            {selected.code_graph?.machine ? ` · Machine: ${selected.code_graph.machine}` : ''}
                                            {selected.code_graph?.revision ? ` · SHA: ${selected.code_graph.revision.slice(0, 8)}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {TABS.map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                    activeTab === tab.id
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6">
                                    {activeTab === 'overview' && (
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 space-y-1">
                                                <div className="text-xs text-gray-500 dark:text-gray-400">CI / Test / Build</div>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    <StatusBadge status={selected.ci_state} />
                                                    <StatusBadge status={selected.test_state} />
                                                    <StatusBadge status={selected.build_state} />
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 space-y-1">
                                                <div className="text-xs text-gray-500 dark:text-gray-400">Zettly Code Graph</div>
                                                <div className="font-mono font-medium text-gray-900 dark:text-white">
                                                    {selectedGraph
                                                        ? `${selectedGraph.stats?.files_indexed || 0} files · ${selectedGraph.stats?.symbols_count || 0} symbols`
                                                        : 'Not indexed yet'}
                                                </div>
                                                {selectedGraph && (
                                                    <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                                                        {selectedGraph.stats?.relationships_count || 0} edges · {selectedGraph.stats?.knowledge_annotations_count || 0} @zettly-code
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 space-y-1">
                                                <div className="text-xs text-gray-500 dark:text-gray-400">Deployment Drift</div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {selected.drift?.has_drift
                                                        ? selected.drift.summary
                                                        : 'In sync (or no published release drift)'}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 space-y-1">
                                                <div className="text-xs text-gray-500 dark:text-gray-400">Active Agents & Jobs</div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {(selected.active_agents?.length || 0)} active sessions · {(selected.active_jobs?.length || 0)} jobs
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'code_graph' && (
                                        <div className="space-y-6 text-sm">
                                            {!selectedGraph ? (
                                                <p className="text-gray-500 dark:text-gray-400">
                                                    No Zettly Code knowledge graph snapshot synced for this repository yet. Run <code>code_index(mode=&quot;initialize&quot;)</code> to sync.
                                                </p>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">Files Indexed</div>
                                                            <div className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                                                                {selectedGraph.stats?.files_indexed ?? 0}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">Symbols / Entities</div>
                                                            <div className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                                                                {selectedGraph.stats?.symbols_count ?? 0}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">Relationships</div>
                                                            <div className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                                                                {selectedGraph.stats?.relationships_count ?? 0}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">Test Coverage Links</div>
                                                            <div className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                                                                {selectedGraph.stats?.test_links_count ?? 0}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">@zettly-code Notes</div>
                                                            <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                                                {selectedGraph.stats?.knowledge_annotations_count ?? 0}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">Synced Revision</div>
                                                            <div className="text-sm font-bold font-mono text-gray-900 dark:text-white truncate">
                                                                {selectedGraph.revision ? selectedGraph.revision.slice(0, 10) : 'HEAD'} ({selectedGraph.machine || 'local'})
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                            Synced @zettly-code Knowledge Annotations ({(selectedGraph.annotations || []).length})
                                                        </h3>
                                                        {(selectedGraph.annotations || []).length === 0 ? (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                No @zettly-code annotations recorded in this repository yet. Bugfix commits will automatically populate this memory.
                                                            </p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {selectedGraph.annotations.map((ann) => (
                                                                    <div
                                                                        key={ann.id}
                                                                        className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 space-y-1.5"
                                                                    >
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                                                {ann.id}
                                                                            </span>
                                                                            <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                                                {ann.file_path || ann.filePath}
                                                                            </span>
                                                                        </div>
                                                                        {ann.purpose && (
                                                                            <div className="text-xs text-gray-800 dark:text-gray-200 font-medium">
                                                                                {ann.purpose}
                                                                            </div>
                                                                        )}
                                                                        {ann.invariant && (
                                                                            <div className="text-[11px] text-amber-700 dark:text-amber-300">
                                                                                <strong>Invariant:</strong> {ann.invariant}
                                                                            </div>
                                                                        )}
                                                                        {(ann.root_cause || ann.rootCause) && (
                                                                            <div className="text-[11px] text-rose-700 dark:text-rose-300">
                                                                                <strong>Root cause:</strong> {ann.root_cause || ann.rootCause}
                                                                            </div>
                                                                        )}
                                                                        {ann.fix && (
                                                                            <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                                                                <strong>Fix:</strong> {ann.fix}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {(activeTab === 'cicd' || activeTab === 'tests' || activeTab === 'releases' || activeTab === 'activity') && (
                                        <div className="space-y-3">
                                            {(activeTab === 'tests'
                                                ? testAndBuildEvents
                                                : activeTab === 'releases'
                                                    ? releaseAndDeployEvents
                                                    : timeline
                                            ).length === 0 ? (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    No recorded pipeline events for this view yet.
                                                </p>
                                            ) : (
                                                (activeTab === 'tests'
                                                    ? testAndBuildEvents
                                                    : activeTab === 'releases'
                                                        ? releaseAndDeployEvents
                                                        : timeline
                                                ).map((ev) => (
                                                    <div
                                                        key={ev.id}
                                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                                                    >
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="uppercase text-xs font-mono text-gray-500 dark:text-gray-400">
                                                                    {ev.stage}
                                                                </span>
                                                                <StatusBadge status={ev.status} />
                                                                <span className="font-medium text-gray-900 dark:text-white">
                                                                    {ev.workflow_name || ev.stage}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                                {ev.commit_sha ? ev.commit_sha.slice(0, 7) : 'no-sha'} · {ev.occurred_at || 'unknown time'} · {ev.source_provenance}
                                                            </div>
                                                            {ev.error_summary && (
                                                                <div className="text-xs text-rose-600 dark:text-rose-400">
                                                                    {ev.error_summary}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {ev.source_url && (
                                                            <a
                                                                href={ev.source_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                                                            >
                                                                View source →
                                                            </a>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'agents' && (
                                        <div className="space-y-3 text-sm">
                                            {(selected.active_agents || []).length === 0 ? (
                                                <p className="text-gray-500 dark:text-gray-400">No active agent sessions.</p>
                                            ) : (
                                                selected.active_agents.map((s) => (
                                                    <div key={s.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between">
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{s.title}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {s.machine} · {s.project} · {s.status}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                            {s.last_activity_at}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'health' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1">
                                                <div className="text-xs text-gray-500 dark:text-gray-400">Runtime Health</div>
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    {selected.runtime_health_status}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    Target URL: {selected.target_url || 'Not configured'}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1">
                                                <div className="text-xs text-gray-500 dark:text-gray-400">MCP Contract Health</div>
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    {selected.mcp?.status || 'not_connected'} {selected.mcp?.version ? `(${selected.mcp.version})` : ''}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    Tools: {selected.mcp?.tools_count ?? 0} · Prompts: {selected.mcp?.prompts_count ?? 0}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
