import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const suggestionPrompts = [
    'Summarize what I completed today.',
    'Create a focus plan for my highest priority tasks.',
    'Suggest the next steps for my pending todos.',
    'Help me delegate or postpone low priority items.',
];

const formatTimestamp = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Chat({ auth }) {
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inputTouched, setInputTouched] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, loading]);

    const isSendDisabled = useMemo(
        () => loading || !message.trim(),
        [loading, message],
    );

    const handlePromptClick = (prompt) => {
        setMessage(prompt);
        setInputTouched(true);
    };

    const appendMessage = (role, text) => ({
        id: crypto.randomUUID?.() ?? `${role}-${Date.now()}`,
        role,
        text,
        timestamp: new Date().toISOString(),
    });

    const sendMessage = async (e) => {
        e.preventDefault();
        const trimmed = message.trim();
        if (!trimmed) return;

        const userMessage = appendMessage('user', trimmed);
        setHistory((prev) => [...prev, userMessage]);
        setLoading(true);
        setMessage('');

        try {
            const response = await axios.post(route('gemini.chat'), { message: trimmed });
            const assistantMessage = appendMessage('assistant', response.data.response);
            setHistory((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = appendMessage(
                'assistant',
                'Sorry, Gemini could not respond right now. Please try again in a moment.',
            );
            setHistory((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const userName = auth?.user?.name ?? 'there';

    return (
        <AppLayout
            header={<h2 className="font-semibold text-xl text-gray-100 leading-tight">Gemini Chat</h2>}
        >
            <Head title="Gemini Chat" />

            <div className="min-h-screen bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8 text-slate-100">
                    <div className="space-y-6">
                        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 p-6 shadow-2xl ring-1 ring-white/10">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-slate-300">Good day, {userName} 👋</p>
                                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                                        Ask Gemini for tailored guidance on your todos
                                    </h1>
                                    <p className="mt-2 max-w-2xl text-sm text-slate-300">
                                        Gemini uses your current task list context to generate plans, summaries,
                                        and prioritization tips. Keep the conversation going for deeper insights.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-500/30">
                                        <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                                        Gemini 2.5 Flash · Live
                                    </span>
                                    <p className="mt-2 text-xs text-slate-300">
                                        {new Intl.DateTimeFormat(undefined, {
                                            weekday: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        }).format(new Date())}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
                            <section className="rounded-2xl border border-white/5 bg-slate-900/60 shadow-2xl shadow-indigo-900/20 backdrop-blur">
                                <div className="flex flex-col gap-5 p-6">
                                    <div
                                        ref={scrollRef}
                                        className="space-y-4 overflow-y-auto pr-2"
                                        style={{ maxHeight: 460 }}
                                        aria-live="polite"
                                    >
                                        {history.length === 0 && !loading && (
                                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                                                <p className="font-medium text-white">Start the conversation</p>
                                                <p className="mt-1">
                                                    Ask about prioritization, summaries, or next steps for your tasks.
                                                </p>
                                            </div>
                                        )}

                                        {history.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className={`rounded-2xl p-4 text-sm shadow-sm ${
                                                    entry.role === 'user'
                                                        ? 'bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-500/30'
                                                        : 'bg-white/5 text-slate-100 ring-1 ring-white/10'
                                                }`}
                                            >
                                                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-300">
                                                    <span className="font-semibold text-white">
                                                        {entry.role === 'user' ? 'You' : 'Gemini'}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{formatTimestamp(entry.timestamp)}</span>
                                                </div>
                                                <p className="whitespace-pre-wrap leading-relaxed">{entry.text}</p>
                                            </div>
                                        ))}

                                        {loading && (
                                            <div className="rounded-2xl bg-white/5 p-4 text-sm text-slate-200 ring-1 ring-white/10">
                                                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-300">
                                                    <span className="font-semibold text-white">Gemini</span>
                                                    <span>•</span>
                                                    <span>Thinking…</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/70" />
                                                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/70 [animation-delay:0.1s]" />
                                                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/70 [animation-delay:0.2s]" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <form onSubmit={sendMessage} className="space-y-3">
                                        <label htmlFor="chat-input" className="sr-only">
                                            Ask Gemini about your todos
                                        </label>
                                        <textarea
                                            id="chat-input"
                                            name="message"
                                            rows={3}
                                            value={message}
                                            onChange={(e) => {
                                                setMessage(e.target.value);
                                                if (!inputTouched) setInputTouched(true);
                                            }}
                                            onFocus={() => setInputTouched(true)}
                                            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                            placeholder="Ask something about your to-dos…"
                                            disabled={loading}
                                        />
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs text-slate-400">
                                                Context-aware: Gemini reads your current todos before answering.
                                            </p>
                                            <button
                                                type="submit"
                                                disabled={isSendDisabled}
                                                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700"
                                            >
                                                {loading ? (
                                                    <>
                                                        <span className="h-2 w-2 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                        Sending…
                                                    </>
                                                ) : (
                                                    <>Send insight</>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </section>

                            <aside className="space-y-4 rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-xl shadow-indigo-900/30 backdrop-blur">
                                <div>
                                    <p className="text-sm font-semibold text-white">Suggested prompts</p>
                                    <p className="text-sm text-slate-300">
                                        Use these to jump-start a productive session.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {suggestionPrompts.map((prompt) => (
                                        <button
                                            key={prompt}
                                            type="button"
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-100 transition hover:border-indigo-300 hover:bg-indigo-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
                                            onClick={() => handlePromptClick(prompt)}
                                            disabled={loading}
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                                    <p className="font-semibold text-amber-200">Tip</p>
                                    <p className="mt-1">
                                        Mention deadlines, blockers, or desired outcomes so Gemini can tailor the
                                        plan for you.
                                    </p>
                                </div>
                            </aside>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
