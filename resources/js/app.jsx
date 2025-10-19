import React from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import './bootstrap';
import '../css/app.css';
import 'zettly-editor/styles';

import { ThemeProvider } from './Components/theme-provider';

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
        return pages[`./Pages/${name}.jsx`];
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <ThemeProvider defaultTheme="system" storageKey="todo-theme">
                <App {...props} />
            </ThemeProvider>
        );
    },
});
