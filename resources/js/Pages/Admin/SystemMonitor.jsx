import React from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import SystemStatus from '../../Components/SystemStatus';

export default function SystemMonitor() {
    const { props } = usePage();
    const isSuperAdmin = props.auth?.user?.role === 'super_admin';
    const metrics = props.metrics ?? {};
    const records = props.records ?? {};
    const filters = props.filters ?? {};

    const [search, setSearch] = React.useState({
        todos: filters.todos_search ?? '',
        notes: filters.notes_search ?? '',
        drawings: filters.drawings_search ?? '',
    });

    React.useEffect(() => {
        setSearch({
            todos: filters.todos_search ?? '',
            notes: filters.notes_search ?? '',
            drawings: filters.drawings_search ?? '',
        });
    }, [filters.todos_search, filters.notes_search, filters.drawings_search]);

    const perPage = filters.per_page ?? 10;

    const buildQueryParams = (overrides = {}) => ({
        per_page: overrides.per_page ?? perPage,
        todos_search: overrides.todos_search ?? search.todos,
        notes_search: overrides.notes_search ?? search.notes,
        drawings_search: overrides.drawings_search ?? search.drawings,
    });

    const handleSearchSubmit = (event, key) => {
        event.preventDefault();
        const keyMap = {
            todos: 'todos_search',
            notes: 'notes_search',
            drawings: 'drawings_search',
        };

        router.get(
            '/admin/system-monitor',
            buildQueryParams({ [keyMap[key]]: search[key] }),
            { preserveScroll: true, preserveState: true }
        );
    };

    const handlePerPageChange = (event) => {
        const value = Number(event.target.value) || perPage;
        router.get(
            '/admin/system-monitor',
            buildQueryParams({ per_page: value }),
            { preserveScroll: true, preserveState: true }
        );
    };

    const formatDate = (value) => {
        if (!value) {
            return '—';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleString();
    };

    const sections = [
        { id: 'overview', label: 'Overview' },
        { id: 'records', label: 'Recent Activity' },
        { id: 'diagnostics', label: 'Diagnostics' },
    ];

    return (
        <AppLayout title="System Monitor">
            <Head title="System Monitor" />
            <div className="mx-auto max-w-6xl lg:flex lg:gap-6">
                <aside className="hidden lg:block w-64 shrink-0">
                    <nav className="sticky top-24 space-y-2">
                        {sections.map((section) => (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                className="block rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-gray-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:text-gray-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10"
                            >
                                {section.label}
                            </a>
                        ))}
                    </nav>
                </aside>
                <div className="flex-1 space-y-6">
                    <section id="overview" className="bg-white dark:bg-slate-900 shadow rounded-xl p-6 border border-gray-200 dark:border-slate-800">
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">System Monitor</h1>
                        {!isSuperAdmin ? (
                            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                                You do not have permission to view this page.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <p className="text-gray-700 dark:text-gray-300">
                                    Monitor application health, broadcasting configuration, authentication status, and third-party integrations.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Users', value: metrics.users ?? 0 },
                                        { label: 'Todos', value: metrics.todos ?? 0 },
                                        { label: 'Notes', value: metrics.notes ?? 0 },
                                        { label: 'Drawings', value: metrics.drawings ?? 0 },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="p-4 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
                                            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                    {isSuperAdmin && (
                        <>
                            <section id="records" className="bg-white dark:bg-slate-900 shadow rounded-xl p-6 border border-gray-200 dark:border-slate-800 space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <span className="font-medium">Per page:</span>
                                        <select
                                            value={perPage}
                                            onChange={handlePerPageChange}
                                            className="rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-sm"
                                        >
                                            {[5, 10, 20, 50].map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Showing the {perPage} most recent records per section (use search to narrow results).
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    {[
                                        {
                                            key: 'users',
                                            title: 'Recent Users',
                                            columns: ['Name', 'Email', 'Role', 'Created'],
                                            rows: (records.users ?? []).map((user) => [
                                                user.name,
                                                user.email,
                                                user.role,
                                                formatDate(user.created_at),
                                            ]),
                                        },
                                        {
                                            key: 'todos',
                                            title: 'Recent Todos',
                                            columns: ['Title', 'Owner', 'Priority', 'Created'],
                                            collection: records.todos,
                                            rows: (records.todos?.data ?? []).map((todo) => [
                                                todo.title,
                                                todo.user?.name ?? '—',
                                                todo.priority ?? 'n/a',
                                                formatDate(todo.created_at),
                                            ]),
                                            searchValue: search.todos,
                                            placeholder: 'Search todos…',
                                        },
                                        {
                                            key: 'notes',
                                            title: 'Recent Notes',
                                            columns: ['Title', 'Owner', 'Created'],
                                            collection: records.notes,
                                            rows: (records.notes?.data ?? []).map((note) => [
                                                note.title,
                                                note.user?.name ?? '—',
                                                formatDate(note.created_at),
                                            ]),
                                            searchValue: search.notes,
                                            placeholder: 'Search notes…',
                                        },
                                        {
                                            key: 'drawings',
                                            title: 'Recent Drawings',
                                            columns: ['Title', 'Owner', 'Created'],
                                            collection: records.drawings,
                                            rows: (records.drawings?.data ?? []).map((drawing) => [
                                                drawing.title ?? '(Untitled)',
                                                drawing.user?.name ?? '—',
                                                formatDate(drawing.created_at),
                                            ]),
                                            searchValue: search.drawings,
                                            placeholder: 'Search drawings…',
                                        },
                                    ].map(({ key, title, columns, rows, collection, searchValue, placeholder }) => (
                                        <div key={key} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</div>
                                                {searchValue !== undefined && (
                                                    <form
                                                        onSubmit={(event) => handleSearchSubmit(event, key)}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <input
                                                            value={searchValue}
                                                            onChange={(event) =>
                                                                setSearch((prev) => ({
                                                                    ...prev,
                                                                    [key]: event.target.value,
                                                                }))
                                                            }
                                                            placeholder={placeholder}
                                                            className="rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200"
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                                                        >
                                                            Search
                                                        </button>
                                                    </form>
                                                )}
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-gray-50 dark:bg-slate-800/70 text-gray-600 dark:text-gray-300 uppercase tracking-wide text-xs">
                                                        <tr>
                                                            {columns.map((column) => (
                                                                <th key={column} className="px-4 py-2 text-left whitespace-nowrap">
                                                                    {column}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-gray-700 dark:text-gray-200">
                                                        {rows.length === 0 ? (
                                                            <tr>
                                                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400" colSpan={columns.length}>
                                                                    No records yet.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            rows.map((cells, rowIndex) => (
                                                                <tr key={`${key}-row-${rowIndex}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/70">
                                                                    {cells.map((cell, cellIndex) => (
                                                                        <td key={`${key}-cell-${rowIndex}-${cellIndex}`} className="px-4 py-2 whitespace-nowrap">
                                                                            {cell}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        {collection?.links && collection.links.length > 1 && (
                                            <div className="border-t border-gray-200 dark:border-slate-800 px-4 py-2 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                                                {collection.links.map((link, linkIndex) => (
                                                    <button
                                                        key={`${key}-link-${linkIndex}`}
                                                        type="button"
                                                        className={`rounded-md px-2.5 py-1 ${
                                                            link.active
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700'
                                                        } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        onClick={() => {
                                                            if (!link.url) return;
                                                            router.visit(link.url, {
                                                                preserveScroll: true,
                                                                preserveState: true,
                                                            });
                                                        }}
                                                        disabled={!link.url}
                                                    >
                                                        {link.label.replace('&laquo; ', '«').replace(' &raquo;', '»')}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                </div>
                            </section>
                            <section id="diagnostics" className="bg-white dark:bg-slate-900 shadow rounded-xl p-6 border border-gray-200 dark:border-slate-800">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Diagnostics</h2>
                                <SystemStatus forceEnable inline />
                            </section>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
