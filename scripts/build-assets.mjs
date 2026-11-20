#!/usr/bin/env node
/**
 * Build frontend Vite assets into a staging directory (public/build.next),
 * validate manifest.json, and swap into public/build without leaving live
 * requests without a manifest during Vite compilation (Sentry TODOAPP-3Q).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEXT_REL = 'public/build.next';
const PREV_REL = 'public/build.prev';
const LIVE_REL = 'public/build';

function defaultRunViteBuild(outDir, appDir) {
    const viteBin = path.join(appDir, 'node_modules', 'vite', 'bin', 'vite.js');
    if (!fs.existsSync(viteBin)) {
        throw new Error(`Vite binary not found at ${viteBin}. Run npm ci first.`);
    }

    const result = spawnSync(process.execPath, [viteBin, 'build', '--outDir', outDir], {
        cwd: appDir,
        stdio: 'inherit',
        env: process.env,
    });

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`Vite build exited with code ${result.status}`);
    }
}

function validateManifest(manifestPath) {
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Refusing to swap: ${manifestPath} is missing.`);
    }

    const raw = fs.readFileSync(manifestPath, 'utf8').trim();
    if (!raw) {
        throw new Error(`Refusing to swap: ${manifestPath} is empty.`);
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Refusing to swap: ${manifestPath} is not valid JSON (${err.message}).`);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).length === 0) {
        throw new Error(`Refusing to swap: ${manifestPath} contains no manifest entries.`);
    }

    return Object.keys(parsed).length;
}

export function buildAssetsAtomically({
    appDir = DEFAULT_APP_DIR,
    runViteBuild = (outDir) => defaultRunViteBuild(outDir, appDir),
    renameSync = fs.renameSync,
    logger = console.log,
} = {}) {
    const nextDir = path.join(appDir, NEXT_REL);
    const prevDir = path.join(appDir, PREV_REL);
    const liveDir = path.join(appDir, LIVE_REL);

    fs.rmSync(nextDir, { recursive: true, force: true });
    fs.rmSync(prevDir, { recursive: true, force: true });

    logger(`[build-assets] building into ${NEXT_REL}`);
    let entryCount;
    try {
        runViteBuild(NEXT_REL);
        entryCount = validateManifest(path.join(nextDir, 'manifest.json'));
    } catch (err) {
        fs.rmSync(nextDir, { recursive: true, force: true });
        throw err;
    }

    logger(`[build-assets] swapping ${NEXT_REL} -> ${LIVE_REL}`);
    const hadLive = fs.existsSync(liveDir);
    if (hadLive) {
        renameSync(liveDir, prevDir);
    }

    try {
        renameSync(nextDir, liveDir);
    } catch (err) {
        if (hadLive && fs.existsSync(prevDir) && !fs.existsSync(liveDir)) {
            fs.renameSync(prevDir, liveDir);
        }
        fs.rmSync(nextDir, { recursive: true, force: true });
        throw err;
    }

    fs.rmSync(prevDir, { recursive: true, force: true });
    logger(`[build-assets] done: ${entryCount} manifest entries`);

    return { entryCount, liveDir };
}

const isDirectCli =
    process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectCli) {
    try {
        buildAssetsAtomically();
    } catch (err) {
        console.error(`[build-assets] ${err?.message || err}`);
        process.exit(1);
    }
}
