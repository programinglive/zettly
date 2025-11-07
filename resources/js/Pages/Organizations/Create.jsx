import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function CreateOrganization() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        logo_url: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('organizations.store'));
    };

    return (
        <AppLayout>
            <Head title="Create Organization" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <a href={route('organizations.index')} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        <ArrowLeft className="h-5 w-5" />
                    </a>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Create Organization
                        </h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Set up a new workspace for your team
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Organization Details</CardTitle>
                        <CardDescription>
                            Provide basic information about your organization
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
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
                                    placeholder="e.g., Acme Corp"
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
                                    placeholder="Describe your organization..."
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
                                    placeholder="https://example.com/logo.png"
                                    className={errors.logo_url ? 'border-red-500' : ''}
                                />
                                {errors.logo_url && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.logo_url}</p>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="gap-2"
                                >
                                    {processing ? 'Creating...' : 'Create Organization'}
                                </Button>
                                <a href={route('organizations.index')}>
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </a>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
