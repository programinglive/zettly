import { ReactNode } from 'react';

export interface AppLayoutProps {
    children: ReactNode;
    title?: string;
    contentClassName?: string;
    navClassName?: string;
    variant?: 'authenticated' | 'public';
}

export default function AppLayout(props: AppLayoutProps): JSX.Element;
