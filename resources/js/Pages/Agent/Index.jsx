import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout';
import { createRequestId, statusLabel } from './jobView';

export default function Index({ jobs, todos, repositories, models, default_model }) {
    const form = useForm({ todo_id: todos[0]?.id ?? '', repository: repositories[0] ?? '', instruction: '', model: default_model ?? models?.[0] ?? 'agnes-3-0-flash:free', client_request_id: '' });
    const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine);
    const [generatingPrompt, setGeneratingPrompt] = useState(false);
    const [promptError, setPromptError] = useState('');

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        const timer = window.setInterval(() => {
            if (navigator.onLine && !document.hidden) router.reload({ only: ['jobs'] });
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
                form.setData('instruction', response.data.prompt);
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to generate prompt.';
            setPromptError(msg);
        } finally {
            setGeneratingPrompt(false);
        }
    };

    return <AppLayout title="Coding Agent">
        <Head title="Coding Agent" />
        <div className="mx-auto max-w-3xl space-y-6 py-6 pb-20">
            <div><h1 className="text-2xl font-semibold">Coding Agent</h1><p className="mt-1 text-sm text-gray-500">Create a job from an existing personal Todo. Review every change before release.</p></div>
            {!online && <div role="status" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">Offline. Your jobs will refresh when the connection returns.</div>}
            <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                <h2 className="text-lg font-medium">New job</h2>
                <label className="block text-sm font-medium">Todo
                    <select className="mt-1 w-full rounded-lg border p-3 dark:bg-gray-900" value={form.data.todo_id} onChange={(e) => form.setData('todo_id', e.target.value)} required>
                        <option value="">Select a Todo</option>{todos.map((todo) => <option key={todo.id} value={todo.id}>{todo.title}</option>)}
                    </select>
                </label>
                <label className="block text-sm font-medium">Repository
                    <select className="mt-1 w-full rounded-lg border p-3 dark:bg-gray-900" value={form.data.repository} onChange={(e) => form.setData('repository', e.target.value)} required>
                        <option value="">Select a repository</option>{repositories.map((repo) => <option key={repo} value={repo}>{repo}</option>)}
                    </select>
                </label>
                <label className="block text-sm font-medium">AI Model
                    <select className="mt-1 w-full rounded-lg border p-3 dark:bg-gray-900" value={form.data.model} onChange={(e) => form.setData('model', e.target.value)}>
                        {(models ?? [form.data.model]).map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                </label>
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <label htmlFor="agent-instruction" className="block text-sm font-medium">What should the agent do?</label>
                        <button
                            type="button"
                            onClick={enhancePrompt}
                            disabled={generatingPrompt || !online || !form.data.todo_id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300"
                            title="Use AI Magic Wand to generate or enhance your prompt based on the selected Todo"
                        >
                            <span aria-hidden="true">{generatingPrompt ? '⏳' : '🪄'}</span>
                            {generatingPrompt ? 'Generating…' : form.data.instruction ? 'Refine with AI' : 'Generate with AI'}
                        </button>
                    </div>
                    <textarea
                        id="agent-instruction"
                        className="mt-1 min-h-32 w-full rounded-lg border p-3 dark:bg-gray-900"
                        maxLength={5000}
                        value={form.data.instruction}
                        onChange={(e) => form.setData('instruction', e.target.value)}
                        placeholder="Describe what the agent should implement, or click 'Generate with AI' above…"
                        required
                    />
                    {promptError && <p className="text-xs text-red-600">{promptError}</p>}
                </div>
                {Object.values(form.errors).map((error, index) => <p key={index} className="text-sm text-red-600">{error}</p>)}
                <button type="submit" disabled={form.processing || !online || !todos.length || !repositories.length} className="w-full rounded-lg bg-blue-700 px-4 py-3 font-medium text-white disabled:opacity-50">{form.processing ? 'Creating…' : 'Create job'}</button>
            </form>
            <section className="space-y-3"><h2 className="text-lg font-medium">Jobs</h2>
                {jobs.data.length === 0 && <p className="text-sm text-gray-500">No jobs yet.</p>}
                {jobs.data.map((job) => <Link key={job.id} href={`/agent/jobs/${job.id}`} className="block rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-900">
                    <div className="flex items-start justify-between gap-3"><div><div className="font-medium">{job.todo_title}</div><div className="mt-1 text-sm text-gray-500">{job.repository}</div></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-800">{statusLabel(job.status)}</span></div>
                </Link>)}
                {jobs.links?.length > 3 && <nav className="flex flex-wrap gap-2" aria-label="Job pages">{jobs.links.map((link, index) => link.url ? <Link key={index} href={link.url} className="rounded-lg border px-3 py-2 text-sm">{link.label.replace(/<[^>]*>/g, '').replace('&laquo;', '‹').replace('&raquo;', '›')}</Link> : null)}</nav>}
            </section>
        </div>
    </AppLayout>;
}
