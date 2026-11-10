import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout';
import {
    buildTodoSpecInstruction,
    createRequestId,
    filterJobsByStage,
    heartbeatLabel,
    statusLabel,
} from './jobView';

const PIPELINE_STAGES = [
    { key: 'all', label: 'All Jobs' },
    { key: 'queued', label: 'Queued' },
    { key: 'running', label: 'Running' },
    { key: 'needs_input', label: 'Needs Input' },
    { key: 'review', label: 'Review / PR Ready' },
    { key: 'completed', label: 'Completed' },
    { key: 'attention', label: 'Failed / Cancelled' },
];

export default function Index({
    jobs,
    todos = [],
    selectedTodoId = null,
    repositories = [],
    repositoryRegistry = [],
    models = [],
    default_model,
    recap = null,
    activeSessions = [],
}) {
    const initialTodoId = selectedTodoId && todos.some((t) => Number(t.id) === Number(selectedTodoId))
        ? Number(selectedTodoId)
        : (todos[0]?.id ?? '');

    const form = useForm({
        todo_id: initialTodoId,
        repository: repositories[0] ?? '',
        instruction: '',
        model: default_model ?? models?.[0] ?? 'agnes-3-0-flash:free',
        client_request_id: '',
    });
    const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine);
    const [generatingPrompt, setGeneratingPrompt] = useState(false);
    const [promptError, setPromptError] = useState('');
    const [activeStage, setActiveStage] = useState('all');

    const selectedTodo = useMemo(
        () => todos.find((t) => Number(t.id) === Number(form.data.todo_id)) ?? null,
        [todos, form.data.todo_id],
    );

    const selectedRepoMeta = useMemo(
        () => repositoryRegistry.find((r) => r.slug === form.data.repository) ?? null,
        [repositoryRegistry, form.data.repository],
    );

    // Auto-select repository from Todo `proyek:*` tag and pre-fill spec when arriving via ?todo_id=
    useEffect(() => {
        if (!selectedTodo) return;
        const projectTag = (selectedTodo.tags ?? []).find((t) => typeof t === 'string' && t.startsWith('proyek:'));
        if (projectTag) {
            const candidate = projectTag.slice('proyek:'.length).trim();
            if (repositories.includes(candidate) && form.data.repository !== candidate) {
                form.setData('repository', candidate);
            }
        }
        if (selectedTodoId && Number(selectedTodo.id) === Number(selectedTodoId) && !form.data.instruction) {
            const spec = buildTodoSpecInstruction(selectedTodo, selectedRepoMeta);
            if (spec) {
                form.setData('instruction', spec);
            }
        }
    }, [selectedTodo?.id]);

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        const timer = window.setInterval(() => {
            if (navigator.onLine && !document.hidden) router.reload({ only: ['jobs', 'recap', 'activeSessions'] });
        }, 15000);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
            window.clearInterval(timer);
        };
    }, []);

    const submit = (event) => {
        event.preventDefault();
        const requestId = createRequestId(undefined, form.data.client_request_id || null);
        form.transform((data) => ({ ...data, client_request_id: requestId }));
        form.post('/agent/jobs', {
            onSuccess: () => form.reset('instruction', 'client_request_id'),
        });
        form.setData('client_request_id', requestId);
    };

    const INSTRUCTION_MAX = 20000;

    const loadTodoSpec = () => {
        if (!selectedTodo) {
            setPromptError('Please select a Todo first.');
            return;
        }
        setPromptError('');
        const spec = buildTodoSpecInstruction(selectedTodo, selectedRepoMeta);
        form.setData('instruction', spec.slice(0, INSTRUCTION_MAX));
    };

    const enhancePrompt = async () => {
        if (!form.data.todo_id) {
            setPromptError('Please select a Todo first.');
            return;
        }
        setGeneratingPrompt(true);
        setPromptError('');
        try {
            const response = await axios.post('/agent/generate-prompt', {
                todo_id: form.data.todo_id,
                instruction: form.data.instruction,
                repository: form.data.repository,
                model: form.data.model,
            });
            if (response.data?.prompt) {
                let generated = response.data.prompt;
                if (generated.length > INSTRUCTION_MAX) {
                    generated = generated.slice(0, INSTRUCTION_MAX);
                }
                form.setData('instruction', generated);
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to generate prompt.';
            setPromptError(msg);
        } finally {
            setGeneratingPrompt(false);
        }
    };

    const filteredJobs = useMemo(
        () => filterJobsByStage(jobs?.data ?? [], activeStage),
        [jobs?.data, activeStage],
    );

    const maxDailyCount = useMemo(() => {
        const counts = (recap?.dailyStrip ?? []).map((d) => d.count ?? 0);
        return Math.max(1, ...counts);
    }, [recap?.dailyStrip]);

    return <AppLayout title="Engineering Hub & Coding Agent">
        <Head title="Engineering Hub & Coding Agent" />
        <div className="mx-auto max-w-5xl space-y-6 py-6 pb-20">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Engineering Hub & Coding Agent</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Unified software delivery workspace: Sentry & Todo Spec → <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">zettly-coding-agent-1</code> → Review & Release Approval.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/agent/setup" className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                        ⚙️ Repository Registry & Token
                    </Link>
                    <Link href="/reports" className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                        📊 Reports
                    </Link>
                </div>
            </div>

            {!online && <div role="status" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">Offline. Your jobs will refresh when the connection returns.</div>}

            {/* 14-Day Engineering Recap (Consolidated from Factory /#rekap) */}
            {recap && (
                <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Engineering Recap (Asia/Jakarta)</h2>
                            <p className="text-xs text-gray-400">Completed Coding Agent jobs & 14-day delivery velocity</p>
                        </div>
                        {recap.byRepository?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {recap.byRepository.map((item) => (
                                    <span key={item.repository} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        {item.repository}: {item.completed}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                            <div className="text-xs text-gray-500">Today</div>
                            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{recap.today ?? 0}</div>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                            <div className="text-xs text-gray-500">This Week</div>
                            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{recap.week ?? 0}</div>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                            <div className="text-xs text-gray-500">This Month</div>
                            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{recap.month ?? 0}</div>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                            <div className="text-xs text-gray-500">All Completed</div>
                            <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{recap.all ?? 0}</div>
                        </div>
                    </div>

                    {recap.dailyStrip?.length > 0 && (
                        <div>
                            <div className="mb-1.5 text-[11px] font-medium text-gray-400">Last 14 Days Completion Strip</div>
                            <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
                                {recap.dailyStrip.map((day) => {
                                    const ratio = Math.round(((day.count ?? 0) / maxDailyCount) * 100);
                                    return (
                                        <div key={day.date} className="flex flex-col items-center rounded-lg border border-gray-100 bg-gray-50/50 p-1.5 text-center dark:border-gray-800 dark:bg-gray-800/30" title={`${day.label}: ${day.count} completed`}>
                                            <div className="flex h-8 w-full items-end justify-center">
                                                <div
                                                    className={`w-full rounded-sm ${day.count > 0 ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                    style={{ height: `${ day.count > 0 ? Math.max(25, ratio) : 12 }%` }}
                                                />
                                            </div>
                                            <span className="mt-1 text-[10px] font-semibold text-gray-700 dark:text-gray-300">{day.count}</span>
                                            <span className="text-[9px] text-gray-400">{day.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* Live CLI / Coding Agent Sessions */}
            {activeSessions.length > 0 && (
                <section className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                        ⚡ Active AI Coding Sessions ({activeSessions.length})
                    </h2>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {activeSessions.map((s) => (
                            <div key={s.session_id} className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-white px-3 py-2 text-xs shadow-sm dark:border-emerald-900/50 dark:bg-gray-900">
                                <div className="min-w-0 flex-1 pr-2">
                                    <div className="truncate font-semibold text-gray-900 dark:text-white">{s.title}</div>
                                    <div className="mt-0.5 text-[11px] text-gray-500">{s.project} · {s.machine || 'worker'}</div>
                                </div>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                                    {s.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Dispatch Form to zettly-coding-agent-1 */}
            <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-medium">Dispatch Job to Coding Agent (`zettly-coding-agent-1`)</h2>
                    {selectedTodo && (
                        <Link href={`/todos/${selectedTodo.id}`} className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-400">
                            View Todo #{selectedTodo.id} →
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className="block text-sm font-medium sm:col-span-1">Todo
                        <select className="mt-1 w-full rounded-lg border p-3 text-sm dark:border-gray-700 dark:bg-gray-900" value={form.data.todo_id} onChange={(e) => form.setData('todo_id', e.target.value)} required>
                            <option value="">Select a Todo</option>
                            {todos.map((todo) => (
                                <option key={todo.id} value={todo.id}>
                                    #{todo.id} — {todo.title}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block text-sm font-medium sm:col-span-1">Repository
                        <select className="mt-1 w-full rounded-lg border p-3 text-sm dark:border-gray-700 dark:bg-gray-900" value={form.data.repository} onChange={(e) => form.setData('repository', e.target.value)} required>
                            <option value="">Select a repository</option>
                            {repositories.map((repo) => <option key={repo} value={repo}>{repo}</option>)}
                        </select>
                    </label>

                    <label className="block text-sm font-medium sm:col-span-1">AI Model
                        <select className="mt-1 w-full rounded-lg border p-3 text-sm dark:border-gray-700 dark:bg-gray-900" value={form.data.model} onChange={(e) => form.setData('model', e.target.value)}>
                            {(models ?? [form.data.model]).map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </label>
                </div>

                {/* Selected Todo DoD & Repository Checks Metadata Bar */}
                {(selectedTodo || selectedRepoMeta) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
                        <div className="flex flex-wrap items-center gap-3">
                            {selectedRepoMeta && (
                                <span>
                                    📦 <strong>{selectedRepoMeta.remote}</strong> (<code className="font-mono">{selectedRepoMeta.base}</code> · {selectedRepoMeta.stack})
                                </span>
                            )}
                            {selectedRepoMeta?.checks && (
                                <span>
                                    🧪 Checks: <code className="rounded bg-white px-1.5 py-0.5 font-mono dark:bg-gray-900">{selectedRepoMeta.checks}</code>
                                </span>
                            )}
                            {selectedTodo?.checklist_items?.length > 0 && (
                                <span>
                                    ☑️ DoD Checklist: <strong>{selectedTodo.checklist_items.length} items</strong>
                                </span>
                            )}
                        </div>
                        {selectedTodo && (
                            <button
                                type="button"
                                onClick={loadTodoSpec}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            >
                                📋 Load Todo Spec & DoD
                            </button>
                        )}
                    </div>
                )}

                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <label htmlFor="agent-instruction" className="block text-sm font-medium">Specification, Acceptance Criteria & DoD</label>
                        <button
                            type="button"
                            onClick={enhancePrompt}
                            disabled={generatingPrompt || !online || !form.data.todo_id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300"
                            title="Use AI Magic Wand to generate or enhance your prompt based on the selected Todo, its DoD checklist, and repository test checks"
                        >
                            <span aria-hidden="true">{generatingPrompt ? '⏳' : '🪄'}</span>
                            {generatingPrompt ? 'Generating…' : form.data.instruction ? 'Refine with AI' : 'Generate with AI'}
                        </button>
                    </div>
                    <textarea
                        id="agent-instruction"
                        className="mt-1 min-h-36 w-full rounded-lg border p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
                        maxLength={INSTRUCTION_MAX}
                        value={form.data.instruction}
                        onChange={(e) => form.setData('instruction', e.target.value)}
                        placeholder="Describe what the agent should implement, click 'Load Todo Spec & DoD', or click 'Generate with AI'…"
                        required
                    />
                    <p className={`text-right text-xs ${form.data.instruction.length >= INSTRUCTION_MAX ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                        {form.data.instruction.length} / {INSTRUCTION_MAX}
                    </p>
                    {promptError && <p className="text-xs text-red-600">{promptError}</p>}
                </div>
                {Object.values(form.errors).map((error, index) => <p key={index} className="text-sm text-red-600">{error}</p>)}
                <button type="submit" disabled={form.processing || !online || !todos.length || !repositories.length} className="w-full rounded-lg bg-blue-700 px-4 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50">{form.processing ? 'Creating…' : 'Create job'}</button>
            </form>

            {/* Pipeline Filter & Jobs List */}
            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-medium">Engineering Pipeline</h2>
                    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Pipeline stage filter">
                        {PIPELINE_STAGES.map((stage) => (
                            <button
                                key={stage.key}
                                type="button"
                                onClick={() => setActiveStage(stage.key)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                    activeStage === stage.key
                                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                }`}
                            >
                                {stage.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredJobs.length === 0 && <p className="text-sm text-gray-500">No jobs in this pipeline stage.</p>}
                {filteredJobs.map((job) => (
                    <Link key={job.id} href={`/agent/jobs/${job.id}`} className="block rounded-2xl border bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                    <span className="mr-2 font-mono text-xs text-gray-400">#{job.id}</span>
                                    {job.todo_title || `Todo #${job.todo_id}`}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                    <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{job.repository}</span>
                                    {job.branch && <span>· branch <code className="font-mono">{job.branch}</code></span>}
                                    {job.last_heartbeat_at && <span>· {heartbeatLabel(job.last_heartbeat_at)}</span>}
                                </div>
                            </div>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
                                {statusLabel(job.status)}
                            </span>
                        </div>
                    </Link>
                ))}
                {jobs.links?.length > 3 && <nav className="flex flex-wrap gap-2" aria-label="Job pages">{jobs.links.map((link, index) => link.url ? <Link key={index} href={link.url} className="rounded-lg border px-3 py-2 text-sm">{link.label.replace(/<[^>]*>/g, '').replace('&laquo;', '‹').replace('&raquo;', '›')}</Link> : null)}</nav>}
            </section>
        </div>
    </AppLayout>;
}
