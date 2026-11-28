import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PAGES = [
    ['Journal', 'resources/js/Pages/Journal/Index.jsx'],
    ['Calendar', 'resources/js/Pages/Calendar/Index.jsx'],
    ['Focus Board', 'resources/js/Pages/Focus/Board.jsx'],
    ['Todo Board', 'resources/js/Pages/Todos/Board.jsx'],
    ['Report Detail', 'resources/js/Pages/Reports/Show.jsx'],
];

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8');

test('ZET-UI-003: batch 1 pages do not add a narrow max-width container', () => {
    for (const [name, relativePath] of PAGES) {
        const source = read(relativePath);
        assert.doesNotMatch(
            source,
            /\bmax-w-(?:3xl|5xl|6xl|7xl)\b/,
            `${name} must let DashboardLayout/AppLayout provide the full-width container`
        );
    }
});

test('ZET-UI-003: batch 1 pages keep headings compact', () => {
    for (const [name, relativePath] of PAGES) {
        const source = read(relativePath);
        assert.doesNotMatch(
            source,
            /text-(?:3xl|4xl|5xl)\b/,
            `${name} must not use oversized headings`
        );
    }
});

test('ZET-UI-003: Calendar and Focus Board do not strike through titles', () => {
    for (const relativePath of [
        'resources/js/Pages/Calendar/Index.jsx',
        'resources/js/Pages/Focus/Board.jsx',
    ]) {
        const source = read(relativePath);
        assert.doesNotMatch(source, /line-through/, `${relativePath} must not render titles with strikethrough`);
    }
});

test('ZET-UI-003: batch 1 pages keep a fluid content wrapper', () => {
    for (const [name, relativePath] of PAGES) {
        const source = read(relativePath);
        assert.match(source, /className="[^"]*\bw-full\b[^"]*"/, `${name} must keep a full-width content wrapper`);
    }
});

test('mobile-first: phone controls have a 44px minimum touch target', () => {
    const controls = [
        ['Journal filters', 'resources/js/Pages/Journal/Index.jsx'],
        ['Calendar controls', 'resources/js/Pages/Calendar/Index.jsx'],
        ['AppLayout menu button', 'resources/js/Layouts/AppLayout.jsx'],
        ['Theme toggle', 'resources/js/Components/mode-toggle.jsx'],
        ['PWA install prompt', 'resources/js/Components/PwaInstallPrompt.jsx'],
    ];
    for (const [name, relativePath] of controls) {
        assert.match(read(relativePath), /min-h-\[44px\]/, `${name} must expose a 44px minimum touch target`);
    }
});
