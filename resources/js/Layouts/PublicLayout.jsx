import React from 'react';

import AppLayout from './AppLayout';

export default function PublicLayout({ children, contentClassName, navClassName, ...rest }) {
    const resolvedContentClassName = contentClassName ?? 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
    const resolvedNavClassName = navClassName ?? 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';

    return (
        <AppLayout
            {...rest}
            contentClassName={resolvedContentClassName}
            navClassName={resolvedNavClassName}
            variant="public"
        >
            {children}
        </AppLayout>
    );
}
