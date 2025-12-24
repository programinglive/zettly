import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin to exclude test files from build
const excludeTests = () => ({
    name: 'exclude-tests',
    resolveId(id) {
        if (id.includes('.test.') || id.includes('__tests__')) {
            return false;
        }
    }
});

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
        excludeTests(),
        VitePWA({
            registerType: 'prompt',
            strategies: 'generateSW',
            manifest: {
                name: 'Zettly',
                short_name: 'Zettly',
                description: 'A modern todo and note-taking application',
                theme_color: '#6366f1',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: '/android-chrome-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/android-chrome-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            devOptions: {
                enabled: true,
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/api\.algolia\.net\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'algolia-api-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 // 24 hours
                            }
                        }
                    }
                ]
            }
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
