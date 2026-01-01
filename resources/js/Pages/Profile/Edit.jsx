import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { User, Mail, Key, ArrowLeft, Plus, Copy, Trash2, Eye, EyeOff, LayoutDashboard, Columns, Bell, Bug } from 'lucide-react';
import { Switch } from '@headlessui/react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Input } from '../../Components/ui/input';
import useWorkspacePreference from '../../hooks/useWorkspacePreference';
import { WORKSPACE_OPTIONS } from '../../constants/workspace';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function Edit({ auth, mustVerifyEmail, status, tokens, new_token }) {
    const user = auth.user;
    const isSuperAdmin = user?.role === 'super_admin';

    const { data, setData, patch, processing, errors } = useForm({
        name: user.name,
        email: user.email,
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const tokenForm = useForm({
        name: '',
    });

    const [visibleTokens, setVisibleTokens] = useState(new Set());
    const [workspaceView, setWorkspaceView] = useWorkspacePreference(user.workspace_view);
    const [debugMode, setDebugMode] = useState(() => {
        if (!isSuperAdmin) {
            return false;
        }

        if (typeof window !== 'undefined') {
            return localStorage.getItem('zettly-debug-mode') === 'true';
        }

        return false;
    });
    const { isSupported, isSubscribed, isLoading, requestPermission, unsubscribe, permission } = usePushNotifications();

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const storageKey = 'zettly-notifications-dismissed';
        const previousValue = window.localStorage.getItem(storageKey);
        window.localStorage.setItem(storageKey, '1');
        window.dispatchEvent(new Event('zettly:push-prompt-dismiss'));
        return () => {
            if (previousValue === null) {
                window.localStorage.removeItem(storageKey);
            } else {
                window.localStorage.setItem(storageKey, previousValue);
                window.dispatchEvent(new Event('zettly:push-prompt-dismiss'));
            }
        };
    }, []);

    const workspaceCards = useMemo(() => (
        WORKSPACE_OPTIONS.map((option) => {
            const isActive = workspaceView === option.id;

            return {
                ...option,
                isActive,
            };
        })
    ), [workspaceView]);
    const handleSubmit = (e) => {
        e.preventDefault();
        patch('/profile');
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        passwordForm.put('/user/password', {
            onSuccess: () => {
                passwordForm.reset();
            }
        });
    };

    const handleTokenSubmit = (e) => {
        e.preventDefault();
        tokenForm.post('/tokens', {
            onSuccess: () => {
                tokenForm.reset();
            }
        });
    };

    const deleteToken = (tokenId) => {
        if (confirm('Are you sure you want to delete this token?')) {
            // Create a form and submit it with DELETE method
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `/tokens/${tokenId}`;

            // Add CSRF token
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_token';
            csrfInput.value = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            form.appendChild(csrfInput);

            // Add method DELETE
            const methodInput = document.createElement('input');
            methodInput.type = 'hidden';
            methodInput.name = '_method';
            methodInput.value = 'DELETE';
            form.appendChild(methodInput);

            document.body.appendChild(form);
            form.submit();
        }
    };

    const copyToClipboard = (token) => {
        navigator.clipboard.writeText(token).then(() => {
            // Show a brief success indicator
            alert('Token copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy token. Please copy it manually.');
        });
    };

    const toggleTokenVisibility = (tokenId) => {
        const newVisible = new Set(visibleTokens);
        if (newVisible.has(tokenId)) {
            newVisible.delete(tokenId);
        } else {
            newVisible.add(tokenId);
        }
        setVisibleTokens(newVisible);
    };

    const handleTokenVisibilityToggle = (tokenId) => {
        toggleTokenVisibility(tokenId);
    };

    const handleNotificationToggle = async (desiredState) => {
        console.debug('[profile-toggle] Toggling notifications to', desiredState);
        if (isLoading || permission === 'denied') return;
        if (desiredState) {
            const result = await requestPermission();
            console.debug('[profile-toggle] requestPermission result:', result);
        } else {
            const result = await unsubscribe();
            console.debug('[profile-toggle] unsubscribe result:', result);
        }
    };

    const handleDebugToggle = (enabled) => {
        if (!isSuperAdmin) {
            return;
        }

        setDebugMode(enabled);
        if (typeof window !== 'undefined') {
            localStorage.setItem('zettly-debug-mode', enabled.toString());
            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('zettly:debug-mode-changed', {
                detail: { enabled }
            }));
        }
    };

    useEffect(() => {
        if (!isSuperAdmin && typeof window !== 'undefined') {
            const storageKey = 'zettly-debug-mode';
            if (localStorage.getItem(storageKey) !== 'false') {
                localStorage.setItem(storageKey, 'false');
                window.dispatchEvent(new CustomEvent('zettly:debug-mode-changed', {
                    detail: { enabled: false },
                }));
            }
        }
    }, [isSuperAdmin]);

    const permissionDenied = permission === 'denied';
    const siteHost = typeof window !== 'undefined' ? window.location.host : 'this site';

    return (
        <AppLayout title="Profile">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 pb-24">
                <Head title="Profile Settings" />

                {/* Page Header */}
                <div className="mb-16">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
                            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl">
                                Manage your personal information, security preferences, and workspace configuration.
                            </p>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>Member since {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                <span>•</span>
                                <span>Email {mustVerifyEmail ? 'verification required' : 'verified'}</span>
                            </div>
                        </div>
                        <Link href="/dashboard">
                            <Button
                                variant="outline"
                                className="rounded-lg border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="space-y-16">
                    {/* Profile Section */}
                    <section id="profile" className="grid gap-x-12 gap-y-6 lg:grid-cols-[280px_1fr]">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Update your public profile information.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-gray-200">
                                    Display Name
                                </label>
                                <Input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={data.name}
                                    autoComplete="name"
                                    onChange={(e) => setData('name', e.target.value)}
                                    className={`rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 ${errors.name ? 'border-red-500 focus:ring-red-500' : 'focus:ring-gray-900 dark:focus:ring-gray-400'}`}
                                    required
                                />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-gray-900 dark:text-gray-200">
                                    Email Address
                                </label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={data.email}
                                    autoComplete="email"
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={`rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 ${errors.email ? 'border-red-500 focus:ring-red-500' : 'focus:ring-gray-900 dark:focus:ring-gray-400'}`}
                                    required
                                />
                                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                            </div>

                            <div className="pt-2">
                                <Button type="submit" disabled={processing} className="rounded-lg bg-gray-900 hover:bg-black text-white px-5 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </section>

                    <hr className="border-gray-100 dark:border-gray-800" />

                    {/* Password Section */}
                    <section id="password" className="grid gap-x-12 gap-y-6 lg:grid-cols-[280px_1fr]">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Password</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Ensure your account is secure with a strong password.</p>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="max-w-lg space-y-6">
                            <input type="email" autoComplete="username" name="hidden_username" id="hidden_username" className="hidden" aria-hidden="true" />

                            <div className="space-y-2">
                                <label htmlFor="current_password" className="text-sm font-medium text-gray-900 dark:text-gray-200">
                                    Current Password
                                </label>
                                <Input
                                    id="current_password"
                                    name="current_password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={passwordForm.data.current_password}
                                    onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                                    className={`rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 ${passwordForm.errors.current_password ? 'border-red-500' : ''}`}
                                    required
                                />
                                {passwordForm.errors.current_password && <p className="text-sm text-red-500">{passwordForm.errors.current_password}</p>}
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="new_password" className="text-sm font-medium text-gray-900 dark:text-gray-200">
                                        New Password
                                    </label>
                                    <Input
                                        id="new_password"
                                        name="new_password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={passwordForm.data.password}
                                        onChange={(e) => passwordForm.setData('password', e.target.value)}
                                        className={`rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 ${passwordForm.errors.password ? 'border-red-500' : ''}`}
                                        required
                                    />
                                    {passwordForm.errors.password && <p className="text-sm text-red-500">{passwordForm.errors.password}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="confirm_password" className="text-sm font-medium text-gray-900 dark:text-gray-200">
                                        Confirm Password
                                    </label>
                                    <Input
                                        id="confirm_password"
                                        name="confirm_password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={passwordForm.data.password_confirmation}
                                        onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                        className={`rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 ${passwordForm.errors.password_confirmation ? 'border-red-500' : ''}`}
                                        required
                                    />
                                    {passwordForm.errors.password_confirmation && <p className="text-sm text-red-500">{passwordForm.errors.password_confirmation}</p>}
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button type="submit" disabled={passwordForm.processing} className="rounded-lg bg-gray-900 hover:bg-black text-white px-5 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                                    {passwordForm.processing ? 'Updating...' : 'Update Password'}
                                </Button>
                            </div>
                        </form>
                    </section>

                    <hr className="border-gray-100 dark:border-gray-800" />

                    {/* API Tokens Section */}
                    <section id="api-tokens" className="grid gap-x-12 gap-y-6 lg:grid-cols-[280px_1fr]">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Tokens</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage personal access tokens for API integration.</p>
                        </div>
                        <div className="max-w-2xl space-y-8">
                            {/* Create Token */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Create New Token</h3>
                                <form onSubmit={handleTokenSubmit} className="flex gap-3">
                                    <Input
                                        id="token_name"
                                        name="token_name"
                                        type="text"
                                        placeholder="Token name (e.g. Mobile App)"
                                        value={tokenForm.data.name}
                                        onChange={(e) => tokenForm.setData('name', e.target.value)}
                                        className="rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex-1"
                                        disabled={tokenForm.processing}
                                    />
                                    <Button type="submit" disabled={tokenForm.processing} className="rounded-lg bg-gray-900 hover:bg-black text-white dark:bg-white dark:text-gray-900">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create
                                    </Button>
                                </form>
                                {tokenForm.errors.name && <p className="text-sm text-red-500 mt-2">{tokenForm.errors.name}</p>}
                            </div>

                            {/* New Token Display */}
                            {new_token && (
                                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Token Created Successfully</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(new_token.plain_text_token)}
                                            className="h-8 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                        >
                                            <Copy className="w-3.5 h-3.5 mr-2" />
                                            Copy
                                        </Button>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-600 break-all border border-gray-100 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-300">
                                        {new_token.plain_text_token}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Make sure to copy your token now. You won't be able to see it again.</p>
                                </div>
                            )}

                            {/* Token List */}
                            {tokens && tokens.length > 0 && (
                                <div className="space-y-4">
                                    {tokens.map((token) => (
                                        <div key={token.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{token.name}</span>
                                                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 dark:text-gray-500 px-2 py-0.5 rounded-full">
                                                        {visibleTokens.has(token.id) ? 'Visible' : 'Hidden'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-mono">ID: {token.id}</span>
                                                    <span>•</span>
                                                    <span>Created {new Date(token.created_at).toLocaleDateString()}</span>
                                                </div>
                                                {visibleTokens.has(token.id) && (
                                                    <div className="mt-2 font-mono text-xs text-gray-600 break-all dark:text-gray-400">
                                                        {token.plain_text_token || '••••••••••••••••••••••••••••••••'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleTokenVisibilityToggle(token.id)}
                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                                >
                                                    {visibleTokens.has(token.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </Button>
                                                <Button
                                                    onClick={() => deleteToken(token.id)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <hr className="border-gray-100 dark:border-gray-800" />

                    {/* Workspace Preference */}
                    <section id="workspace" className="grid gap-x-12 gap-y-6 lg:grid-cols-[280px_1fr]">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Workspace View</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Choose your default dashboard layout.</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
                            {workspaceCards.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setWorkspaceView(option.id)}
                                    className={`group relative flex flex-col items-start gap-4 rounded-xl border p-5 text-left transition-all ${option.isActive
                                        ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900 dark:border-gray-100 dark:bg-gray-800 dark:ring-gray-100'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:hover:bg-gray-900'
                                        }`}
                                >
                                    <div className={`rounded-lg p-2 ${option.isActive
                                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                        {option.id === 'matrix' ? <Columns className="w-5 h-5" /> : <LayoutDashboard className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-semibold ${option.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                                            {option.label}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                            {option.blurb}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Notifications */}
                    {isSupported && (
                        <>
                            <hr className="border-gray-100 dark:border-gray-800" />
                            <section id="notifications" className="grid gap-x-12 gap-y-6 lg:grid-cols-[280px_1fr]">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage device alerts.</p>
                                </div>
                                <div className="max-w-2xl flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-transparent">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Push Notifications</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                                            {permissionDenied
                                                ? 'Notifications are currently blocked by your browser.'
                                                : 'Receive alerts for reminders and updates on this device.'}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={isSubscribed}
                                        onChange={handleNotificationToggle}
                                        disabled={isLoading || permissionDenied}
                                        className={`${isSubscribed ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                                            } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-900`}
                                    >
                                        <span
                                            area-hidden="true"
                                            className={`${isSubscribed ? 'translate-x-5' : 'translate-x-0'
                                                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition duration-200 ease-in-out`}
                                        />
                                    </Switch>
                                </div>
                            </section>
                        </>
                    )}

                    {/* Debug Settings */}
                    {isSuperAdmin && (
                        <>
                            <hr className="border-gray-100 dark:border-gray-800" />
                            <section id="debug" className="grid gap-x-12 gap-y-6 lg:grid-cols-[280px_1fr]">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Developer</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Advanced diagnostic tools.</p>
                                </div>
                                <div className="max-w-2xl bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">Debug Mode</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Show technical details, WebSocket status, and performance metrics.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={debugMode}
                                            onChange={handleDebugToggle}
                                            className={`${debugMode ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                                                } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-900`}
                                        >
                                            <span
                                                area-hidden="true"
                                                className={`${debugMode ? 'translate-x-5' : 'translate-x-0'
                                                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition duration-200 ease-in-out`}
                                            />
                                        </Switch>
                                    </div>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
