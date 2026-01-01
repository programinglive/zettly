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

    const [activeTab, setActiveTab] = React.useState('users');
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

    const tabs = [
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
        {
            key: 'diagnostics',
            title: 'System Diagnostics',
            isDiagnostics: true,
        },
    ];

    const currentTab = tabs.find(tab => tab.key === activeTab) || tabs[0];

    return (
        <AppLayout title="System Monitor">
            <Head title="System Monitor" />

            <div className="max-w-7xl mx-auto space-y-6 py-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Monitor</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Monitor application health and recent activity
                    </p>
                </div>

                {!isSuperAdmin ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        You do not have permission to view this page.
                    </div>
                ) : (
                    <>
                        {/* Metrics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Users', value: metrics.users ?? 0 },
                                { label: 'Todos', value: metrics.todos ?? 0 },
                                { label: 'Notes', value: metrics.notes ?? 0 },
                                { label: 'Drawings', value: metrics.drawings ?? 0 },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-6">
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</div>
                                    <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Per Page Control */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <span>Show</span>
                                <select
                                    value={perPage}
                                    onChange={handlePerPageChange}
                                    className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
                                >
                                    {[5, 10, 20, 50].map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                <span>entries</span>
                            </div>
                        </div>

                        {/* Tabbed Recent Activity */}
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
                            {/* Tab Headers */}
                            <div className="border-b border-gray-200 dark:border-slate-800">
                                <nav className="flex -mb-px">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                                                    ? 'border-gray-900 dark:border-slate-400 text-gray-900 dark:text-white'
                                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-slate-600'
                                                }`}
                                        >
                                            {tab.title}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* Tab Content */}
                            <div>
                                {currentTab.isDiagnostics ? (
                                    <div className="p-6">
                                        <SystemStatus forceEnable inline />
                                    </div>
                                ) : (
                                    <>
                                        {/* Search Bar */}
                                        {currentTab.searchValue !== undefined && (
                                            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800">
                                                <form
                                                    onSubmit={(event) => handleSearchSubmit(event, currentTab.key)}
                                                    className="flex items-center gap-2"
                                                >
                                                    <input
                                                        value={currentTab.searchValue}
                                                        onChange={(event) =>
                                                            setSearch((prev) => ({
                                                                ...prev,
                                                                [currentTab.key]: event.target.value,
                                                            }))
                                                        }
                                                        placeholder={currentTab.placeholder}
                                                        className="flex-1 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm"
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="rounded-lg bg-gray-900 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-slate-600"
                                                    >
                                                        Search
                                                    </button>
                                                </form>
                                            </div>
                                        )}

                                        {/* Table */}
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full">
                                                <thead className="bg-gray-50 dark:bg-slate-800/50">
                                                    <tr>
                                                        {currentTab.columns.map((column) => (
                                                            <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                                {column}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                                                    {currentTab.rows.length === 0 ? (
                                                        <tr>
                                                            <td className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400 text-center" colSpan={currentTab.columns.length}>
                                                                No records found
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        currentTab.rows.map((cells, rowIndex) => (
                                                            <tr key={`row-${rowIndex}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                                                {cells.map((cell, cellIndex) => (
                                                                    <td key={`cell-${rowIndex}-${cellIndex}`} className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                                                                        {cell}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        {currentTab.collection?.links && currentTab.collection.links.length > 1 && (
                                            <div className="border-t border-gray-200 dark:border-slate-800 px-6 py-3 flex gap-2">
                                                {currentTab.collection.links.map((link, linkIndex) => (
                                                    <button
                                                        key={`link-${linkIndex}`}
                                                        type="button"
                                                        className={`rounded-lg px-3 py-1.5 text-sm ${link.active
                                                                ? 'bg-gray-900 dark:bg-slate-700 text-white'
                                                                : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
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
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
