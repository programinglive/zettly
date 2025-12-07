import React from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';

import { ModeToggle } from '../Components/mode-toggle';
import NavbarSearch from '../Components/NavbarSearch';
import Footer from '../Components/Footer';
import PwaInstallPrompt from '../Components/PwaInstallPrompt';
import usePwaMode from '../hooks/usePwaMode';

export default function AppLayout({
    children,
    title,
    contentClassName,
    navClassName,
    variant,
}) {
    const ALGOLIA_ATTRIBUTION_URL =
        'https://www.algolia.com/?utm_source=zettly&utm_medium=referral&utm_campaign=oss_search';

    const page = usePage();
    const { auth, flash } = page.props;
    const isSuperAdmin = auth?.user?.role === 'super_admin';
    const { url } = page;
    const { isStandalone, isTablet } = usePwaMode();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [desktopMenuOpen, setDesktopMenuOpen] = React.useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);

    const isAuthenticated = Boolean(auth?.user);
    const brandHref = isAuthenticated ? '/dashboard' : '/';

    const accountNavigationLinks = [
        {
            href: '/dashboard',
            label: 'Dashboard',
            description: 'Return to your home workspace',
            icon: (
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v6m4-6v6m4-6v6" />
                </svg>
            ),
            group: 'primary',
        },
        {
            href: '/todos',
            label: 'My Todos',
            description: 'View active tasks and notes',
            icon: (
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
            group: 'primary',
        },
        {
            href: '/notes',
            label: 'My Notes',
            description: 'Review personal notes and drafts',
            icon: (
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V10l-6-6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4a2 2 0 002 2h4" />
                </svg>
            ),
            group: 'primary',
        },
        {
            href: '/draw',
            label: 'Draw',
            description: 'Open the sketch workspace',
            icon: (
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            group: 'primary',
        },
        {
            href: '/todos/completed',
            label: 'Completed',
            group: 'archive',
        },
        {
            href: '/todos/archived',
            label: 'Archived',
            group: 'archive',
        },
        {
            href: '/todos/deleted',
            label: 'Trash',
            group: 'archive',
        },
        {
            href: '/manage/tags',
            label: 'Manage Tags',
            group: 'resource',
        },
        {
            href: '/organizations',
            label: 'Organizations',
            description: 'Manage team workspaces',
            icon: (
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 8.048M7 14H5a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-1-12a4 4 0 110 8m-5 10v2m5-12v2m5 10v2" />
                </svg>
            ),
            group: 'resource',
        },
        {
            href: '/profile',
            label: 'Profile Settings',
            group: 'resource',
        },
    ];

    if (isSuperAdmin) {
        accountNavigationLinks.unshift({
            href: '/admin/system-monitor',
            label: 'System Monitor',
            description: 'Monitor queues, jobs, and system health',
            icon: (
                <svg
                    className="w-4 h-4 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    {/* Monitor frame */}
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V5z"
                    />
                    {/* Stand */}
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 17h4m-6 2h8"
                    />
                    {/* Heartbeat / activity line */}
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6.5 11H9l1.2-2.4L12.5 13l1.3-2H17.5"
                    />
                </svg>
            ),
            group: 'admin',
        });
    }

    const legacyDesktopMenuLinks = accountNavigationLinks.map(({ href, label, icon }) => ({ href, label, icon }));
    const legacyMobileMenuLinks = accountNavigationLinks.map(({ href, label }) => ({ href, label }));

    const groupedLinks = accountNavigationLinks.reduce((acc, link) => {
        if (!acc[link.group]) {
            acc[link.group] = [];
        }

        acc[link.group].push(link);

        return acc;
    }, {});

    const primaryAccountLinks = groupedLinks.primary ?? [];
    const archiveLinks = groupedLinks.archive ?? [];
    const resourceLinks = groupedLinks.resource ?? [];
    const adminLinks = groupedLinks.admin ?? [];

    const fallbackArchiveLinks = archiveLinks.length
        ? archiveLinks
        : legacyDesktopMenuLinks.filter((link) => ['/todos/completed', '/todos/archived', '/todos/deleted'].includes(link.href));

    
    // For PWA on tablets, use full width; otherwise use responsive max-width
    const defaultContentClassName = isAuthenticated
        ? 'w-full px-4 sm:px-6 lg:px-8'
        : isStandalone && isTablet
        ? 'w-full px-4 sm:px-6 lg:px-8'
        : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
    const defaultNavClassName = isAuthenticated
        ? 'w-full px-4 sm:px-6 lg:px-8'
        : isStandalone && isTablet
        ? 'w-full px-4 sm:px-6 lg:px-8'
        : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';

    const resolvedContentClassName = contentClassName ?? defaultContentClassName;
    const resolvedNavClassName = navClassName ?? defaultNavClassName;
    const resolvedVariant = variant ?? (isAuthenticated ? 'authenticated' : 'public');

    const handleLogout = React.useCallback(() => {
        router.post('/logout', {}, { preserveScroll: true });
    }, []);

    return (
        <>
            <Head title={title || 'Zettly'} />
            <PwaInstallPrompt />

            {/* Search Loading Overlay */}
            <div
                id="search-loading-overlay"
                style={{ display: 'none' }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-8 flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Searching…</p>
                </div>
            </div>

            <div className="min-h-screen bg-white dark:bg-slate-950 font-sans antialiased transition-colors">
                {/* Flash Messages */}
                {(flash?.success || flash?.error) && (
                    <div className="fixed inset-x-4 top-4 sm:inset-auto sm:right-4 sm:left-auto z-50">
                        <div className="flex flex-col gap-2 sm:max-w-sm sm:w-80 sm:ml-auto">
                            {flash.success && (
                                <div
                                    className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg shadow-sm text-sm"
                                    role="alert"
                                >
                                    <span className="block truncate">{flash.success}</span>
                                </div>
                            )}
                            {flash.error && (
                                <div
                                    className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg shadow-sm text-sm"
                                    role="alert"
                                >
                                    <span className="block truncate">{flash.error}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="relative z-40 border-b bg-white/95 backdrop-blur dark:bg-slate-900/80 transition-colors">
                    <div className={`${resolvedNavClassName} relative`}>
                        {resolvedVariant === 'public' ? (
                            <>
                                <div className="flex items-center justify-between h-16">
                                    <Link href={brandHref} className="flex items-center gap-2 text-gray-900 dark:text-white">
                                        <span className="text-xl">📝</span>
                                        <span className="text-lg font-semibold tracking-tight">Zettly</span>
                                    </Link>

                                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
                                        <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
                                        <a href="#why" className="hover:text-gray-900 dark:hover:text-white transition-colors">Why Zettly</a>
                                        <a href="#developer" className="hover:text-gray-900 dark:hover:text-white transition-colors">Developer</a>
                                    </div>

                                    <div className="hidden md:flex items-center gap-3">
                                        <ModeToggle />
                                    </div>

                                    <div className="flex md:hidden items-center gap-2">
                                        <ModeToggle />
                                        <button
                                            type="button"
                                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {mobileMenuOpen && (
                                    <div className="md:hidden space-y-4 border-t border-gray-200 py-4 dark:border-slate-800">
                                        <div className="flex flex-col gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                                            <a href="#features" className="rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800" onClick={() => setMobileMenuOpen(false)}>
                                                Features
                                            </a>
                                            <a href="#why" className="rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800" onClick={() => setMobileMenuOpen(false)}>
                                                Why Zettly
                                            </a>
                                            <a href="#developer" className="rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800" onClick={() => setMobileMenuOpen(false)}>
                                                Developer
                                            </a>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {!auth?.user ? (
                                                <Link
                                                    href="#hero-cta"
                                                    className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                                                >
                                                    Get Started
                                                </Link>
                                            ) : null}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="flex h-16 items-center justify-between">
                                    <div className="flex items-center">
                                        <Link href={brandHref}>
                                            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                📝 Zettly
                                            </h1>
                                        </Link>
                                    </div>
                                    {auth?.user ? (
                                        <div className="hidden md:flex flex-1 items-center justify-center px-6 lg:px-10">
                                            <NavbarSearch className="w-full max-w-2xl" />
                                        </div>
                                    ) : null}

                                    <div className="hidden md:flex items-center space-x-4">
                                        <ModeToggle />
                                        {auth?.user ? (
                                            <div className="flex items-center space-x-4">
                                                <div className="relative">
                                                    <button 
                                                        onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
                                                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        <span>Welcome, {auth.user.name}!</span>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    
                                                    {desktopMenuOpen && (
                                                        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 z-50">
                                                            <div className="py-2">
                                                                <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 dark:text-slate-500">
                                                                    Quick access
                                                                </div>

                                                                {[...adminLinks, ...primaryAccountLinks].map(({ href, label, description, icon }) => (
                                                                    <Link
                                                                        key={href}
                                                                        href={href}
                                                                        className="group flex items-start gap-3 px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-slate-800/80"
                                                                    >
                                                                        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200">
                                                                            {icon ?? (
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12" />
                                                                                </svg>
                                                                            )}
                                                                        </span>
                                                                        <span>
                                                                            <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                                                                            {description ? (
                                                                                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                                                                                    {description}
                                                                                </span>
                                                                            ) : null}
                                                                        </span>
                                                                    </Link>
                                                                ))}

                                                                <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 dark:text-slate-500">
                                                                    History & archives
                                                                </div>
                                                                <div className="mt-1 space-y-1 px-4 pb-3">
                                                                    {archiveLinks.map(({ href, label }) => (
                                                                        <Link
                                                                            key={href}
                                                                            href={href}
                                                                            className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800"
                                                                        >
                                                                            {label}
                                                                        </Link>
                                                                    ))}
                                                                </div>

                                                                <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 dark:text-slate-500">
                                                                    Tools
                                                                </div>
                                                                <div className="mt-1 space-y-1 px-4 pb-3">
                                                                    {resourceLinks.map(({ href, label }) => (
                                                                        <Link
                                                                            key={href}
                                                                            href={href}
                                                                            className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800"
                                                                        >
                                                                            {label}
                                                                        </Link>
                                                                    ))}
                                                                </div>

                                                                <div className="border-t border-gray-200 dark:border-slate-800 my-1"></div>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleLogout}
                                                                    className="flex items-center w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800"
                                                                >
                                                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                                    </svg>
                                                                    Logout
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="md:hidden flex items-center space-x-2">
                                        <ModeToggle />
                                        {auth?.user ? (
                                            <button
                                                onClick={() => {
                                                    setMobileSearchOpen((prev) => !prev);
                                                    if (mobileMenuOpen) {
                                                        setMobileMenuOpen(false);
                                                    }
                                                }}
                                                className={`inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium transition-colors ${
                                                    mobileSearchOpen
                                                        ? 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-gray-100 shadow-sm'
                                                        : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800'
                                                }`}
                                                aria-label="Search"
                                                aria-pressed={mobileSearchOpen}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </button>
                                        ) : null}
                                        {auth?.user ? (
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                    </svg>
                                                </button>
                                                
                                                {mobileMenuOpen && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-md shadow-lg border border-gray-200 dark:border-slate-800 z-50">
                                                        <div className="py-1">
                                                            <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-slate-800">
                                                                {auth.user.name}
                                                            </div>
                                                            {[...adminLinks, ...primaryAccountLinks].map(({ href, label }) => (
                                                                <Link
                                                                    key={href}
                                                                    href={href}
                                                                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                                                                >
                                                                    {label}
                                                                </Link>
                                                            ))}
                                                            <div className="border-t border-gray-200 dark:border-slate-800 my-1"></div>
                                                            {[...archiveLinks, ...resourceLinks].map(({ href, label }) => (
                                                                <Link
                                                                    key={href}
                                                                    href={href}
                                                                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                                                                >
                                                                    {label}
                                                                </Link>
                                                            ))}
                                                            <form method="POST" action="/logout" className="block">
                                                                <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')} />
                                                                <button type="submit" className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                                                                    Logout
                                                                </button>
                                                            </form>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                    </svg>
                                                </button>
                                                
                                                {mobileMenuOpen && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-md shadow-lg border border-gray-200 dark:border-slate-800 z-50">
                                                        <div className="py-1">
                                                            <Link href="#hero-cta" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800">
                                                                Get Started
                                                            </Link>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {mobileSearchOpen && auth?.user ? (
                                        <div className="md:hidden absolute left-0 right-0 top-full z-40 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-lg rounded-b-lg">
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Search</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setMobileSearchOpen(false)}
                                                    className="inline-flex items-center rounded-md border border-transparent px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200"
                                                    aria-label="Close search"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <NavbarSearch className="w-full" />
                                        </div>
                                    ) : null}
                                </div>
                            </>
                        )}
                    </div>
                </nav>

                {/* Main Content */}
                <main className="py-8 bg-gray-50 dark:bg-slate-950 min-h-screen transition-colors">
                    <div className={resolvedContentClassName}>{children}</div>
                </main>

                {url === '/' || url === '/developer' ? <Footer /> : null}
            </div>
        </>
    );
}
