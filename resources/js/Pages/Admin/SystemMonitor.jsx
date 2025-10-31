import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import SystemStatus from '../../Components/SystemStatus';

export default function SystemMonitor() {
    const { props } = usePage();
    const isSuperAdmin = props.auth?.user?.role === 'super_admin';

    return (
        <AppLayout title="System Monitor">
            <Head title="System Monitor" />
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-white dark:bg-slate-900 shadow rounded-xl p-6 border border-gray-200 dark:border-slate-800">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">System Monitor</h1>
                    {!isSuperAdmin && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                            You do not have permission to view this page.
                        </div>
                    )}
                    {isSuperAdmin && (
                        <div className="space-y-4">
                            <p className="text-gray-700 dark:text-gray-300">
                                Monitor application health, broadcasting configuration, authentication status, and third-party integrations.
                            </p>
                            <SystemStatus forceEnable inline />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
