import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';

export default function Setup({ newToken, agentEnabled, repositoryRegistry = [] }) {
    return <AppLayout title="Coding Agent Setup">
        <Head title="Coding Agent Setup" />
        <div className="mx-auto max-w-3xl space-y-6 py-6 pb-20">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Coding Agent & Engineering Setup</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">The worker token grants job polling and reporting only. Release approval remains in your Zettly account.</p>
                </div>
                {agentEnabled && <Link href="/agent/jobs" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Open Engineering Hub →</Link>}
            </div>
            {!agentEnabled && <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">Agent jobs are disabled until the worker pilot is verified.</p>}
            {newToken && <section className="rounded-xl border border-amber-400 bg-amber-50 p-4">
                <h2 className="font-medium">New worker token</h2>
                <p className="mt-1 text-sm">Copy it now. This page will not show it again. Store it in the VM secret manager, never in a repository or chat.</p>
                <code className="mt-3 block break-all rounded bg-white p-3 text-xs select-all">{newToken}</code>
                <button type="button" onClick={() => navigator.clipboard.writeText(newToken)} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm text-white">Copy token</button>
            </section>}
            <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-base font-semibold">Worker Authentication (`zettly-coding-agent-1`)</h2>
                <p className="mt-1 text-xs text-gray-500">Issue or rotate the Sanctum worker token used by the GCE coding agent runner.</p>
                <button type="button" onClick={() => router.post('/agent/setup/worker-token')} className="mt-3 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">Issue or rotate worker token</button>
            </section>
            <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold">Registered Project & Repository Registry</h2>
                        <p className="text-xs text-gray-500">Centralized project registry (replaces Factory projects). Configured via <code className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">CODING_AGENT_REPOSITORIES</code>.</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">{repositoryRegistry.length} repos</span>
                </div>
                {repositoryRegistry.length === 0 ? (
                    <p className="text-sm text-gray-500">No repositories registered.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b text-gray-500 dark:border-gray-800">
                                    <th className="py-2 pr-3 font-medium">Slug</th>
                                    <th className="py-2 pr-3 font-medium">Remote Repository</th>
                                    <th className="py-2 pr-3 font-medium">Branch</th>
                                    <th className="py-2 pr-3 font-medium">Stack</th>
                                    <th className="py-2 font-medium">Verification Checks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-800">
                                {repositoryRegistry.map((repo) => (
                                    <tr key={repo.slug}>
                                        <td className="py-2.5 pr-3 font-mono font-semibold text-blue-700 dark:text-blue-400">{repo.slug}</td>
                                        <td className="py-2.5 pr-3 font-mono">{repo.remote}</td>
                                        <td className="py-2.5 pr-3"><span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-800">{repo.base}</span></td>
                                        <td className="py-2.5 pr-3">{repo.stack}</td>
                                        <td className="py-2.5 font-mono text-gray-600 dark:text-gray-400">{repo.checks || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    </AppLayout>;
}
