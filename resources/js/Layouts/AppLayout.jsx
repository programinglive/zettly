import React from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import {
    LayoutDashboard,
    CheckSquare,
    FileText,
    PenTool,
    Target,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    Monitor
} from 'lucide-react';

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
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);

    const isAuthenticated = Boolean(auth?.user);
    const brandHref = isAuthenticated ? '/dashboard' : '/';

    // Sidebar navigation items
    const sidebarNavigation = [
        {
            href: '/dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            group: 'main',
        },
        {
            href: '/todos',
            label: 'My Todos',
            icon: CheckSquare,
            group: 'main',
        },
        {
            href: '/notes',
            label: 'My Notes',
            icon: FileText,
            group: 'main',
        },
        {
            href: '/draw',
            label: 'Draw',
            icon: PenTool,
            group: 'main',
        },
        {
            href: '/habits',
            label: 'Habits',
            icon: Target,
            group: 'main',
        },
    ];

    if (isSuperAdmin) {
        sidebarNavigation.unshift({
            href: '/admin/system-monitor',
            label: 'System Monitor',
            icon: Monitor,
            group: 'admin',
        });
    }

    // Profile menu items (moved from Quick Access)
    const profileMenuItems = [
        {
            href: '/todos/completed',
            label: 'Completed',
        },
        {
            href: '/todos/archived',
            label: 'Archived',
        },
        {
            href: '/todos/deleted',
            label: 'Trash',
        },
        {
            href: '/manage/tags',
            label: 'Manage Tags',
        },
        {
            href: '/organizations',
            label: 'Organizations',
            icon: Users,
        },
        {
            href: '/profile',
            label: 'Profile Settings',
            icon: Settings,
        },
    ];

    const resolvedContentClassName = contentClassName ?? 'w-full px-4 sm:px-6 lg:px-8';
    const resolvedNavClassName = navClassName ?? 'w-full px-4 sm:px-6 lg:px-8';
    const resolvedVariant = variant ?? (isAuthenticated ? 'authenticated' : 'public');

    const handleLogout = React.useCallback(() => {
        router.post('/logout', {}, { preserveScroll: true });
    }, []);

    const isActive = (href) => {
        return url === href || url.startsWith(href + '/');
    };

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

                {resolvedVariant === 'public' ? (
                    <>
                        {/* Public Navigation */}
                        <nav className="relative z-40 border-b bg-white/95 backdrop-blur dark:bg-slate-900/80 transition-colors">
                            <div className={`${resolvedNavClassName} relative`}>
                                <div className="flex items-center justify-between h-16">
                                    <Link href={brandHref} className="flex items-center gap-2 text-gray-900 dark:text-white">
                                        <span className="text-xl">📝</span>
                                        <span className="text-lg font-semibold tracking-tight">Zettly</span>
                                    </Link>

                                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
                                        <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
                                        <a href="#why" className="hover:text-gray-900 dark:hover:text-white transition-colors">Why Zettly</a>
                                        <a href="#developer" className="hover:text-gray-900 dark:hover:text-white transition-colors">Developer</a>
                                        <Link href="/docs" className="hover:text-gray-900 dark:hover:text-white transition-colors">Docs</Link>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <ModeToggle />
                                    </div>
                                </div>
                            </div>
                        </nav>

                        {/* Public Content */}
                        <main className="py-8 bg-gray-50 dark:bg-slate-950 min-h-screen transition-colors">
                            <div className={resolvedContentClassName}>{children}</div>
                        </main>

                        {url === '/' || url === '/developer' ? <Footer /> : null}
                    </>
                ) : (
                    <>
                        {/* Authenticated Layout with Sidebar */}
                        <div className="flex h-screen overflow-hidden">
                            {/* Sidebar */}
                            <aside
                                className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'
                                    } hidden lg:flex`}
                            >
                                {/* Sidebar Header */}
                                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-slate-800">
                                    {sidebarOpen && (
                                        <Link href={brandHref} className="flex items-center gap-2">
                                            <span className="text-xl">📝</span>
                                            <span className="text-lg font-semibold text-gray-900 dark:text-white">Zettly</span>
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Sidebar Navigation */}
                                <nav className="flex-1 overflow-y-auto py-4 px-3">
                                    <div className="space-y-1">
                                        {sidebarNavigation.map((item) => {
                                            const Icon = item.icon;
                                            const active = isActive(item.href);

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active
                                                        ? 'bg-gray-900 dark:bg-slate-700 text-white'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                                                        }`}
                                                    title={!sidebarOpen ? item.label : undefined}
                                                >
                                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                                    {sidebarOpen && <span className="font-medium">{item.label}</span>}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </nav>
                            </aside>

                            {/* Mobile Sidebar Overlay */}
                            {mobileSidebarOpen && (
                                <div
                                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                                    onClick={() => setMobileSidebarOpen(false)}
                                >
                                    <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800">
                                        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-slate-800">
                                            <Link href={brandHref} className="flex items-center gap-2">
                                                <span className="text-xl">📝</span>
                                                <span className="text-lg font-semibold text-gray-900 dark:text-white">Zettly</span>
                                            </Link>
                                            <button
                                                onClick={() => setMobileSidebarOpen(false)}
                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <nav className="py-4 px-3">
                                            <div className="space-y-1">
                                                {sidebarNavigation.map((item) => {
                                                    const Icon = item.icon;
                                                    const active = isActive(item.href);

                                                    return (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            onClick={() => setMobileSidebarOpen(false)}
                                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active
                                                                ? 'bg-gray-900 dark:bg-slate-700 text-white'
                                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                                                                }`}
                                                        >
                                                            <Icon className="w-5 h-5" />
                                                            <span className="font-medium">{item.label}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </nav>
                                    </aside>
                                </div>
                            )}

                            {/* Main Content Area */}
                            <div className={`flex-1 flex flex-col overflow-hidden ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} transition-all duration-300`}>
                                {/* Top Navigation */}
                                <nav className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4">
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Mobile Menu Button */}
                                        <button
                                            onClick={() => setMobileSidebarOpen(true)}
                                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                                        >
                                            <Menu className="w-5 h-5" />
                                        </button>

                                        {/* Search Bar */}
                                        <div className="hidden md:flex flex-1 max-w-2xl">
                                            <NavbarSearch className="w-full" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Mobile Search Button */}
                                        <button
                                            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                                            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </button>

                                        <ModeToggle />

                                        {/* Profile Menu */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gray-700 dark:bg-slate-600 flex items-center justify-center text-white font-semibold text-sm">
                                                    {auth?.user?.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {auth?.user?.name}
                                                </span>
                                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {/* Profile Dropdown */}
                                            {profileMenuOpen && (
                                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 z-50">
                                                    <div className="py-2">
                                                        {profileMenuItems.map((item) => {
                                                            const Icon = item.icon;
                                                            return (
                                                                <Link
                                                                    key={item.href}
                                                                    href={item.href}
                                                                    onClick={() => setProfileMenuOpen(false)}
                                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                                                >
                                                                    {Icon && <Icon className="w-4 h-4" />}
                                                                    <span>{item.label}</span>
                                                                </Link>
                                                            );
                                                        })}

                                                        <div className="border-t border-gray-200 dark:border-slate-800 my-1"></div>

                                                        <button
                                                            onClick={handleLogout}
                                                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800"
                                                        >
                                                            <LogOut className="w-4 h-4" />
                                                            <span>Logout</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </nav>

                                {/* Mobile Search */}
                                {mobileSearchOpen && (
                                    <div className="md:hidden border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                                        <NavbarSearch className="w-full" />
                                    </div>
                                )}

                                {/* Main Content */}
                                <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">
                                    <div className={resolvedContentClassName}>{children}</div>
                                </main>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
