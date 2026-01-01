import { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import { Plus, Users } from 'lucide-react';
import ImageWithFallback from '@/Components/ImageWithFallback';

export default function OrganizationsIndex({ organizations }) {
    const { flash } = usePage().props;

    return (
        <AppLayout>
            <Head title="Organizations" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="flex-1">
                        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                            Organizations
                        </h1>
                        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
                            Create and manage team workspaces for collaboration.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={route('organizations.create')}>
                            <PrimaryButton className="rounded-full px-6 py-6 h-auto text-base font-semibold transition shadow-sm bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                                <Plus className="h-5 w-5 mr-2" />
                                New Organization
                            </PrimaryButton>
                        </Link>
                    </div>
                </div>

                {/* Success Message */}
                {flash?.success && (
                    <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {flash.success}
                    </div>
                )}

                {/* Organizations Grid */}
                {organizations.data && organizations.data.length > 0 ? (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {organizations.data.map((org) => (
                            <Link key={org.id} href={route('organizations.show', org.id)} className="group">
                                <article className="h-full rounded-[2.5rem] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-gray-200 dark:border-gray-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
                                    <div className="p-8 pb-6">
                                        <div className="flex items-start justify-between gap-4 mb-6">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate group-hover:text-black dark:group-hover:text-white transition-colors">{org.name}</h3>
                                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-light line-clamp-2 leading-relaxed">
                                                    {org.description || 'Manage your team\'s work and collaborate in real-time.'}
                                                </p>
                                            </div>
                                            <ImageWithFallback
                                                src={org.logo_url}
                                                alt={org.name}
                                                className="h-16 w-16 rounded-[1.5rem] object-cover shadow-inner ring-4 ring-gray-50 dark:ring-slate-800"
                                                fallbackClassName="h-16 w-16 rounded-[1.5rem]"
                                                initials={org.name.charAt(0).toUpperCase()}
                                            />
                                        </div>
                                    </div>
                                    <div className="px-8 pb-8 pt-0">
                                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-3.5 w-3.5" />
                                                <span>{org.users_count} Members</span>
                                            </div>
                                            <span>
                                                Est. {new Date(org.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex flex-col items-center justify-center py-12 px-6">
                            <Users className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No organizations yet
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                Create your first organization to start collaborating with your team
                            </p>
                            <Link href={route('organizations.create')}>
                                <PrimaryButton className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create Organization
                                </PrimaryButton>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
