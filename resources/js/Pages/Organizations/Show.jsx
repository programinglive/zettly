import { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { ArrowLeft, Users, Mail, Trash2, Shield, User } from 'lucide-react';

export default function ShowOrganization({ organization, members, isAdmin }) {
    const { flash } = usePage().props;
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');
    const { data: inviteData, setData: setInviteData, post: invitePost, processing: inviteProcessing } = useForm({ email: '' });
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
        <AppLayout title={organization.name}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-5 h-5 text-indigo-500" />
                            <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Organization</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                            {organization.name}
                        </h1>
                        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
                            {organization.description || `Manage your team and resources within the ${organization.name} workspace.`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={route('organizations.index')}>
                            <button className="rounded-full px-6 py-3 text-sm font-semibold transition border border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-slate-900 dark:text-white">
                                <ArrowLeft className="w-4 h-4 mr-2 inline" />
                                Back
                            </button>
                        </Link>
                        {isAdmin && (
                            <Link href={route('organizations.settings', organization.id)}>
                                <button className="rounded-full px-6 py-3 text-sm font-semibold transition border border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-slate-900 dark:text-white">
                                    Settings
                                </button>
                            </Link>
                        )}
                        <button
                            onClick={handleLeave}
                            disabled={deleteProcessing}
                            className="rounded-full px-6 py-3 text-sm font-semibold transition bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 shadow-sm"
                        >
                            Leave
                        </button>
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

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
                            <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Members ({members.length})
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                        Manage organization members and their roles
                                    </p>
                                </div>
                                <div className="px-6 py-4">
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
                                                        <button
                                                            onClick={() => handleRemoveMember(member.id)}
                                                            disabled={deleteProcessing}
                                                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Invite Card */}
                            {isAdmin && (
                                <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Mail className="h-5 w-5" />
                                            Invite Member
                                        </h2>
                                    </div>
                                    <div className="px-6 py-4">
                                        <form onSubmit={handleInvite} className="space-y-4">
                                            <TextInput
                                                type="email"
                                                placeholder="user@example.com"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                className="border border-gray-300 w-full"
                                            />
                                            <PrimaryButton
                                                type="submit"
                                                disabled={inviteProcessing}
                                                className="w-full justify-center"
                                            >
                                                {inviteProcessing ? 'Inviting...' : 'Send Invite'}
                                            </PrimaryButton>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* Info Card */}
                            <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Organization Info</h2>
                                </div>
                                <div className="px-6 py-4 space-y-4 text-sm">
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
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
