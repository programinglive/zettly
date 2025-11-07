import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import DangerButton from '@/components/DangerButton';
import TextInput from '@/components/TextInput';
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
                        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization Details</h2>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Update your organization information
                                </p>
                            </div>
                            <div className="px-6 py-4">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Name */}
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Organization Name *
                                        </label>
                                        <TextInput
                                            id="name"
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className={errors.name ? 'border-red-500' : 'border border-gray-300'}
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
                                        <textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            rows={4}
                                            className={`w-full rounded-md px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:focus:border-indigo-600 dark:focus:ring-indigo-600 ${
                                                errors.description ? 'border-red-500' : 'border border-gray-300'
                                            }`}
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
                                        <TextInput
                                            id="logo_url"
                                            type="url"
                                            value={data.logo_url}
                                            onChange={(e) => setData('logo_url', e.target.value)}
                                            className={errors.logo_url ? 'border-red-500' : 'border border-gray-300'}
                                        />
                                        {errors.logo_url && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.logo_url}</p>
                                        )}
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3 pt-4">
                                        <PrimaryButton
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing ? 'Saving...' : 'Save Changes'}
                                        </PrimaryButton>
                                        <a href={route('organizations.show', organization.id)}>
                                            <SecondaryButton type="button">
                                                Cancel
                                            </SecondaryButton>
                                        </a>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div>
                        <div className="rounded-lg border border-red-200 bg-white shadow-sm dark:border-red-900/50 dark:bg-gray-800">
                            <div className="border-b border-red-200 px-6 py-4 dark:border-red-900/50">
                                <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                    Irreversible actions
                                </p>
                            </div>
                            <div className="px-6 py-4">
                                <DangerButton
                                    className="w-full gap-2 justify-center"
                                    onClick={handleDelete}
                                    disabled={processing}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Organization
                                </DangerButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
