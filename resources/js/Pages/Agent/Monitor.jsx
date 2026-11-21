import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import { heartbeatLabel, statusLabel } from './jobView';

const STEPS = [
    { num: 1, title: 'Setup & Worktree' },
    { num: 2, title: 'AI Coding' },
    { num: 3, title: 'Automated Tests' },
    { num: 4, title: 'Draft PR' },
];

const STATUS_BADGE = {
    queued: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300',
    running: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300',
    needs_input: 'bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300',
    paused: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    review: 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300',
    completed: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300',
    failed: 'bg-red-100 text-red-900 dark:bg-red-950/70 dark:text-red-300',
    cancelled: 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

function getStageIndex(phaseText, status) {
    if (status === 'completed' || status === 'review') return 5;
    if (!phaseText) return 1;
    const lower = phaseText.toLowerCase();
    if (lower.includes('pull request') || lower.includes('pushing') || lower.includes('committed')) return 4;
    if (lower.includes('test') || lower.includes('verifying diff')) return 3;
    if (lower.includes('codex') || lower.includes('reasoning') || lower.includes('follow-up')) return 2;
    return 1;
}

export default function Monitor({ job, events = [] }) {
    const [now, setNow] = useState(Date.now());
    const instruction = useForm({ instruction: '' });

    const isLive = ['queued', 'running', 'needs_input'].includes(job.status);
    const pollMs = isLive ? 3000 : 15000;

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(Date.now());
            if (navigator.onLine && !document.hidden) {
                router.reload({ only: ['job', 'events'], preserveScroll: true });
            }
        }, pollMs);
        return () => window.clearInterval(timer);
    }, [pollMs]);

    const latestPhase = events.find((e) => e.kind === 'worker_phase')?.detail
        || (job.status === 'running' ? 'Worker sedang menjalankan tugas...' : `Status saat ini: ${statusLabel(job.status)}`);
    const currentStep = getStageIndex(latestPhase, job.status);

    const runAction = (name) => router.post(`/agent/jobs/${job.id}/${name}`);
    const submitInstruction = (e) => {
        e.preventDefault();
        if (!instruction.data.instruction.trim()) return;
        instruction.post(`/agent/jobs/${job.id}/instructions`, {
            onSuccess: () => instruction.reset(),
        });
    };

    return (
        <AppLayout title={`Live Monitor · Job #${job.id}`}>
            <Head title={`Live Monitor · Job #${job.id}`} />

            <div className="mx-auto max-w-4xl space-y-5 py-6 pb-20">
                {/* Clean Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-sm">
                        <Link href="/agent/jobs" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                            ← Semua Job
                        </Link>
                        <span className="text-gray-300 dark:text-gray-700">|</span>
                        <Link href={`/agent/jobs/${job.id}`} className="text-gray-600 hover:underline dark:text-gray-400">
                            Detail Lengkap
                        </Link>
                    </div>
                    <div className="flex items-center gap-2">
                        {isLive && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
                                LIVE · refresh 3 detik
                            </span>
                        )}
                        <span className="rounded-full bg-gray-100 px-3 py-1 font-mono text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            Job #{job.id}
                        </span>
                    </div>
                </div>

                {/* Primary Focused Status Card */}
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Single-Session Headless Monitor
                            </p>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {job.todo_title || `Coding Job #${job.id}`}
                            </h1>
                        </div>
                        <span className={`rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide ${STATUS_BADGE[job.status] || STATUS_BADGE.paused}`}>
                            {statusLabel(job.status)}
                        </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            Repo: {job.repository}
                        </span>
                        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            Role: {job.role || 'developer'} ({job.execution_mode || 'code_write'})
                        </span>
                        <span className="rounded-lg bg-purple-50 px-2.5 py-1 font-mono text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                            Model: {job.model || 'hy4-flash:free'}
                        </span>
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                            Heartbeat: {heartbeatLabel(job.last_heartbeat_at, now)}
                        </span>
                    </div>

                    {/* Current Activity Highlight */}
                    <div className="mt-5 rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                            Aktivitas Terbaru
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {latestPhase}
                        </p>
                    </div>

                    {/* 4-Step Progress Bar */}
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {STEPS.map((step) => {
                            const done = currentStep > step.num;
                            const active = currentStep === step.num && isLive;
                            return (
                                <div
                                    key={step.num}
                                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                                        done
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            : active
                                                ? 'border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-500'
                                    }`}
                                >
                                    <span className="mr-1.5">{done ? '✓' : active ? '●' : `${step.num}.`}</span>
                                    {step.title}
                                </div>
                            );
                        })}
                    </div>

                    {/* Controls */}
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                        {job.status === 'running' && (
                            <button
                                type="button"
                                onClick={() => runAction('pause')}
                                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            >
                                Pause
                            </button>
                        )}
                        {job.status === 'paused' && (
                            <button
                                type="button"
                                onClick={() => runAction('resume')}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                                Resume
                            </button>
                        )}
                        {['queued', 'running', 'paused', 'needs_input'].includes(job.status) && (
                            <button
                                type="button"
                                onClick={() => runAction('cancel')}
                                className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                            >
                                Cancel Job
                            </button>
                        )}
                        {job.pr_url && (
                            <a
                                href={job.pr_url}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                            >
                                Buka Pull Request ↗
                            </a>
                        )}
                    </div>
                </section>

                {/* Output Summary Card (when branch/PR/test exist) */}
                {(job.branch || job.commit_sha || job.test_summary) && (
                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Output Eksekusi</h2>
                        <dl className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                            {job.branch && (
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/60">
                                    <dt className="text-gray-500">Branch</dt>
                                    <dd className="mt-1 font-mono font-semibold text-gray-900 dark:text-gray-100">{job.branch}</dd>
                                </div>
                            )}
                            {job.commit_sha && (
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/60">
                                    <dt className="text-gray-500">Commit</dt>
                                    <dd className="mt-1 font-mono font-semibold text-gray-900 dark:text-gray-100">{job.commit_sha.slice(0, 10)}</dd>
                                </div>
                            )}
                            {job.test_summary && (
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/60">
                                    <dt className="text-gray-500">Automated Tests</dt>
                                    <dd className="mt-1 font-medium text-emerald-700 dark:text-emerald-400">{job.test_summary}</dd>
                                </div>
                            )}
                        </dl>
                    </section>
                )}

                {/* PR & Deployment Reversibility Assessment Card (Part B.6) */}
                {job.reversibility_assessment && (
                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    PR & Deployment Reversibility Assessment
                                </h2>
                                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                                    {job.reversibility_assessment.summary}
                                </p>
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
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                                <p className="font-semibold">Blocking Conditions:</p>
                                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                                    {job.reversibility_assessment.gates.blocking_conditions.map((b, i) => (
                                        <li key={i}>{b}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {job.reversibility_assessment.dimensions && (
                            <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                {Object.entries(job.reversibility_assessment.dimensions).map(([dimKey, dim]) => (
                                    <div key={dimKey} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-950/60">
                                        <div className="flex items-center justify-between font-semibold text-gray-800 dark:text-gray-200">
                                            <span className="font-mono text-[11px]">{dimKey}</span>
                                            <span className="text-[11px]">{dim.status} ({dim.risk_level})</span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">{dim.evidence}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {job.reversibility_assessment.rollback_plan && (
                            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-950/60">
                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                    Recovery Plan (Target: {job.reversibility_assessment.rollback_plan.previous_known_good_release})
                                </p>
                                <ul className="mt-1.5 space-y-1 text-gray-700 dark:text-gray-300">
                                    {(job.reversibility_assessment.rollback_plan.step_by_step_recovery_procedure || []).map((s, idx) => (
                                        <li key={idx}>{s}</li>
                                    ))}
                                </ul>
                                <p className="mt-2 text-[11px] text-gray-500">
                                    Required Approvals: {(job.reversibility_assessment.gates?.required_approvals || []).join(', ')}
                                </p>
                            </div>
                        )}
                    </section>
                )}

                {/* Quick Follow-Up Box (only while active) */}
                {['queued', 'running', 'needs_input', 'paused'].includes(job.status) && (
                    <form onSubmit={submitInstruction} className="flex gap-2">
                        <input
                            type="text"
                            value={instruction.data.instruction}
                            onChange={(e) => instruction.setData('instruction', e.target.value)}
                            placeholder="Kirim instruksi lanjutan ke sesi agent ini..."
                            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
                        <button
                            type="submit"
                            disabled={instruction.processing}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            Kirim
                        </button>
                    </form>
                )}

                {/* Clean Live Event Log Stream */}
                <section className="rounded-2xl border border-gray-800 bg-gray-950 p-5 text-gray-100 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-400">
                            Live Event Stream ({events.length})
                        </h2>
                        <span className="font-mono text-[11px] text-gray-500">Terbaru di atas</span>
                    </div>
                    <div className="mt-3 max-h-96 space-y-2 overflow-y-auto font-mono text-xs">
                        {events.length === 0 ? (
                            <p className="py-4 text-center text-gray-500">
                                Belum ada log dari worker. Menunggu `zettly-coding-agent-1` mengambil job...
                            </p>
                        ) : (
                            events.map((ev) => (
                                <div key={ev.id} className="flex gap-3 rounded-lg bg-gray-900/70 px-3 py-2">
                                    <span className="shrink-0 text-gray-500">
                                        {ev.occurred_at ? new Date(ev.occurred_at).toLocaleTimeString('id-ID') : '--:--:--'}
                                    </span>
                                    <span className="shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] uppercase text-emerald-400">
                                        {ev.kind}
                                    </span>
                                    <span className="break-words text-gray-200">{ev.detail}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
