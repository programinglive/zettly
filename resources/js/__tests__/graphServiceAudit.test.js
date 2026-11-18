import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function parseSemver(version) {
    const match = String(version || '').match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return [0, 0, 0];
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isAtLeast(actual, minimum) {
    const a = parseSemver(actual);
    const b = parseSemver(minimum);
    for (let i = 0; i < 3; i += 1) {
        if (a[i] > b[i]) return true;
        if (a[i] < b[i]) return false;
    }
    return true;
}

test('graph-service package-lock.json resolves patched versions for all audited packages', () => {
    const lockPath = path.resolve('graph-service/package-lock.json');
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const packages = lock.packages || {};

    const minVersions = {
        'node_modules/proxy-addr': '2.0.8',
        'node_modules/ws': '8.20.2',
        'node_modules/vite': '7.3.7',
        'node_modules/vitest': '4.1.11',
        'node_modules/@vitest/mocker': '4.1.12',
        'node_modules/express': '4.22.3',
        'node_modules/qs': '6.16.1',
        'node_modules/rollup': '4.58.1',
        'node_modules/postcss': '8.5.23',
        'node_modules/picomatch': '4.0.4',
        'node_modules/nanoid': '3.3.18',
        'node_modules/path-to-regexp': '0.1.13',
    };

    const requiredPresent = [
        'node_modules/proxy-addr',
        'node_modules/ws',
        'node_modules/vite',
        'node_modules/vitest',
        'node_modules/@vitest/mocker',
        'node_modules/express',
        'node_modules/qs',
        'node_modules/picomatch',
        'node_modules/path-to-regexp',
    ];

    for (const pkgKey of requiredPresent) {
        assert.ok(packages[pkgKey]?.version, `Expected ${pkgKey} to exist in graph-service/package-lock.json`);
    }

    for (const [pkgKey, minVer] of Object.entries(minVersions)) {
        const entry = packages[pkgKey];
        if (!entry) continue;
        assert.ok(
            isAtLeast(entry.version, minVer),
            `Expected ${pkgKey} version ${entry.version} to be >= ${minVer}`
        );
    }
});
