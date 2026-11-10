import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import SanitizedHtml from '../../Components/SanitizedHtml';
import { canApprove, heartbeatLabel, statusLabel } from './jobView';

export default function Show({ job, events }) {
    const instruction = useForm({ instruction: '' });
    const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine);
    const [now, setNow] = useState(Date.now());
    const [copied, setCopied] = useState(false);

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

    const copyPrompt = async () => {
        if (!job.instruction) return;
        try {
            await navigator.clipboard.writeText(job.instruction);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    const sendInstruction = (event) => {
        event.preventDefault();
        instruction.post(`/agent/jobs/${job.id}/instructions`, { onSuccess: () => instruction.reset() });
    };
    const action = (name) => router.post(`/agent/jobs/${job.id}/${name}`);
    const approvalReady = canApprove(job, job.commit_sha, job.target_environment) && !job.approved;

    return <AppLayout title="Coding Agent Job">
        <Head title={`Agent job #${job.id}`} />
        <div className="mx-auto max-w-3xl space-y-6 py-6 pb-20">
            <div className="flex items-center justify-between">
                <Link href="/agent/jobs" className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
                    <span aria-hidden="true">←</span> Back to all jobs
                </Link>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    Job #{job.id}
                </span>
            </div>

            <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{job.todo_title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-mono dark:bg-gray-800">
                        📁 {job.repository}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                        🤖 {job.model || 'agnes-3-0-flash:free'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        ⚡ {statusLabel(job.status)}
                    </span>
                </div>
            </header>

            {!online && <div role="status" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">Offline. Actions are paused until you reconnect.</div>}

            {/* Main Job Instruction with Rich Markdown Rendering */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-base text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" aria-hidden="true">
                            📝
                        </span>
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Job Specification & Instructions</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={copyPrompt}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            title="Copy full markdown prompt to clipboard"
                        >
                            <span>{copied ? '✓ Copied' : '📋 Copy Prompt'}</span>
                        </button>
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 p-5 dark:border-gray-800/80 dark:bg-gray-950/40">
                    <SanitizedHtml html={job.instruction} className="text-sm leading-relaxed" />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{heartbeatLabel(job.last_heartbeat_at, now)}</p>
                    <div className="flex flex-wrap gap-2">
                        {['queued', 'running', 'needs_input'].includes(job.status) && <button onClick={() => action('pause')} disabled={!online} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800">Pause</button>}
                        {job.status === 'paused' && <button onClick={() => action('resume')} disabled={!online} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800">Resume</button>}
                        {!['cancelled', 'failed', 'completed', 'release_pending'].includes(job.status) && <button onClick={() => action('cancel')} disabled={!online} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">Cancel</button>}
                    </div>
                </div>
            </section>

            {/* Follow-up instruction input */}
            {['queued', 'running', 'needs_input', 'paused'].includes(job.status) && <form onSubmit={sendInstruction} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                    <label htmlFor="followup-instruction" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">Add Follow-up Instruction</label>
                    <span className="text-xs text-gray-400">{instruction.data.instruction.length} / 20000</span>
                </div>
                <textarea
                    id="followup-instruction"
                    className="mt-1 min-h-24 w-full rounded-lg border p-3 text-sm dark:bg-gray-900"
                    maxLength={20000}
                    value={instruction.data.instruction}
                    onChange={(e) => instruction.setData('instruction', e.target.value)}
                    placeholder="Provide additional guidance, fix suggestions, or answers to the agent…"
                    required
                />
                {instruction.errors.instruction && <p className="text-sm text-red-600">{instruction.errors.instruction}</p>}
                <button disabled={!online || instruction.processing} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
                    {instruction.processing ? 'Sending…' : 'Send instruction'}
                </button>
            </form>}

            {/* Review Artifacts */}
            {(job.commit_sha || job.test_summary) && <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                    <span className="text-lg" aria-hidden="true">📦</span>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">Review Artifact</h2>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                    {job.branch && (
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                            <div className="text-xs text-gray-500">Working Branch</div>
                            <code className="mt-1 block font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">{job.branch}</code>
                        </div>
                    )}
                    {job.commit_sha && (
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                            <div className="text-xs text-gray-500">Commit SHA</div>
                            <code className="mt-1 block break-all font-mono text-xs font-semibold text-purple-700 dark:text-purple-400">{job.commit_sha}</code>
                        </div>
                    )}
                </div>

                {job.pr_url && (
                    <div className="pt-1">
                        <a href={job.pr_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
                            <span>🐙 Open GitHub Pull Request</span>
                            <span aria-hidden="true">↗</span>
                        </a>
                    </div>
                )}

                {job.test_summary && (
                    <div className="rounded-xl border border-gray-100 bg-gray-900 p-4 text-xs font-mono text-gray-100 dark:border-gray-800">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Automated Test Execution Summary</div>
                        <pre className="whitespace-pre-wrap">{job.test_summary}</pre>
                    </div>
                )}

                <p className="text-xs text-gray-500">Target Environment: <span className="font-semibold capitalize text-gray-700 dark:text-gray-300">{job.target_environment}</span> · Tests: <span className={`font-semibold ${job.tests_passed ? 'text-emerald-600' : 'text-red-600'}`}>{job.tests_passed ? 'Passed ✓' : 'Failed ✗'}</span></p>

                {job.status === 'completed' && <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">✓ Completed. Pull request merged and changes released.</div>}
                {job.approved && job.status === 'release_pending' && <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">✓ Approved for this exact commit. Awaiting the repository release pipeline.</div>}
                {approvalReady && <button disabled={!online} onClick={() => router.post(`/agent/jobs/${job.id}/approve-release`, { commit_sha: job.commit_sha, target_environment: job.target_environment })} className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">Approve this commit for release</button>}
            </section>}

            {/* Activity Stream */}
            <section className="space-y-3">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Activity Stream</h2>
                {events.data.length === 0 && <p className="text-sm text-gray-500">No activity yet.</p>}
                {events.data.map((event) => <article key={event.id} className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 dark:border-gray-800">
                        <strong className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">{event.kind.replaceAll('_', ' ')}</strong>
                        <time className="text-xs text-gray-500">{new Date(event.occurred_at).toLocaleString()}</time>
                    </div>
                    {event.detail && (
                        <div className="mt-3">
                            <SanitizedHtml html={event.detail} className="text-sm leading-relaxed" />
                        </div>
                    )}
                </article>)}
                <div className="flex gap-2">{events.prev_page_url && <Link href={events.prev_page_url} className="rounded-lg border px-3 py-2 text-sm">Previous</Link>}{events.next_page_url && <Link href={events.next_page_url} className="rounded-lg border px-3 py-2 text-sm">Next</Link>}</div>
            </section>
        </div>
    </AppLayout>;
}
