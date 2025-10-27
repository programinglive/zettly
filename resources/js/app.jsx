import React from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import './bootstrap';
import '@programinglive/zettly-editor/styles';
import '../css/app.css';
import 'tldraw/tldraw.css';

import { ThemeProvider } from './Components/theme-provider';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((registration) => {
                console.debug('Service worker registered', registration.scope);
            })
            .catch((error) => {
                console.error('Service worker registration failed', error);
            });
    });
}

const pages = import.meta.glob('./Pages/**/*.jsx', { eager: false });

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
