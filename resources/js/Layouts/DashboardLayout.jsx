import React from 'react';

import AppLayout from './AppLayout';

export default function DashboardLayout({
    children,
    contentClassName,
    navClassName,
    ...rest
}) {
    const resolvedContentClassName = contentClassName ?? 'w-full px-4 sm:px-6 lg:px-8';
    const resolvedNavClassName = navClassName ?? 'w-full px-4 sm:px-6 lg:px-8';

    return (
        <AppLayout
            {...rest}
            contentClassName={resolvedContentClassName}
            navClassName={resolvedNavClassName}
        >
            {children}
        </AppLayout>
    );
}
