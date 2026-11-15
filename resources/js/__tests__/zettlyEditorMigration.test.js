import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..', '..');

test('package.json uses zettly-editor 1.0.0 without direct tiptap dependencies', () => {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    assert.match(allDeps['@programinglive/zettly-editor'] ?? '', /\^?1\.0\.0/);
    for (const dep of Object.keys(allDeps)) {
        assert.equal(
            dep.startsWith('@tiptap/'),
            false,
            `Unexpected direct TipTap dependency: ${dep}`
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
