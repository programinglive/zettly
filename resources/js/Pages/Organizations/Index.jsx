import { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users } from 'lucide-react';
import ImageWithFallback from '@/Components/ImageWithFallback';

export default function OrganizationsIndex({ organizations }) {
    const { flash } = usePage().props;

    return (
        <AppLayout>
            <Head title="Organizations" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Organizations
                        </h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Create and manage team workspaces for collaboration
                        </p>
                    </div>
                    <Link href={route('organizations.create')}>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            New Organization
                        </Button>
                    </Link>
                </div>

                {/* Success Message */}
                {flash?.success && (
                    <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {flash.success}
                    </div>
                )}

                {/* Organizations Grid */}
                {organizations.data && organizations.data.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {organizations.data.map((org) => (
                            <Link key={org.id} href={route('organizations.show', org.id)}>
                                <Card className="h-full transition-all hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg">{org.name}</CardTitle>
                                                <CardDescription className="mt-1">
                                                    {org.description || 'No description'}
                                                </CardDescription>
                                            </div>
                                            <ImageWithFallback
                                                src={org.logo_url}
                                                alt={org.name}
                                                className="h-10 w-10 rounded-full object-cover"
                                                fallbackClassName="h-10 w-10 rounded-full"
                                                initials={org.name.charAt(0).toUpperCase()}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4" />
                                                <span>{org.users_count} members</span>
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                                {new Date(org.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Users className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No organizations yet
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                Create your first organization to start collaborating with your team
                            </p>
                            <Link href={route('organizations.create')}>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create Organization
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
