/**
 * Unit regression tests for PWA install prompt dismissal persistence,
 * appinstalled lifecycle event handling, standalone display-mode detection,
 * manifest completeness, and service worker caching strategy.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pwaPromptPath = join(__dirname, '..', 'Components', 'PwaInstallPrompt.jsx');
const pwaPromptSource = readFileSync(pwaPromptPath, 'utf8');

const publicDir = join(__dirname, '..', '..', '..', 'public');
const manifestPath = join(publicDir, 'site.webmanifest');
const swSourcePath = join(__dirname, '..', 'sw.js');
const swPublicPath = join(publicDir, 'sw.js');

test('PwaInstallPrompt listens for appinstalled event and marks prompt as dismissed', () => {
    assert.ok(
        pwaPromptSource.includes("'appinstalled'"),
        'Expected PwaInstallPrompt to register listener for appinstalled event.'
    );

    assert.ok(
        /window\.addEventListener\(['"]appinstalled['"],/.test(pwaPromptSource),
        'Expected addEventListener for appinstalled.'
    );

    assert.ok(
        /window\.removeEventListener\(['"]appinstalled['"],/.test(pwaPromptSource),
        'Expected cleanup removeEventListener for appinstalled.'
    );
});

test('PwaInstallPrompt records dismissal in localStorage on user install or dismiss', () => {
    assert.ok(
        pwaPromptSource.includes("const STORAGE_KEY = 'zettly-pwa-install-dismissed';"),
        'Expected standard STORAGE_KEY for PWA install dismissal.'
    );

    assert.ok(
        pwaPromptSource.includes("STORAGE_KEY") && pwaPromptSource.includes("'1'"),
        'Expected dismissal value 1 to be persisted.'
    );
});

test('PwaInstallPrompt checks if app is already installed or standalone', () => {
    assert.ok(
        pwaPromptSource.includes('(display-mode: standalone)'),
        'Expected standalone display mode check in shouldSkipPrompt.'
    );

    assert.ok(
        pwaPromptSource.includes('shouldSkipPrompt'),
        'Expected shouldSkipPrompt helper to guard prompt display.'
    );
});

test('PwaInstallPrompt checks shouldSkipPrompt before showing on beforeinstallprompt', () => {
    assert.ok(
        pwaPromptSource.includes('shouldSkipPrompt()'),
        'Expected shouldSkipPrompt check inside event handler.'
    );
});

test('site.webmanifest has complete PWA fields', () => {
    assert.ok(existsSync(manifestPath), 'Expected site.webmanifest to exist in public directory.');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    assert.equal(manifest.display, 'standalone', 'PWA display mode must be standalone');
    assert.equal(manifest.start_url, '/', 'PWA start_url must be /');
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'PWA must declare multiple icons');
    assert.ok(manifest.theme_color, 'PWA must declare theme_color');
});

test('Service worker handles push notifications and lifecycle caching', () => {
    assert.ok(existsSync(swSourcePath), 'Expected resources/js/sw.js to exist.');
    assert.ok(existsSync(swPublicPath), 'Expected public/sw.js to exist.');

    const swSource = readFileSync(swSourcePath, 'utf8');
    assert.ok(swSource.includes("'push'") || swSource.includes('"push"'), 'SW must handle push events.');
    assert.ok(swSource.includes("'notificationclick'") || swSource.includes('"notificationclick"'), 'SW must handle notificationclick.');
    assert.ok(swSource.includes("'install'"), 'SW must handle install.');
    assert.ok(swSource.includes("'activate'"), 'SW must handle activate.');
});
