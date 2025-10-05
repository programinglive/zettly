import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { User, Mail, Key, ArrowLeft, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import { Input } from '../../Components/ui/input';

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
        }).catch(err => {
            console.error('Failed to copy token: ', err);
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

    return (
        <AppLayout title="Profile">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage your account information and preferences.</p>
                    </div>
                    <Link href="/dashboard">
                        <Button variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Profile Information */}
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <CardHeader>
                            <CardTitle className="flex items-center text-gray-900 dark:text-white">
                                <User className="w-5 h-5 mr-2" />
                                Profile Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Name
                                    </label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white ${errors.name ? 'border-red-500' : ''}`}
                                        required
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white ${errors.email ? 'border-red-500' : ''}`}
                                        required
                                    />
                                    {errors.email && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                                    )}
                                </div>

                                <Button type="submit" disabled={processing} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                    {processing ? 'Updating...' : 'Update Profile'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Change Password */}
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <CardHeader>
                            <CardTitle className="flex items-center text-gray-900 dark:text-white">
                                <Key className="w-5 h-5 mr-2" />
                                Change Password
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Current Password
                                    </label>
                                    <Input
                                        id="current_password"
                                        type="password"
                                        value={passwordForm.data.current_password}
                                        onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white ${passwordForm.errors.current_password ? 'border-red-500' : ''}`}
                                        required
                                    />
                                    {passwordForm.errors.current_password && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordForm.errors.current_password}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        New Password
                                    </label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={passwordForm.data.password}
                                        onChange={(e) => passwordForm.setData('password', e.target.value)}
                                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white ${passwordForm.errors.password ? 'border-red-500' : ''}`}
                                        required
                                    />
                                    {passwordForm.errors.password && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordForm.errors.password}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Confirm New Password
                                    </label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        value={passwordForm.data.password_confirmation}
                                        onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white ${passwordForm.errors.password_confirmation ? 'border-red-500' : ''}`}
                                        required
                                    />
                                    {passwordForm.errors.password_confirmation && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordForm.errors.password_confirmation}</p>
                                    )}
                                </div>

                                <Button type="submit" disabled={passwordForm.processing} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                    {passwordForm.processing ? 'Updating...' : 'Update Password'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Account Information */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                        <CardTitle className="flex items-center text-gray-900 dark:text-white">
                            <Mail className="w-5 h-5 mr-2" />
                            Account Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Account Created
                                </label>
                                <p className="text-gray-900 dark:text-white">
                                    {new Date(user.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Last Updated
                                </label>
                                <p className="text-gray-900 dark:text-white">
                                    {new Date(user.updated_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* API Tokens */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                        <CardTitle className="flex items-center text-gray-900 dark:text-white">
                            <Key className="w-5 h-5 mr-2" />
                            API Tokens
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Manage your API tokens for accessing the todo API programmatically.
                        </p>
                    </CardHeader>
                    <CardContent>
                        {/* Create New Token */}
                        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                            <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-3">
                                Create New API Token
                            </h4>
                            <form onSubmit={handleTokenSubmit} className="flex gap-3">
                                <Input
                                    type="text"
                                    placeholder="Token name (e.g., 'Mobile App')"
                                    value={tokenForm.data.name}
                                    onChange={(e) => tokenForm.setData('name', e.target.value)}
                                    className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                    disabled={tokenForm.processing}
                                />
                                <Button type="submit" disabled={tokenForm.processing} className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    {tokenForm.processing ? 'Creating...' : 'Create Token'}
                                </Button>
                            </form>
                            {tokenForm.errors.name && (
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{tokenForm.errors.name}</p>
                            )}
                        </div>

                        {/* Display New Token (if just created) */}
                        {new_token && (
                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                        New Token Created
                                    </h4>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(new_token.plain_text_token)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy
                                    </Button>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
                                    {new_token.plain_text_token}
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                    ⚠️ Copy this token now. You won't be able to see it again!
                                </p>
                            </div>
                        )}

                        {/* Existing Tokens */}
                        {tokens && tokens.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                    Your API Tokens
                                </h4>
                                <div className="space-y-3">
                                    {tokens.map((token) => (
                                        <div key={token.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                        {token.name}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        Created {new Date(token.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                                                        {token.id}...
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleTokenVisibility(token.id)}
                                                        className="text-gray-600 hover:text-gray-800"
                                                    >
                                                        {visibleTokens.has(token.id) ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                                {visibleTokens.has(token.id) && (
                                                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
                                                        {token.plain_text_token || 'Token hidden for security'}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => deleteToken(token.id)}
                                                className="text-red-600 hover:text-red-800 ml-3"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(!tokens || tokens.length === 0) && !new_token && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No API tokens created yet.</p>
                                <p className="text-sm">Create your first token above to get started with the API.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
