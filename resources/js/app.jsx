import React from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import './bootstrap';
import 'zettly-editor/styles';
import '../css/app.css';

import { ThemeProvider } from './Components/theme-provider';

const pages = import.meta.glob('./Pages/**/*.jsx');

createInertiaApp({
    resolve: async (name) => {
        const importer = pages[`./Pages/${name}.jsx`];

        if (!importer) {
            throw new Error(`Unknown Inertia page: ${name}`);
        }

        const module = await importer();

        return module.default;
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <ThemeProvider defaultTheme="system" storageKey="todo-theme">
                <App {...props} />
            </ThemeProvider>
        );
    },
});
