import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
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
