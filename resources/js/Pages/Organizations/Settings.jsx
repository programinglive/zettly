import { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, Mail, Trash2, Shield, User, AlertTriangle, ChevronDown } from 'lucide-react';

export default function OrganizationSettings({ organization, members, isAdmin }) {
    const { flash } = usePage().props;
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [selectedMemberRole, setSelectedMemberRole] = useState({});
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { data, setData, patch, delete: destroy, processing, errors } = useForm({
        name: organization.name,
        description: organization.description || '',
        logo_url: organization.logo_url || '',
    });
    const { post: invitePost, processing: inviteProcessing } = useForm();
    const { delete: deletePost, processing: deleteProcessing } = useForm();

    const handleUpdateOrganization = (e) => {
        e.preventDefault();
        patch(route('organizations.update', organization.id));
    };

    const handleInvite = (e) => {
        e.preventDefault();
        setInviteError('');

        if (!inviteEmail) {
            setInviteError('Please enter an email address');
            return;
        }

        invitePost(route('organizations.invite', organization.id), {
            data: { email: inviteEmail },
            onSuccess: () => {
                setInviteEmail('');
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

    const handleUpdateRole = (memberId, newRole) => {
        if (confirm(`Change this member's role to ${newRole}?`)) {
            patch(route('organizations.update-member-role', [organization.id, memberId]), {
                data: { role: newRole },
            });
        }
    };

    const handleDeleteOrganization = () => {
        if (deleteConfirmation === organization.name) {
            destroy(route('organizations.destroy', organization.id));
        }
    };

    if (!isAdmin) {
        return (
            <AppLayout>
                <Head title={`${organization.name} - Settings`} />
                <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    <p className="font-medium">Access Denied</p>
                    <p className="text-sm">You must be an admin to access organization settings.</p>
                    <Link href={route('organizations.show', organization.id)}>
                        <Button className="mt-4" variant="outline">
                            Back to Organization
                        </Button>
                    </Link>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Head title={`${organization.name} - Settings`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href={route('organizations.show', organization.id)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {organization.name} - Settings
                        </h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Manage organization details and members
                        </p>
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
                {inviteError && (
                    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        {inviteError}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Organization Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Organization Details</CardTitle>
                                <CardDescription>
                                    Update your organization information
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdateOrganization} className="space-y-6">
                                    {/* Name */}
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Organization Name *
                                        </label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className={errors.name ? 'border-red-500' : ''}
                                        />
                                        {errors.name && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Description
                                        </label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            rows={4}
                                            className={errors.description ? 'border-red-500' : ''}
                                        />
                                        {errors.description && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                                        )}
                                    </div>

                                    {/* Logo URL */}
                                    <div>
                                        <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Logo URL
                                        </label>
                                        <Input
                                            id="logo_url"
                                            type="url"
                                            value={data.logo_url}
                                            onChange={(e) => setData('logo_url', e.target.value)}
                                            className={errors.logo_url ? 'border-red-500' : ''}
                                        />
                                        {errors.logo_url && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.logo_url}</p>
                                        )}
                                    </div>

                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Members Management */}
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
                                                    <button
                                                        onClick={() => {
                                                            const newRole = member.role === 'admin' ? 'member' : 'admin';
                                                            handleUpdateRole(member.id, newRole);
                                                        }}
                                                        disabled={deleteProcessing}
                                                        className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 disabled:opacity-50"
                                                        title={`Change to ${member.role === 'admin' ? 'member' : 'admin'}`}
                                                    >
                                                        <ChevronDown className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    disabled={deleteProcessing}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                </Button>
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

                        {/* Danger Zone */}
                        <Card className="border-red-200 dark:border-red-900/50">
                            <CardHeader>
                                <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Danger Zone
                                </CardTitle>
                                <CardDescription>
                                    Irreversible actions
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!showDeleteConfirm ? (
                                    <Button
                                        variant="destructive"
                                        className="w-full gap-2"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={processing}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete Organization
                                    </Button>
                                ) : (
                                    <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
                                        <div>
                                            <p className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">
                                                This action cannot be undone. This will permanently delete the organization and all associated data.
                                            </p>
                                            <p className="text-sm text-red-800 dark:text-red-400 mb-4">
                                                Please type the organization name <span className="font-bold">{organization.name}</span> to confirm:
                                            </p>
                                            <Input
                                                type="text"
                                                placeholder={organization.name}
                                                value={deleteConfirmation}
                                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                                className="border-red-300 dark:border-red-700"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="destructive"
                                                className="flex-1 gap-2"
                                                onClick={handleDeleteOrganization}
                                                disabled={deleteConfirmation !== organization.name || deleteProcessing}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete Organization
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => {
                                                    setShowDeleteConfirm(false);
                                                    setDeleteConfirmation('');
                                                }}
                                                disabled={deleteProcessing}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
