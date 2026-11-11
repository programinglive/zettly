import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import { FileText, StickyNote, PenTool, BookOpen } from 'lucide-react';

/**
 * One focus as a workspace: the container header plus tabs for everything filed
 * inside it. The payload comes from a single endpoint so the counts and the
 * lists can never disagree.
 */
export default function FocusBoard({ focus, counts, todos, notes, drawings, journal }) {
    const [tab, setTab] = useState('todos');

    const tabs = useMemo(
        () => [
            { key: 'todos', label: 'Todos', count: counts?.todos ?? 0, icon: FileText },
            { key: 'notes', label: 'Notes', count: counts?.notes ?? 0, icon: StickyNote },
            { key: 'drawings', label: 'Draw', count: counts?.drawings ?? 0, icon: PenTool },
            { key: 'journal', label: 'Journal', count: counts?.journal ?? 0, icon: BookOpen },
        ],
        [counts],
    );

    const openTodos = counts?.open_todos ?? 0;

    return (
        <AppLayout>
            <Head title={focus?.title ? `${focus.title} — Focus` : 'Focus'} />

            <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
                <header className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div
                        className="absolute inset-x-0 top-0 h-1"
                        style={{ backgroundColor: focus?.color || '#6366F1' }}
                    />
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {focus?.status || 'focus'}
                        </span>
                    </div>
                    <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                        {focus?.title}
                    </h1>
                    {focus?.description && (
                        <p className="mt-3 max-w-2xl text-gray-600 dark:text-gray-400">{focus.description}</p>
                    )}
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
                        {openTodos} open {openTodos === 1 ? 'todo' : 'todos'}
                    </p>
                </header>

                <nav role="tablist" aria-label="Focus contents" className="flex flex-wrap gap-2">
                    {tabs.map(({ key, label, count, icon: Icon }) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={tab === key}
                            onClick={() => setTab(key)}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                                tab === key
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                    tab === key ? 'bg-white/20' : 'bg-white dark:bg-slate-900'
                                }`}
                            >
                                {count}
                            </span>
                        </button>
                    ))}
                </nav>

                <section>
                    {tab === 'todos' && <TodoList items={todos} />}
                    {tab === 'notes' && <NoteList items={notes} />}
                    {tab === 'drawings' && <DrawingList items={drawings} />}
                    {tab === 'journal' && <JournalList items={journal} />}
                </section>
            </div>
        </AppLayout>
    );
}

function Empty({ children }) {
    return (
        <div className="flex h-40 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800">
            <p className="text-sm font-medium italic text-gray-400 dark:text-gray-500">{children}</p>
        </div>
    );
}

function TodoList({ items = [] }) {
    if (!items.length) return <Empty>Nothing filed under this focus yet.</Empty>;
    return (
        <ul className="space-y-2">
            {items.map((todo) => (
                <li
                    key={todo.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                >
                    <span className={todo.is_completed ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}>
                        {todo.title}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {todo.is_completed ? 'done' : 'open'}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function NoteList({ items = [] }) {
    if (!items.length) return <Empty>No notes in this focus.</Empty>;
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {items.map((note) => (
                <Card key={note.id}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">{note.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600 dark:text-gray-400">
                        {note.description || '—'}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function DrawingList({ items = [] }) {
    if (!items.length) return <Empty>No drawings in this focus.</Empty>;
    return (
        <div className="grid gap-3 sm:grid-cols-3">
            {items.map((drawing) => (
                <a
                    key={drawing.id}
                    href={`/draw/${drawing.id}`}
                    className="rounded-xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-800 hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200"
                >
                    {drawing.title}
                </a>
            ))}
        </div>
    );
}

function JournalList({ items = [] }) {
    if (!items.length) return <Empty>No journal entries for this focus.</Empty>;
    return (
        <ul className="space-y-3">
            {items.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                        <span>{entry.kind}</span>
                        <span className="text-gray-400">{entry.entry_date}</span>
                    </div>
                    <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{entry.content}</p>
                </li>
            ))}
        </ul>
    );
}
