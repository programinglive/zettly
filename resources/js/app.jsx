import React from 'react';
import { createInertiaApp, router } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import './bootstrap';
import '@programinglive/zettly-editor/styles';
import '../css/app.css';
import 'tldraw/tldraw.css';

import { ThemeProvider } from './Components/theme-provider';

// Debug mode helper function
const isDebugMode = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('zettly-debug-mode') === 'true';
    }
    return false;
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((registration) => {
                if (isDebugMode()) {
                    console.debug('Service worker registered', registration.scope);
                }
            })
            .catch((error) => {
                if (isDebugMode()) {
                    console.error('Service worker registration failed', error);
                }
            });
    });
}

const getMetaCsrfToken = () => {
    if (typeof document === 'undefined') {
        return null;
    }

    const tokenMeta = document.querySelector('meta[name="csrf-token"]');

    return tokenMeta?.content ?? null;
};

const getCookieCsrfToken = () => {
    if (typeof document === 'undefined') {
        return null;
    }

    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    if (!match) {
        return null;
    }

    try {
        return decodeURIComponent(match[1]);
    } catch (error) {
        return null;
    }
};

const pages = import.meta.glob('./Pages/**/*.jsx', { eager: false });

let csrfListenerRegistered = false;

const resolveCsrfToken = () => {
    const cookieToken = getCookieCsrfToken();

    if (cookieToken) {
        return cookieToken;
    }

    const inertiaToken = router?.page?.props?.csrf_token;

    return inertiaToken ?? getMetaCsrfToken();
};

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
        if (!csrfListenerRegistered) {
            router.on('before', (event) => {
                const token = resolveCsrfToken();

                if (!token) {
                    return;
                }

                event.detail.visit.headers = {
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(event.detail.visit.headers ?? {}),
                };

                const method = (event.detail.visit.method ?? 'get').toLowerCase();

                if (method === 'get') {
                    return;
                }

                const payload = event.detail.visit.data;

                if (payload instanceof FormData) {
                    if (!payload.has('_token')) {
                        payload.set('_token', token);
                    }

                    return;
                }

                event.detail.visit.data = {
                    ...(payload ?? {}),
                    _token: payload?._token ?? token,
                };
            });

            csrfListenerRegistered = true;
        }

        createRoot(el).render(
            <ThemeProvider defaultTheme="system" storageKey="todo-theme">
                <App {...props} />
            </ThemeProvider>
        );
    },
});
