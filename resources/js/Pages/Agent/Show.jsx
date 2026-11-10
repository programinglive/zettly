import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import { canApprove, heartbeatLabel, statusLabel } from './jobView';

export default function Show({ job, events }) {
    const instruction = useForm({ instruction: '' });
    const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        const timer = window.setInterval(() => {
            setNow(Date.now());
            if (navigator.onLine && !document.hidden) router.reload({ only: ['job', 'events'] });
        }, 15000);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
            window.clearInterval(timer);
        };
    }, []);

    const sendInstruction = (event) => {
        event.preventDefault();
        instruction.post(`/agent/jobs/${job.id}/instructions`, { onSuccess: () => instruction.reset() });
    };
    const action = (name) => router.post(`/agent/jobs/${job.id}/${name}`);
    const approvalReady = canApprove(job, job.commit_sha, job.target_environment) && !job.approved;

    return <AppLayout title="Coding Agent Job">
        <Head title={`Agent job #${job.id}`} />
        <div className="mx-auto max-w-3xl space-y-5 py-6 pb-20">
            <Link href="/agent/jobs" className="text-sm text-blue-700">← All jobs</Link>
            <header><h1 className="text-2xl font-semibold">{job.todo_title}</h1><p className="mt-1 text-sm text-gray-500">{job.repository} · {statusLabel(job.status)}</p></header>
            {!online && <div role="status" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">Offline. Actions are paused until you reconnect.</div>}
            <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <h2 className="font-medium">Job</h2><p className="mt-2 whitespace-pre-wrap text-sm">{job.instruction}</p>
                <p className="mt-3 text-xs text-gray-500">{heartbeatLabel(job.last_heartbeat_at, now)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {['queued', 'running', 'needs_input'].includes(job.status) && <button onClick={() => action('pause')} disabled={!online} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Pause</button>}
                    {job.status === 'paused' && <button onClick={() => action('resume')} disabled={!online} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Resume</button>}
                    {!['cancelled', 'failed', 'completed', 'release_pending'].includes(job.status) && <button onClick={() => action('cancel')} disabled={!online} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50">Cancel</button>}
                </div>
            </section>
            {['queued', 'running', 'needs_input', 'paused'].includes(job.status) && <form onSubmit={sendInstruction} className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <label className="block text-sm font-medium">Follow-up instruction<textarea className="mt-2 min-h-24 w-full rounded-lg border p-3 dark:bg-gray-900" maxLength={5000} value={instruction.data.instruction} onChange={(e) => instruction.setData('instruction', e.target.value)} required /></label>
                {instruction.errors.instruction && <p className="text-sm text-red-600">{instruction.errors.instruction}</p>}
                <button disabled={!online || instruction.processing} className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50">Send instruction</button>
            </form>}
            {(job.commit_sha || job.test_summary) && <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <h2 className="font-medium">Review artifact</h2>
                {job.branch && <p className="text-sm">Branch: <code>{job.branch}</code></p>}
                {job.commit_sha && <p className="break-all text-sm">Commit: <code>{job.commit_sha}</code></p>}
                {job.pr_url && <a href={job.pr_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline">Open pull request</a>}
                {job.test_summary && <p className="whitespace-pre-wrap text-sm">{job.test_summary}</p>}
                <p className="text-sm">Target: {job.target_environment} · Tests: {job.tests_passed ? 'passed' : 'failed'}</p>
                {job.approved && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Approved for this exact commit. Awaiting the repository release pipeline.</p>}
                {approvalReady && <button disabled={!online} onClick={() => router.post(`/agent/jobs/${job.id}/approve-release`, { commit_sha: job.commit_sha, target_environment: job.target_environment })} className="w-full rounded-lg bg-green-700 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">Approve this commit for release</button>}
            </section>}
            <section className="space-y-3"><h2 className="font-medium">Activity</h2>
                {events.data.length === 0 && <p className="text-sm text-gray-500">No activity yet.</p>}
                {events.data.map((event) => <article key={event.id} className="rounded-xl border bg-white p-3 text-sm dark:bg-gray-900"><div className="flex justify-between gap-3"><strong>{event.kind.replaceAll('_', ' ')}</strong><time className="text-xs text-gray-500">{new Date(event.occurred_at).toLocaleString()}</time></div>{event.detail && <p className="mt-2 whitespace-pre-wrap break-words">{event.detail}</p>}</article>)}
                <div className="flex gap-2">{events.prev_page_url && <Link href={events.prev_page_url} className="rounded-lg border px-3 py-2 text-sm">Previous</Link>}{events.next_page_url && <Link href={events.next_page_url} className="rounded-lg border px-3 py-2 text-sm">Next</Link>}</div>
            </section>
        </div>
    </AppLayout>;
}
