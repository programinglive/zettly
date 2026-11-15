import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cssPath = join(__dirname, '..', '..', 'css', 'app.css');
const cssContent = readFileSync(cssPath, 'utf8');

test('modern editor root styles are present without obsolete classic toolbar selectors', () => {
    assert.ok(
        /\[data-zettly-editor-root\]\s*\{/.test(cssContent),
        'Expected [data-zettly-editor-root] styling rules in app.css.'
    );
    assert.ok(
        /\[data-zettly-editor-root\]:focus-within\s*\{/.test(cssContent),
        'Expected [data-zettly-editor-root]:focus-within styling rules in app.css.'
    );
    assert.equal(
        /\[data-zettly-editor-toolbar\]/.test(cssContent),
        false,
        'Expected obsolete [data-zettly-editor-toolbar] rules to be removed from app.css.'
    );
});
