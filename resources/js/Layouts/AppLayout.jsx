import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';

import { ModeToggle } from '../Components/mode-toggle';
import Footer from '../Components/Footer';

export default function AppLayout({
    children,
    title,
    contentClassName,
    navClassName,
    variant,
}) {
    const page = usePage();
    const { auth, flash } = page.props;
    const { url } = page;
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [desktopMenuOpen, setDesktopMenuOpen] = React.useState(false);

    const isAuthenticated = Boolean(auth?.user);
    const brandHref = isAuthenticated ? '/dashboard' : '/';
    const defaultContentClassName = isAuthenticated
        ? 'w-full px-4 sm:px-6 lg:px-8'
        : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
    const defaultNavClassName = isAuthenticated
        ? 'w-full px-4 sm:px-6 lg:px-8'
        : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';

    const resolvedContentClassName = contentClassName ?? defaultContentClassName;
    const resolvedNavClassName = navClassName ?? defaultNavClassName;
    const resolvedVariant = variant ?? (isAuthenticated ? 'authenticated' : 'public');

    return (
        <>
            <Head title={title || 'Zettly'} />
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
                    <div className={resolvedNavClassName}>
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
                            <div className="flex justify-between h-16">
                                <div className="flex items-center">
                                    <Link href={brandHref}>
                                        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                                            📝 Zettly
                                        </h1>
                                    </Link>
                                </div>
                                
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
                                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                                                        <div className="py-1">
                                                            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                                                                Account Menu
                                                            </div>
                                                            <Link href="/dashboard" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800">
                                                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v6m4-6v6m4-6v6" />
                                                                </svg>
                                                                Dashboard
                                                            </Link>
                                                            <Link href="/todos" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800">
                                                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                                </svg>
                                                                My Todos
                                                            </Link>
                                                            <Link href="/todos/archived" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800">
                                                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18v2H3zM3 18h18v2H3z" />
                                                                </svg>
                                                                Archived
                                                            </Link>
                                                            <Link href="/manage/tags" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800">
                                                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                                </svg>
                                                                Manage Tags
                                                            </Link>
                                                            <Link href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800">
                                                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                </svg>
                                                                Profile
                                                            </Link>
                                                            <div className="border-t border-gray-200 dark:border-slate-800 my-1"></div>
                                                            <form method="POST" action="/logout" className="block">
                                                                <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')} />
                                                                <button type="submit" className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800">
                                                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                                    </svg>
                                                                    Logout
                                                                </button>
                                                            </form>
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
                                                        <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800">
                                                            Dashboard
                                                        </Link>
                                                        <Link href="/todos" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800">
                                                            My Todos
                                                        </Link>
                                                        <Link href="/manage/tags" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800">
                                                            Manage Tags
                                                        </Link>
                                                        <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800">
                                                            Profile
                                                        </Link>
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
                            </div>
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
