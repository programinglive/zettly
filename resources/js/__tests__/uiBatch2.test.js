import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PAGES = [
    ['Agent Index', 'resources/js/Pages/Agent/Index.jsx'],
    ['Agent Show', 'resources/js/Pages/Agent/Show.jsx'],
    ['Agent Monitor', 'resources/js/Pages/Agent/Monitor.jsx'],
    ['Agent Intelligence', 'resources/js/Pages/Agent/Intelligence.jsx'],
    ['Agent Setup', 'resources/js/Pages/Agent/Setup.jsx'],
    ['Developer Portal', 'resources/js/Pages/Developer.jsx'],
    ['Documentation', 'resources/js/Pages/Docs.jsx'],
    ['Engineering Control Center', 'resources/js/Pages/Engineering/Index.jsx'],
    ['System Monitor', 'resources/js/Pages/Admin/SystemMonitor.jsx'],
];

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8');

test('ZET-UI-003: batch 2 pages do not add a narrow max-width container', () => {
    for (const [name, relativePath] of PAGES) {
        assert.doesNotMatch(
            read(relativePath),
            /\bmax-w-(?:3xl|4xl|5xl|6xl|7xl)\b/,
            `${name} must let AppLayout provide the full-width container`
        );
    }
});

test('ZET-UI-003: batch 2 pages keep headings compact', () => {
    for (const [name, relativePath] of PAGES) {
        assert.doesNotMatch(read(relativePath), /text-(?:3xl|4xl|5xl)\b/, `${name} must not use oversized headings`);
    }
});

test('ZET-UI-003: batch 2 pages keep restrained radii', () => {
    for (const [name, relativePath] of PAGES) {
        const source = read(relativePath);
        assert.doesNotMatch(source, /rounded-3xl/, `${name} must not use rounded-3xl`);
        assert.doesNotMatch(source, /rounded-\[2\.5rem\]/, `${name} must not use a 2.5rem radius`);
    }
});

test('ZET-UI-003: batch 2 pages use Lucide icons instead of emoji UI', () => {
    for (const [name, relativePath] of PAGES) {
        assert.doesNotMatch(read(relativePath), /\p{Extended_Pictographic}/u, `${name} must not render emoji UI`);
    }
});

test('ZET-UI-003: batch 2 pages keep a fluid content wrapper', () => {
    for (const [name, relativePath] of PAGES) {
        const source = read(relativePath);
        assert.match(source, /className="[^"]*\bw-full\b[^"]*"/, `${name} must keep a full-width content wrapper`);
    }
});

test('mobile-first: batch 2 pages enforce a 44px minimum touch target', () => {
    for (const [name, relativePath] of PAGES) {
        const source = read(relativePath);
        assert.match(source, /\[&_button\]:min-h-\[44px\]/, `${name} must enforce 44px buttons`);
        assert.match(source, /\[&_a\]:min-h-\[44px\]/, `${name} must enforce 44px links`);
    }
});
