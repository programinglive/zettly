import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import SanitizedHtml from '../../Components/SanitizedHtml';
import { canApprove, heartbeatLabel, statusLabel } from './jobView';
import {
    BarChart3,
    Bot,
    ClipboardList,
    Clock3,
    Compass,
    ExternalLink,
    FileText,
    FlaskConical,
    FolderGit2,
    GitPullRequest,
    MessageSquare,
    Package,
    Pin,
    Radio,
    Rocket,
    Settings2,
    UserRound,
    Zap,
} from 'lucide-react';

export default function Show({ job, events }) {
    const instruction = useForm({ instruction: '' });
    const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine);
    const [now, setNow] = useState(Date.now());
    const [copied, setCopied] = useState(false);

    const isLive = ['queued', 'running', 'needs_input'].includes(job.status);
    const pollInterval = isLive ? 3000 : 15000;

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        const timer = window.setInterval(() => {
            setNow(Date.now());
            if (navigator.onLine && !document.hidden) router.reload({ only: ['job', 'events'] });
        }, pollInterval);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
            window.clearInterval(timer);
        };
    }, [pollInterval]);

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

    const latestPhaseEvent = events.data?.find((e) => e.kind === 'worker_phase');
    const currentPhase = latestPhaseEvent?.detail || (job.status === 'running' ? 'Worker is actively executing...' : null);

    const getStageIndex = (phaseText) => {
        if (!phaseText) return 1;
        const lower = phaseText.toLowerCase();
        if (lower.includes('pull request') || lower.includes('pushing') || lower.includes('committed') || lower.includes('pr_url')) return 4;
        if (lower.includes('test') || lower.includes('verifying diff')) return 3;
        if (lower.includes('codex') || lower.includes('reasoning') || lower.includes('applying follow-up')) return 2;
        return 1;
    };
    const currentStep = getStageIndex(currentPhase);

    return <AppLayout title="Coding Agent Job">
        <Head title={`Agent job #${job.id}`} />
        <div className="w-full space-y-6 py-6 pb-20 [&_a]:min-h-[44px] [&_button]:min-h-[44px]">
            <div className="flex items-center justify-between">
                <Link href="/agent/jobs" className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
                    <span aria-hidden="true">←</span> Back to all jobs
                </Link>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/agent/jobs/${job.id}/monitor`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                        <Radio className="h-4 w-4 shrink-0" aria-hidden="true" /> Live Monitor
                    </Link>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                        Job #{job.id}
                    </span>
                </div>
            </div>

            <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{job.todo_title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-mono dark:bg-gray-800">
                        <FolderGit2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {job.repository}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 font-mono text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                        <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {job.role || 'developer'} ({job.execution_mode || 'code_write'})
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-mono font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Profile: {job.routing_profile || job.workflow?.routing_profile || 'STANDARD'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                        <Bot className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {job.model || 'agnes-3-0-flash:free'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {statusLabel(job.status)}
                    </span>
                    {job.delivery_stage && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 font-mono font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                            <Rocket className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {job.delivery_stage}
                        </span>
                    )}
                    {job.production_revision && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            <Pin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Rev: {String(job.production_revision).slice(0, 10)}
                        </span>
                    )}
                    {job.telemetry && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 font-mono text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
                            <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {job.telemetry.total_tokens ?? 0} tok · {Math.round((job.telemetry.duration_ms ?? 0) / 1000)}s
                        </span>
                    )}
                </div>
            </header>

            {!online && <div role="status" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">Offline. Actions are paused until you reconnect.</div>}

            {/* Live Worker Status Banner (when running) */}
            {job.status === 'running' && (
                <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-blue-50/50 p-5 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/40 dark:via-gray-900 dark:to-blue-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 pb-3 dark:border-emerald-950">
                        <div className="flex items-center gap-2.5">
                            <span className="relative flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                            </span>
                            <h2 className="font-semibold text-emerald-950 dark:text-emerald-200">
                                Worker is actively executing Job #{job.id}
                            </h2>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            <Settings2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Worker Active · {heartbeatLabel(job.last_heartbeat_at, now)}
                        </span>
                    </div>

                    {/* Visual 4-Step Stepper */}
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                            { num: 1, title: 'Setup & Worktree', icon: FolderGit2 },
                            { num: 2, title: 'Code Generation', icon: Bot },
                            { num: 3, title: 'Automated Tests', icon: FlaskConical },
                            { num: 4, title: 'Pull Request', icon: GitPullRequest },
                        ].map((step) => {
                            const isCurrent = currentStep === step.num;
                            const isDone = currentStep > step.num;
                            return (
                                <div
                                    key={step.num}
                                    className={`flex flex-col gap-1 rounded-xl border p-2.5 transition-colors ${
                                        isCurrent
                                            ? 'border-emerald-500 bg-emerald-500/10 shadow-sm dark:border-emerald-400 dark:bg-emerald-950/60'
                                            : isDone
                                            ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                                            : 'border-gray-200/60 bg-gray-50/50 opacity-60 dark:border-gray-800 dark:bg-gray-900/40'
                                    }`}
                                >
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="inline-flex items-center gap-1"><step.icon className="h-3.5 w-3.5" aria-hidden="true" /> Step {step.num}</span>
                                        {isDone && <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>}
                                        {isCurrent && <span className="animate-pulse text-emerald-600 dark:text-emerald-400 font-bold">● Active</span>}
                                    </div>
                                    <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{step.title}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Current Phase Message */}
                    {currentPhase && (
                        <div className="mt-4 rounded-xl border border-emerald-200/60 bg-white/90 p-3.5 text-xs font-mono text-emerald-950 shadow-sm dark:border-emerald-900/50 dark:bg-gray-900/90 dark:text-emerald-200">
                            <span className="font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Current Phase: </span>
                            <span className="font-normal">{currentPhase}</span>
                        </div>
                    )}
                </section>
            )}

            {/* Queued Status Notice */}
            {job.status === 'queued' && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30">
                    <div className="flex items-center gap-2">
                        <Clock3 className="h-5 w-5" aria-hidden="true" />
                        <div>
                            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Job is Queued</h2>
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                Waiting for an available runner worker (`bw-tools` or dedicated GCE worker) to claim this job...
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* Main Job Instruction with Rich Markdown Rendering */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-base text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" aria-hidden="true">
                            <FileText className="h-4 w-4" aria-hidden="true" />
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
                            <span>{copied ? '✓ Copied' : <><ClipboardList className="h-4 w-4" aria-hidden="true" /> Copy Prompt</>}</span>
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
                    <Package className="h-5 w-5" aria-hidden="true" />
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
                            <span><GitPullRequest className="h-4 w-4" aria-hidden="true" /> Open GitHub Pull Request</span>
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
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

            {/* PR & Deployment Reversibility Assessment (Part B.6) */}
            {job.reversibility_assessment && (
                <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                        <div>
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100">PR & Deployment Reversibility</h2>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{job.reversibility_assessment.summary}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200">
                                {job.reversibility_classification}
                            </span>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200">
                                Risk: {job.risk_level}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                Rollback: {job.reversibility_assessment.rollback_status}
                            </span>
                        </div>
                    </div>

                    {job.reversibility_assessment.gates?.blocking_conditions?.length > 0 && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                            <p className="font-semibold">Blocking Conditions:</p>
                            <ul className="mt-1 list-disc pl-4 space-y-0.5">
                                {job.reversibility_assessment.gates.blocking_conditions.map((b, i) => (
                                    <li key={i}>{b}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {job.reversibility_assessment.rollback_plan && (
                        <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-950/60">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                Recovery Plan (Target: {job.reversibility_assessment.rollback_plan.previous_known_good_release})
                            </p>
                            <ul className="mt-1.5 space-y-1 text-gray-700 dark:text-gray-300">
                                {(job.reversibility_assessment.rollback_plan.step_by_step_recovery_procedure || []).map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            )}

            {/* Activity Stream */}
            <section className="space-y-3">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Activity Stream</h2>
                {events.data.length === 0 && <p className="text-sm text-gray-500">No activity yet.</p>}
                {events.data.map((event) => <article
                    key={event.id}
                    className={`rounded-xl border p-4 text-sm shadow-sm transition-colors ${
                        event.kind === 'worker_phase'
                            ? 'border-l-4 border-l-emerald-500 border-gray-200 bg-emerald-50/30 dark:border-gray-800 dark:border-l-emerald-400 dark:bg-emerald-950/20'
                            : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                    }`}
                >
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 dark:border-gray-800">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            {event.kind === 'worker_phase' && <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                            {event.kind === 'instruction' && <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />}
                            {event.kind.replaceAll('_', ' ')}
                        </span>
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
