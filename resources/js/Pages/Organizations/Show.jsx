import { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, Mail, Trash2, Shield, User } from 'lucide-react';

export default function ShowOrganization({ organization, members, isAdmin }) {
    const { flash } = usePage().props;
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');
    const { post: invitePost, processing: inviteProcessing } = useForm();
    const { delete: deletePost, processing: deleteProcessing } = useForm();

    const handleInvite = (e) => {
        e.preventDefault();
        setInviteError('');
        setInviteSuccess('');

        if (!inviteEmail) {
            setInviteError('Please enter an email address');
            return;
        }

        invitePost(route('organizations.invite', organization.id), {
            data: { email: inviteEmail },
            onSuccess: () => {
                setInviteEmail('');
                setInviteSuccess('User invited successfully!');
            },
            onError: (errors) => {
                setInviteError(errors.email || 'Failed to invite user');
            },
        });
    };

    const handleRemoveMember = (memberId) => {
        if (confirm('Are you sure you want to remove this member?')) {
            deletePost(route('organizations.remove-member', [organization.id, memberId]));
        }
    };

    const handleLeave = () => {
        if (confirm('Are you sure you want to leave this organization?')) {
            deletePost(route('organizations.leave', organization.id));
        }
    };

    return (
        <AppLayout>
            <Head title={organization.name} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <a href={route('organizations.index')} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </a>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {organization.name}
                            </h1>
                            {organization.description && (
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {organization.description}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {isAdmin && (
                            <Link href={route('organizations.settings', organization.id)}>
                                <Button variant="outline">Settings</Button>
                            </Link>
                        )}
                        <Button variant="outline" onClick={handleLeave} disabled={deleteProcessing}>
                            Leave
                        </Button>
                    </div>
                </div>

                {/* Messages */}
                {flash?.success && (
                    <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        {flash.error}
                    </div>
                )}
                {inviteSuccess && (
                    <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {inviteSuccess}
                    </div>
                )}
                {inviteError && (
                    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        {inviteError}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Members Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Members ({members.length})
                                </CardTitle>
                                <CardDescription>
                                    Manage organization members and their roles
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {members.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                                                    {member.user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {member.user.name}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {member.user.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20">
                                                    {member.role === 'admin' ? (
                                                        <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    ) : (
                                                        <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                    )}
                                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 capitalize">
                                                        {member.role}
                                                    </span>
                                                </div>
                                                {isAdmin && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        disabled={deleteProcessing}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Invite Card */}
                        {isAdmin && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Mail className="h-5 w-5" />
                                        Invite Member
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleInvite} className="space-y-4">
                                        <Input
                                            type="email"
                                            placeholder="user@example.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                        <Button
                                            type="submit"
                                            disabled={inviteProcessing}
                                            className="w-full"
                                        >
                                            {inviteProcessing ? 'Inviting...' : 'Send Invite'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* Info Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Organization Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Created by</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {organization.creator.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Created on</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {new Date(organization.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Organization ID</p>
                                    <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                                        {organization.slug}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
