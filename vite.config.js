import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')
);
const appVersion = packageJson.version || '0.0.0';

let appCommit = process.env.VITE_APP_COMMIT || '';
if (!appCommit) {
    try {
        appCommit = execSync('git rev-parse --short HEAD', { cwd: __dirname })
            .toString()
            .trim();
    } catch {
        appCommit = 'unknown';
    }
}

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
    define: {
        __APP_VERSION__: JSON.stringify(appVersion),
        __APP_COMMIT__: JSON.stringify(appCommit),
    },
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
        excludeTests(),
        VitePWA({
            registerType: 'autoUpdate',
            strategies: 'generateSW',
            manifest: {
                name: 'Zettly',
                short_name: 'Zettly',
                description: 'A modern todo and note-taking application',
                theme_color: '#3b82f6',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'any',
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
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true,
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            }
        }),
    ],
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
