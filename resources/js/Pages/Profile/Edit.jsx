import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { User, Mail, Key, ArrowLeft, Plus, Copy, Trash2, Eye, EyeOff, LayoutDashboard, Columns, Bell } from 'lucide-react';
import { Switch } from '@headlessui/react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import { Input } from '../../Components/ui/input';
import useWorkspacePreference from '../../hooks/useWorkspacePreference';
import { WORKSPACE_OPTIONS } from '../../constants/workspace';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function Edit({ auth, mustVerifyEmail, status, tokens, new_token }) {
    const user = auth.user;

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
        if (isLoading || permission === 'denied') return;
        if (desiredState) {
            await requestPermission();
        } else {
            await unsubscribe();
        }
    };

    const permissionDenied = permission === 'denied';
    const siteHost = typeof window !== 'undefined' ? window.location.host : 'this site';

    return (
        <AppLayout title="Profile">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-12">
                <Head title="Profile Settings" />

                <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-200/30 text-slate-900 shadow-lg shadow-slate-200/60 p-6 sm:p-8 space-y-6 dark:border-transparent dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:shadow-xl dark:shadow-slate-900/40 dark:text-white">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <span className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-300">Account</span>
                            <h1 className="text-3xl sm:text-4xl font-semibold leading-tight text-slate-900 dark:text-white">Profile Settings</h1>
                            <p className="text-sm text-slate-600 max-w-lg dark:text-slate-300">
                                Manage your personal information, update security credentials, and control API access from one place.
                            </p>
                        </div>
                        <Link href="/dashboard" className="w-full sm:w-auto">
                            <Button
                                variant="outline"
                                className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/30 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>

                    <div className="grid gap-4 text-xs text-slate-600 sm:grid-cols-3 dark:text-slate-200">
                        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                            <p className="uppercase tracking-widest text-slate-500 dark:text-white/70">Member Since</p>
                            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                                {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                            <p className="uppercase tracking-widest text-slate-500 dark:text-white/70">Last Update</p>
                            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                                {new Date(user.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                            <p className="uppercase tracking-widest text-slate-500 dark:text-white/70">Email Status</p>
                            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">{mustVerifyEmail ? 'Verification Required' : 'Verified'}</p>
                        </div>
                    </div>
                </section>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <Card className="hidden lg:block rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg font-semibold text-slate-900 dark:text-slate-100">
                                <User className="w-5 h-5 mr-2 text-indigo-500" />
                                Profile Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Name
                                    </label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={`rounded-xl border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                        required
                                    />
                                    {errors.name && <p className="text-sm text-red-500 dark:text-red-400">{errors.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Email
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className={`rounded-xl border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                        required
                                    />
                                    {errors.email && <p className="text-sm text-red-500 dark:text-red-400">{errors.email}</p>}
                                </div>

                                <Button type="submit" disabled={processing} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                                    {processing ? 'Updating...' : 'Update Profile'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg font-semibold text-slate-900 dark:text-slate-100">
                                <Key className="w-5 h-5 mr-2 text-amber-500" />
                                Change Password
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                <input
                                    type="email"
                                    name="email"
                                    defaultValue={user.email}
                                    autoComplete="username"
                                    className="hidden"
                                    tabIndex={-1}
                                    aria-hidden="true"
                                />
                                <div className="space-y-2">
                                    <label htmlFor="current_password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Current Password
                                    </label>
                                    <Input
                                        id="current_password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={passwordForm.data.current_password}
                                        onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                                        className={`rounded-xl border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${passwordForm.errors.current_password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                        required
                                    />
                                    {passwordForm.errors.current_password && <p className="text-sm text-red-500 dark:text-red-400">{passwordForm.errors.current_password}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        New Password
                                    </label>
                                    <Input
                                        id="password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={passwordForm.data.password}
                                        onChange={(e) => passwordForm.setData('password', e.target.value)}
                                        className={`rounded-xl border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${passwordForm.errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                        required
                                    />
                                    {passwordForm.errors.password && <p className="text-sm text-red-500 dark:text-red-400">{passwordForm.errors.password}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="password_confirmation" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Confirm New Password
                                    </label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        autoComplete="new-password"
                                        value={passwordForm.data.password_confirmation}
                                        onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                        className={`rounded-xl border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${passwordForm.errors.password_confirmation ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                        required
                                    />
                                    {passwordForm.errors.password_confirmation && <p className="text-sm text-red-500 dark:text-red-400">{passwordForm.errors.password_confirmation}</p>}
                                </div>

                                <Button type="submit" disabled={passwordForm.processing} className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white">
                                    {passwordForm.processing ? 'Updating...' : 'Update Password'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <CardHeader>
                        <CardTitle className="flex items-center text-lg font-semibold text-slate-900 dark:text-slate-100">
                            <Mail className="w-5 h-5 mr-2 text-sky-500" />
                            API Tokens
                        </CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Generate and manage personal access tokens for integrating with the Todo API.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-5 space-y-4">
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Create a new token</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Give your token a friendly name, so you remember what it’s used for.</p>
                            </div>
                            <form onSubmit={handleTokenSubmit} className="space-y-3 sm:flex sm:items-center sm:space-y-0 sm:space-x-3">
                                <Input
                                    type="text"
                                    placeholder="Token name (e.g., Mobile App)"
                                    value={tokenForm.data.name}
                                    onChange={(e) => tokenForm.setData('name', e.target.value)}
                                    className="rounded-xl border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    disabled={tokenForm.processing}
                                />
                                <Button type="submit" disabled={tokenForm.processing} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white sm:w-auto">
                                    <Plus className="w-4 h-4 mr-2" />
                                    {tokenForm.processing ? 'Creating…' : 'Create Token'}
                                </Button>
                            </form>
                            {tokenForm.errors.name && <p className="text-sm text-red-500 dark:text-red-400">{tokenForm.errors.name}</p>}
                        </div>

                        {new_token && (
                            <div className="space-y-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-5">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">New token created</h4>
                                        <p className="text-xs text-blue-600/80 dark:text-blue-200/80">Copy this token right away—you won’t see it again.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(new_token.plain_text_token)}
                                        className="border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-800/50"
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy
                                    </Button>
                                </div>
                                <div className="rounded-lg bg-white/80 p-3 font-mono text-xs text-blue-900 break-all dark:bg-blue-950/40 dark:text-blue-100">
                                    {new_token.plain_text_token}
                                </div>
                            </div>
                        )}

                        {tokens && tokens.length > 0 ? (
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Existing tokens</h4>
                                {tokens.map((token) => (
                                    <div key={token.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px] sm:max-w-none">{token.name}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">Created {new Date(token.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{token.id}…</span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleTokenVisibilityToggle(token.id)}
                                                        className="border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
                                                    >
                                                        {visibleTokens.has(token.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                                {visibleTokens.has(token.id) && (
                                                    <div className="rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 break-all">
                                                        {token.plain_text_token || 'Token hidden for security'}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                onClick={() => deleteToken(token.id)}
                                                variant="destructive"
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl sm:w-auto"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            !new_token && (
                                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                    <Key className="w-10 h-10 mx-auto mb-3 opacity-60" />
                                    No API tokens yet. Create your first token to start integrating with the API.
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>

                {isSupported && (
                    <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg font-semibold text-slate-900 dark:text-slate-100">
                                <Bell className="w-5 h-5 mr-2 text-indigo-500" />
                                Push Notifications
                            </CardTitle>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Enable push notifications for real-time updates on this device.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                    <p className="font-medium text-slate-900 dark:text-slate-100">
                                        {permissionDenied ? 'Notifications blocked' : isSubscribed ? 'Notifications enabled' : 'Notifications disabled'}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        {permissionDenied
                                            ? `Notifications are blocked in your browser settings for ${siteHost}. Re-enable them and reload to subscribe again.`
                                            : isSubscribed
                                            ? 'You will receive web push alerts for todos and reminders on this device.'
                                            : 'Turn on notifications to receive updates without keeping this page open.'}
                                    </p>
                                </div>
                                <Switch
                                    checked={isSubscribed}
                                    onChange={handleNotificationToggle}
                                    disabled={isLoading || permissionDenied}
                                    className={`${
                                        isSubscribed
                                            ? 'bg-indigo-600'
                                            : permissionDenied
                                            ? 'bg-gray-300'
                                            : 'bg-gray-200'
                                    } relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed dark:focus-visible:ring-offset-slate-900`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`${
                                            isSubscribed ? 'translate-x-5' : 'translate-x-0'
                                        } pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition`}
                                    />
                                </Switch>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <CardHeader>
                        <CardTitle className="flex items-center text-lg font-semibold text-slate-900 dark:text-slate-100">
                            <LayoutDashboard className="w-5 h-5 mr-2 text-violet-500" />
                            Workspace View Preference
                        </CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Choose how your dashboard opens by default. You can still switch views on the dashboard at any time.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {workspaceCards.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setWorkspaceView(option.id)}
                                    className={`group flex h-full flex-col items-start gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-500 sm:p-5 ${
                                        option.isActive
                                            ? 'border-violet-500 bg-violet-50 text-violet-900 dark:border-violet-400/80 dark:bg-violet-500/10 dark:text-violet-100'
                                            : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/60 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-500/60 dark:hover:bg-violet-500/5'
                                    }`}
                                >
                                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                                        option.isActive
                                            ? 'border-violet-500/80 bg-violet-100 text-violet-900 dark:border-violet-400/60 dark:bg-violet-500/20 dark:text-violet-100'
                                            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}>
                                        {option.id === 'matrix' ? <Columns className="h-3.5 w-3.5" /> : <LayoutDashboard className="h-3.5 w-3.5" />}
                                        {option.label}
                                    </span>
                                    <p className={`text-sm font-semibold ${option.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {option.label}
                                    </p>
                                    <p className={`text-sm leading-6 ${option.isActive ? 'text-slate-800/80 dark:text-slate-200/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {option.blurb}
                                    </p>
                                    <span className={`mt-auto inline-flex items-center gap-2 text-xs font-medium ${option.isActive ? 'text-violet-600 dark:text-violet-300' : 'text-slate-400 group-hover:text-violet-500 dark:text-slate-500 dark:group-hover:text-violet-400'}`}>
                                        {option.isActive ? 'Selected' : 'Select view'}
                                        <ArrowLeft className={`h-3.5 w-3.5 -rotate-90 transition ${option.isActive ? 'text-violet-500' : 'text-slate-400 group-hover:text-violet-500'}`} />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
