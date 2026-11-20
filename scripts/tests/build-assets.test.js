import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAssetsAtomically } from '../build-assets.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function makeTempApp() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'zettly-build-assets-'));
}

test('package.json build script uses atomic build-assets.mjs instead of raw in-place vite build', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));

    assert.equal(pkg.scripts.build, 'node scripts/build-assets.mjs');
    assert.equal(pkg.scripts['build:atomic'], 'node scripts/build-assets.mjs');
});

test('buildAssetsAtomically keeps live manifest intact during compile and swaps cleanly', () => {
    const appDir = makeTempApp();
    try {
        const liveDir = path.join(appDir, 'public', 'build');
        fs.mkdirSync(liveDir, { recursive: true });
        fs.writeFileSync(
            path.join(liveDir, 'manifest.json'),
            JSON.stringify({ 'resources/js/app.jsx': { file: 'assets/app-old.js' } }),
        );

        let observedLiveDuringBuild = null;
        let observedOutDir = null;

        const result = buildAssetsAtomically({
            appDir,
            runViteBuild: (outDir) => {
                observedOutDir = outDir;
                observedLiveDuringBuild = fs.readFileSync(path.join(liveDir, 'manifest.json'), 'utf8');
                const absOutDir = path.join(appDir, outDir);
                fs.mkdirSync(absOutDir, { recursive: true });
                fs.writeFileSync(
                    path.join(absOutDir, 'manifest.json'),
                    JSON.stringify({ 'resources/js/app.jsx': { file: 'assets/app-new.js' } }),
                );
            },
        });

        assert.equal(observedOutDir, 'public/build.next');
        assert.match(observedLiveDuringBuild, /app-old\.js/);
        assert.equal(result.entryCount, 1);
        assert.match(fs.readFileSync(path.join(liveDir, 'manifest.json'), 'utf8'), /app-new\.js/);
        assert.equal(fs.existsSync(path.join(appDir, 'public', 'build.next')), false);
        assert.equal(fs.existsSync(path.join(appDir, 'public', 'build.prev')), false);
    } finally {
        fs.rmSync(appDir, { recursive: true, force: true });
    }
});

test('buildAssetsAtomically works on a fresh checkout where public/build does not exist yet', () => {
    const appDir = makeTempApp();
    try {
        const result = buildAssetsAtomically({
            appDir,
            runViteBuild: (outDir) => {
                const absOutDir = path.join(appDir, outDir);
                fs.mkdirSync(absOutDir, { recursive: true });
                fs.writeFileSync(
                    path.join(absOutDir, 'manifest.json'),
                    JSON.stringify({
                        'resources/js/app.jsx': { file: 'assets/app-fresh.js' },
                        'resources/css/app.css': { file: 'assets/app-fresh.css' },
                    }),
                );
            },
        });

        assert.equal(result.entryCount, 2);
        assert.match(
            fs.readFileSync(path.join(appDir, 'public', 'build', 'manifest.json'), 'utf8'),
            /app-fresh\.js/,
        );
    } finally {
        fs.rmSync(appDir, { recursive: true, force: true });
    }
});

test('buildAssetsAtomically preserves live manifest and cleans staging when vite build fails', () => {
    const appDir = makeTempApp();
    try {
        const liveDir = path.join(appDir, 'public', 'build');
        fs.mkdirSync(liveDir, { recursive: true });
        fs.writeFileSync(
            path.join(liveDir, 'manifest.json'),
            JSON.stringify({ 'resources/js/app.jsx': { file: 'assets/app-live.js' } }),
        );

        assert.throws(
            () =>
                buildAssetsAtomically({
                    appDir,
                    runViteBuild: (outDir) => {
                        const absOutDir = path.join(appDir, outDir);
                        fs.mkdirSync(absOutDir, { recursive: true });
                        fs.writeFileSync(path.join(absOutDir, 'partial.tmp'), 'incomplete');
                        throw new Error('vite compile failed');
                    },
                }),
            /vite compile failed/,
        );

        assert.match(fs.readFileSync(path.join(liveDir, 'manifest.json'), 'utf8'), /app-live\.js/);
        assert.equal(fs.existsSync(path.join(appDir, 'public', 'build.next')), false);
        assert.equal(fs.existsSync(path.join(appDir, 'public', 'build.prev')), false);
    } finally {
        fs.rmSync(appDir, { recursive: true, force: true });
    }
});

test('buildAssetsAtomically refuses to swap when manifest.json is missing or invalid JSON', () => {
    const appDir = makeTempApp();
    try {
        const liveDir = path.join(appDir, 'public', 'build');
        fs.mkdirSync(liveDir, { recursive: true });
        fs.writeFileSync(
            path.join(liveDir, 'manifest.json'),
            JSON.stringify({ 'resources/js/app.jsx': { file: 'assets/app-safe.js' } }),
        );

        assert.throws(
            () =>
                buildAssetsAtomically({
                    appDir,
                    runViteBuild: (outDir) => {
                        const absOutDir = path.join(appDir, outDir);
                        fs.mkdirSync(absOutDir, { recursive: true });
                        fs.writeFileSync(path.join(absOutDir, 'manifest.json'), '{not-valid-json');
                    },
                }),
            /manifest\.json/,
        );

        assert.match(fs.readFileSync(path.join(liveDir, 'manifest.json'), 'utf8'), /app-safe\.js/);
        assert.equal(fs.existsSync(path.join(appDir, 'public', 'build.next')), false);
    } finally {
        fs.rmSync(appDir, { recursive: true, force: true });
    }
});

test('buildAssetsAtomically restores previous build if promoting build.next fails', () => {
    const appDir = makeTempApp();
    try {
        const liveDir = path.join(appDir, 'public', 'build');
        fs.mkdirSync(liveDir, { recursive: true });
        fs.writeFileSync(
            path.join(liveDir, 'manifest.json'),
            JSON.stringify({ 'resources/js/app.jsx': { file: 'assets/app-rollback.js' } }),
        );

        let renameCalls = 0;
        const failingRename = (src, dest) => {
            renameCalls += 1;
            if (renameCalls === 2) {
                throw new Error('simulated promote rename failure');
            }
            fs.renameSync(src, dest);
        };

        assert.throws(
            () =>
                buildAssetsAtomically({
                    appDir,
                    renameSync: failingRename,
                    runViteBuild: (outDir) => {
                        const absOutDir = path.join(appDir, outDir);
                        fs.mkdirSync(absOutDir, { recursive: true });
                        fs.writeFileSync(
                            path.join(absOutDir, 'manifest.json'),
                            JSON.stringify({ 'resources/js/app.jsx': { file: 'assets/app-next.js' } }),
                        );
                    },
                }),
            /simulated promote rename failure/,
        );

        assert.match(fs.readFileSync(path.join(liveDir, 'manifest.json'), 'utf8'), /app-rollback\.js/);
        assert.equal(fs.existsSync(path.join(appDir, 'public', 'build.prev')), false);
    } finally {
        fs.rmSync(appDir, { recursive: true, force: true });
    }
});
