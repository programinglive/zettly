import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..', '..');

const PERMITTED_TIPTAP_PEERS = new Map([
    ['@tiptap/extension-code-block', '3.34.0'],
    ['@tiptap/extensions', '3.34.0'],
]);

test('package.json uses zettly-editor 1.0.0 with only the narrow required Tiptap peer exceptions', () => {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    assert.match(allDeps['@programinglive/zettly-editor'] ?? '', /\^?1\.0\.0/);
    for (const [dep, version] of Object.entries(allDeps)) {
        if (!dep.startsWith('@tiptap/')) continue;

        assert.equal(
            PERMITTED_TIPTAP_PEERS.has(dep),
            true,
            `Unexpected direct TipTap dependency: ${dep}`
        );
        assert.equal(
            version,
            PERMITTED_TIPTAP_PEERS.get(dep),
            `Permitted TipTap peer ${dep} must stay pinned to ${PERMITTED_TIPTAP_PEERS.get(dep)}`
        );
    }
});

test('Todo Create and Edit pages use canonical ZettlyEditor v1.0.0 props', () => {
    for (const relPath of ['resources/js/Pages/Todos/Create.jsx', 'resources/js/Pages/Todos/Edit.jsx']) {
        const source = readFileSync(join(rootDir, relPath), 'utf8');
        assert.ok(source.includes('<ZettlyEditor'), `Expected <ZettlyEditor in ${relPath}`);
        assert.equal(/onDebugToggle|onDebugEvent|debug=\{/.test(source), false, `Deprecated debug props found in ${relPath}`);
        assert.equal(/preset=|ClassicToolbar|ZettlyEditorClassic/.test(source), false, `Deprecated Classic API found in ${relPath}`);
    }
});
