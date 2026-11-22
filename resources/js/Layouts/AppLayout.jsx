import React from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import {
    LayoutDashboard,
    LayoutList,
    CheckSquare,
    FileText,
    PenTool,
    Target,
    Users,
    Settings,
    LogOut,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Monitor,
    Hash,
    Network,
    BookOpen,
    ScrollText,
    Bot,
    Calendar,
    MoreHorizontal,
    BarChart3
} from 'lucide-react';

import { ModeToggle } from '../Components/mode-toggle';
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
    const page = usePage();
    const { auth, flash, canUseCodingAgent, canProvisionCodingAgent, app: appMeta } = page.props;
    const appVersion = (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) || appMeta?.version || '';
    const appCommit = (typeof __APP_COMMIT__ !== 'undefined' && __APP_COMMIT__) || appMeta?.commit || '';
    const isSuperAdmin = auth?.user?.role === 'super_admin';
    const { url } = page;
    const { isStandalone, isTablet } = usePwaMode();
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
    const [moreOpen, setMoreOpen] = React.useState(false);

    const isAuthenticated = Boolean(auth?.user);
    const brandHref = isAuthenticated ? '/summary' : '/';

    // Primary destinations lead with Summary as default landing, with Today right below.
    const primaryNavigation = [
        {
            href: '/summary',
            label: 'Summary',
            icon: BarChart3,
            group: 'main',
            description: 'Executive project charts, velocity trends, and focus health',
        },
        {
            href: '/dashboard',
            label: 'Today',
            icon: LayoutDashboard,
            group: 'main',
            description: 'Daily overview, active focuses, and open tasks',
        },
        {
            href: '/todos',
            label: 'Tasks',
            icon: CheckSquare,
            group: 'main',
            description: 'All tasks with priority, status, and tag filters',
        },
        {
            href: '/notes',
            label: 'Notes',
            icon: FileText,
            group: 'main',
            description: 'Personal notes, specs, and reference docs',
        },
        {
            href: '/journal',
            label: 'Journal',
            icon: BookOpen,
            group: 'main',
            description: 'Daily work logs, reflections, and outcomes',
        },
        {
            href: '/reports',
            label: 'Reports',
            icon: ScrollText,
            group: 'main',
            description: 'Automated daily, weekly, and monthly recaps',
        },
        {
            href: '/profile',
            label: 'Settings',
            icon: Settings,
            group: 'main',
            description: 'Account, theme, and workspace preferences',
        },
    ];

    const secondaryNavigation = [
        { href: '/priority', label: 'Priority Queue', description: 'Pareto 80/20 ranked queue and Today WIP plan', icon: LayoutList, group: 'main', section: 'planning' },
        { href: '/calendar', label: 'Calendar', description: 'Weekly focus allocation and schedule view', icon: Calendar, group: 'main', section: 'planning' },
        { href: '/todos/board', label: 'Todo Board', description: 'Eisenhower Matrix and Kanban task board', icon: LayoutDashboard, group: 'main', section: 'planning' },
        { href: '/habits', label: 'Habits', description: 'Daily habit streaks and consistency tracker', icon: Target, group: 'main', section: 'planning' },
        { href: '/draw', label: 'Draw', description: 'Architecture and visual diagram canvas', icon: PenTool, group: 'main', section: 'knowledge' },
        { href: '/graph', label: 'Graph', description: 'Zettelkasten linked knowledge graph', icon: Network, group: 'main', section: 'knowledge' },
        { href: '/manage/tags', label: 'Tags', description: 'Manage Zettelkasten axes and tags', icon: Hash, group: 'main', section: 'knowledge' },
    ];

    const developerNavigation = [];
    if (canUseCodingAgent) {
        developerNavigation.push({ href: '/agent/jobs', label: 'Coding Agent', description: 'Autonomous coding jobs and worker hub', icon: Bot, group: 'main' });
    }

    if (canProvisionCodingAgent && !canUseCodingAgent) {
        developerNavigation.push({ href: '/agent/setup', label: 'Coding Agent Setup', description: 'Provision coding agent repositories and workers', icon: Bot, group: 'main' });
    }

    const adminNavigation = [];
    if (isSuperAdmin) {
        adminNavigation.push({ href: '/admin/system-monitor', label: 'System Monitor', description: 'Server, queue, and WebSocket health monitor', icon: Monitor, group: 'admin' });
        adminNavigation.push({ href: '/engineering', label: 'Engineering Control Center', description: 'Retrospectives, standards, and agent scorecards', icon: Monitor, group: 'admin' });
    }

    const moreSections = [
        {
            id: 'planning',
            label: 'Planning & Focus',
            items: secondaryNavigation.filter((item) => item.section === 'planning'),
        },
        {
            id: 'knowledge',
            label: 'Knowledge & Visual',
            items: secondaryNavigation.filter((item) => item.section === 'knowledge'),
        },
        ...(developerNavigation.length > 0
            ? [{ id: 'automation', label: 'AI & Automation', items: developerNavigation }]
            : []),
        ...(adminNavigation.length > 0
            ? [{ id: 'admin', label: 'Admin & Ops', items: adminNavigation }]
            : []),
    ];

    const moreNavigation = [...secondaryNavigation, ...developerNavigation, ...adminNavigation];
    const allNavigation = [...primaryNavigation, ...moreNavigation];

    // Profile menu items
    const profileMenuItems = [
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

    const resolvedContentClassName = contentClassName ?? 'w-full';
    const resolvedNavClassName = navClassName ?? 'w-full px-4 sm:px-6';
    const resolvedVariant = variant ?? (isAuthenticated ? 'authenticated' : 'public');

    const handleLogout = React.useCallback(() => {
        router.post('/logout', {}, { preserveScroll: true });
    }, []);

    const isActive = (href) => {
        if (url === href) return true;
        if (url.startsWith(href + '/')) {
            // Check if there is a more specific link in the sidebar that also matches the current URL
            return !allNavigation.some(item =>
                item.href !== href &&
                (url === item.href || url.startsWith(item.href + '/')) &&
                item.href.length > href.length
            );
        }
        return false;
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
                                className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-16'
                                    } hidden lg:flex`}
                            >
                                {/* Sidebar Header */}
                                <div className={`flex items-center h-12 px-3 border-b border-gray-200 dark:border-slate-800 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
                                    {sidebarOpen && (
                                        <Link href={brandHref} className="flex items-center gap-2">
                                            <span className="text-base leading-none">📝</span>
                                            <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">Zettly</span>
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-gray-400"
                                        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                                    >
                                        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Sidebar Navigation */}
                                <nav className="flex-1 overflow-y-auto py-3 px-2.5">
                                    {sidebarOpen && (
                                        <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                            Workspace
                                        </div>
                                    )}
                                    <div className="space-y-0.5">
                                        {primaryNavigation.map((item) => {
                                            const Icon = item.icon;
                                            const active = isActive(item.href);

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors relative group ${active
                                                        ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white'
                                                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/70 dark:hover:bg-slate-800/40 hover:text-gray-900 dark:hover:text-white'
                                                        }`}
                                                    title={sidebarOpen ? item.description : `${item.label} — ${item.description}`}
                                                >
                                                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
                                                    {active && (
                                                        <div className="absolute left-0 w-0.5 h-4 bg-gray-900 dark:bg-white rounded-r-full" />
                                                    )}
                                                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setMoreOpen(!moreOpen)}
                                            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100/70 dark:hover:bg-slate-800/40 hover:text-gray-900 dark:hover:text-white transition-colors"
                                            title={!sidebarOpen ? 'More tools & workspace views' : 'Toggle additional workspace views'}
                                            aria-expanded={moreOpen}
                                        >
                                            <MoreHorizontal className="w-4 h-4 flex-shrink-0" />
                                            {sidebarOpen && <span className="truncate">More</span>}
                                        </button>
                                        {moreOpen && (
                                            <div className="mt-2 space-y-3">
                                                {moreSections.map((section) => (
                                                    <div key={section.id} className="space-y-0.5">
                                                        {sidebarOpen && (
                                                            <div className="px-2.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                                                {section.label}
                                                            </div>
                                                        )}
                                                        {section.items.map((item) => {
                                                            const Icon = item.icon;
                                                            const active = isActive(item.href);
                                                            return (
                                                                <Link
                                                                    key={item.href}
                                                                    href={item.href}
                                                                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${active
                                                                        ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white'
                                                                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/70 dark:hover:bg-slate-800/40 hover:text-gray-900 dark:hover:text-white'
                                                                        }`}
                                                                    title={sidebarOpen ? item.description : `${item.label} — ${item.description}`}
                                                                >
                                                                    <Icon className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-slate-500" />
                                                                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </nav>

                                {appVersion && (
                                    <div
                                        data-testid="app-version-badge"
                                        className={`border-t border-gray-200 dark:border-slate-800 px-3 py-2 text-[11px] font-mono text-gray-400 dark:text-slate-500 ${sidebarOpen ? 'flex items-center justify-between' : 'text-center'}`}
                                        title={`Zettly v${appVersion}${appCommit ? ` (${appCommit})` : ''}`}
                                    >
                                        <span>v{appVersion}</span>
                                        {sidebarOpen && appCommit && (
                                            <span className="text-[10px] text-gray-400/80 dark:text-slate-500">{appCommit}</span>
                                        )}
                                    </div>
                                )}
                            </aside>

                            {/* Mobile Sidebar Overlay */}
                            {mobileSidebarOpen && (
                                <div
                                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                                    onClick={() => setMobileSidebarOpen(false)}
                                >
                                    <aside
                                        className="fixed inset-y-0 left-0 w-56 flex flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-between h-12 px-3 border-b border-gray-200 dark:border-slate-800">
                                            <Link href={brandHref} className="flex items-center gap-2">
                                                <span className="text-base leading-none">📝</span>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">Zettly</span>
                                            </Link>
                                            <button
                                                onClick={() => setMobileSidebarOpen(false)}
                                                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-gray-400"
                                                title="Close sidebar"
                                            >
                                                <PanelLeftClose className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
                                            <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                                Workspace
                                            </div>
                                            <div className="space-y-0.5">
                                                {primaryNavigation.map((item) => {
                                                    const Icon = item.icon;
                                                    const active = isActive(item.href);

                                                    return (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            onClick={() => setMobileSidebarOpen(false)}
                                                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${active
                                                                ? 'bg-gray-900 dark:bg-slate-700 text-white'
                                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                                                                }`}
                                                            title={item.description}
                                                        >
                                                            <Icon className="w-4 h-4 flex-shrink-0" />
                                                            <span className="truncate">{item.label}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-slate-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setMoreOpen(!moreOpen)}
                                                    className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                                    aria-expanded={moreOpen}
                                                >
                                                    <MoreHorizontal className="w-4 h-4 flex-shrink-0" />
                                                    <span>More</span>
                                                </button>
                                                {moreOpen && (
                                                    <div className="mt-2 space-y-3">
                                                        {moreSections.map((section) => (
                                                            <div key={section.id} className="space-y-0.5">
                                                                <div className="px-2.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                                                    {section.label}
                                                                </div>
                                                                {section.items.map((item) => {
                                                                    const Icon = item.icon;
                                                                    const active = isActive(item.href);
                                                                    return (
                                                                        <Link
                                                                            key={item.href}
                                                                            href={item.href}
                                                                            onClick={() => setMobileSidebarOpen(false)}
                                                                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${active
                                                                                ? 'bg-gray-900 dark:bg-slate-700 text-white'
                                                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                                                                                }`}
                                                                            title={item.description}
                                                                        >
                                                                            <Icon className="w-4 h-4 flex-shrink-0" />
                                                                            <span className="truncate">{item.label}</span>
                                                                        </Link>
                                                                    );
                                                                })}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </nav>

                                        {appVersion && (
                                            <div className="border-t border-gray-200 dark:border-slate-800 px-3 py-2 text-[11px] font-mono text-gray-400 dark:text-slate-500 flex items-center justify-between">
                                                <span>v{appVersion}</span>
                                                {appCommit && <span>{appCommit}</span>}
                                            </div>
                                        )}
                                    </aside>
                                </div>
                            )}

                            {/* Main Content Area */}
                            <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${sidebarOpen ? 'lg:ml-56' : 'lg:ml-16'} transition-all duration-200`}>
                                {/* Top Navigation */}
                                <nav className="h-12 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4">
                                    <div className="flex items-center gap-3 flex-1">
                                        {/* Mobile Menu Button */}
                                        <button
                                            onClick={() => setMobileSidebarOpen(true)}
                                            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800"
                                        >
                                            <Menu className="w-4 h-4" />
                                        </button>

                                    </div>

                                    <div className="flex items-center gap-2">

                                        <ModeToggle />

                                        {/* Profile Menu */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <div className="w-7 h-7 rounded-full bg-gray-700 dark:bg-slate-600 flex items-center justify-center text-white font-semibold text-xs">
                                                    {auth?.user?.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {auth?.user?.name}
                                                </span>
                                                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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


                                {/* Main Content */}
                                <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-950">
                                    <div className={`min-w-0 ${resolvedContentClassName}`}>{children}</div>
                                </main>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
