import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cssPath = join(__dirname, '..', '..', 'css', 'app.css');
const cssContent = readFileSync(cssPath, 'utf8');

test('light theme keeps editor toolbar active state styled', () => {
    const snippetPattern = /:root:not\(\.dark\)\s*\[data-zettly-editor-toolbar\]\s*button\[data-state=on\],\s*\.light\s*\[data-zettly-editor-toolbar\]\s*button\[data-state=on\]\s*\{\s*background:\s*var\(--zettly-editor-menu-selected\);\s*color:\s*var\(--zettly-editor-menu-accent\);\s*\}/;

    assert.ok(
        snippetPattern.test(cssContent),
        'Expected light-mode active toolbar rule to match the bundled CSS overrides.'
    );
});
