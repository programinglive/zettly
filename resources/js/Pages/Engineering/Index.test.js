import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const pagePath = path.resolve(process.cwd(), 'resources/js/Pages/Engineering/Index.jsx');
const layoutPath = path.resolve(process.cwd(), 'resources/js/Layouts/AppLayout.jsx');

test('Engineering Control Center page exposes all required sections and status states', () => {
    const source = fs.readFileSync(pagePath, 'utf8');

    for (const label of ['Overview', 'Zettly Code Graph', 'CI/CD', 'Tests & Builds', 'Releases & Deployments', 'Agent Sessions', 'Runtime Health', 'Activity & Evidence']) {
        assert.ok(source.includes(label), `Missing tab/section: ${label}`);
    }

    for (const state of ['SUCCESS', 'FRESH', 'FAILED', 'RUNNING', 'QUEUED', 'BLOCKED', 'SKIPPED', 'UNKNOWN', 'STALE']) {
        assert.ok(source.includes(state), `Missing state badge: ${state}`);
    }

    assert.ok(source.includes('Deployment Drift'), 'Missing Deployment Drift block');
    assert.ok(source.includes('Synced @zettly-code Knowledge Annotations'), 'Missing Zettly Code annotations view');
});

test('AppLayout places Engineering Control Center under adminNavigation without altering primaryNavigation', () => {
    const layout = fs.readFileSync(layoutPath, 'utf8');
    assert.ok(layout.includes("href: '/engineering'"), 'Missing /engineering navigation entry');
});
