import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.jsx',
            ],
            refresh: true,
        }),
        react(),
        VitePWA({
            registerType: 'prompt',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png'],
            manifest: {
                name: 'Zettly',
                short_name: 'Zettly',
                description: 'Manage todos and notes in one unified workspace.',
                theme_color: '#111827',
                background_color: '#111827',
                start_url: '/dashboard',
                display: 'standalone',
                orientation: 'portrait-primary',
                icons: [
                    {
                        src: '/android-chrome-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/android-chrome-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: '/apple-touch-icon.png',
                        sizes: '180x180',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/(?:[a-z0-9-]+\.)*zettly\.app\//,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'zettly-api-cache',
                            networkTimeoutSeconds: 10,
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'zettly-static-resources',
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: [
            {
                find: '@programinglive/zettly-editor/styles',
                replacement: path.resolve(__dirname, 'node_modules/@programinglive/zettly-editor/dist/index.css'),
            },
            {
                find: '@programinglive/zettly-editor',
                replacement: path.resolve(__dirname, 'node_modules/@programinglive/zettly-editor/dist/index.js'),
            },
        ],
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    inertia: ['@inertiajs/react'],
                    ui: ['lucide-react'],
                }
            }
        }
    }
});
