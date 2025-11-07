import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function EditOrganization({ organization }) {
    const { data, setData, post, delete: destroy, processing, errors } = useForm({
        name: organization.name,
        description: organization.description || '',
        logo_url: organization.logo_url || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('organizations.update', organization.id));
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
            destroy(route('organizations.destroy', organization.id));
        }
    };

    return (
        <AppLayout>
            <Head title={`Edit ${organization.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <a href={route('organizations.show', organization.id)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        <ArrowLeft className="h-5 w-5" />
                    </a>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Edit Organization
                        </h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Update organization settings
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Form Card */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Organization Details</CardTitle>
                                <CardDescription>
                                    Update your organization information
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

                                    {/* Buttons */}
                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                        <a href={route('organizations.show', organization.id)}>
                                            <Button type="button" variant="outline">
                                                Cancel
                                            </Button>
                                        </a>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Danger Zone */}
                    <div>
                        <Card className="border-red-200 dark:border-red-900/50">
                            <CardHeader>
                                <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                                <CardDescription>
                                    Irreversible actions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    variant="destructive"
                                    className="w-full gap-2"
                                    onClick={handleDelete}
                                    disabled={processing}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Organization
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
