import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pwaPromptPath = join(__dirname, '..', 'Components', 'PwaInstallPrompt.jsx');
const pwaPromptSource = readFileSync(pwaPromptPath, 'utf8');

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
        pwaPromptSource.includes("window.localStorage.setItem(STORAGE_KEY, '1')"),
        'Expected dismissal to be persisted to localStorage.'
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
