import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';

export default function Setup({ newToken, agentEnabled }) {
    return <AppLayout title="Coding Agent Setup">
        <Head title="Coding Agent Setup" />
        <div className="mx-auto max-w-2xl space-y-5 py-6 pb-20">
            <h1 className="text-2xl font-semibold">Coding Agent Setup</h1>
            <p className="text-sm text-gray-600">The worker token grants job polling and reporting only. Release approval remains in your Zettly account.</p>
            {!agentEnabled && <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">Agent jobs are disabled until the worker pilot is verified.</p>}
            {newToken && <section className="rounded-xl border border-amber-400 bg-amber-50 p-4">
                <h2 className="font-medium">New worker token</h2>
                <p className="mt-1 text-sm">Copy it now. This page will not show it again. Store it in the VM secret manager, never in a repository or chat.</p>
                <code className="mt-3 block break-all rounded bg-white p-3 text-xs select-all">{newToken}</code>
                <button type="button" onClick={() => navigator.clipboard.writeText(newToken)} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm text-white">Copy token</button>
            </section>}
            <button type="button" onClick={() => router.post('/agent/setup/worker-token')} className="rounded-lg border px-4 py-3 text-sm font-medium">Issue or rotate worker token</button>
            {agentEnabled && <Link href="/agent/jobs" className="block text-sm text-blue-700">Open jobs →</Link>}
        </div>
    </AppLayout>;
}
