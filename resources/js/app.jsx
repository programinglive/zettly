import React from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import './bootstrap';
import '../css/app.css';

import { ThemeProvider } from './Components/theme-provider';

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
        const page = pages[`./Pages/${name}.jsx`];
        
        // Debug logging for production issues
        console.log('Resolving page:', name);
        console.log('Available pages:', Object.keys(pages));
        
        if (!page) {
            console.error('Page not found:', name);
            // Create a fallback error page
            return {
                default: () => React.createElement('div', {}, `Page not found: ${name}`)
            };
        }
        
        if (!page.default) {
            console.error('Page missing default export:', name, 'Page object:', page);
            // Create a fallback error page
            return {
                default: () => React.createElement('div', {}, `Page missing default export: ${name}`)
            };
        }
        
        return page;
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <ThemeProvider defaultTheme="system" storageKey="todo-theme">
                <App {...props} />
            </ThemeProvider>
        );
    },
});
