import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const WORKSPACE_PAGES = [
    'resources/js/Pages/Dashboard.jsx',
    'resources/js/Pages/Priority/Index.jsx',
    'resources/js/Pages/Notes/Index.jsx',
    'resources/js/Pages/Reports/Index.jsx',
    'resources/js/Pages/Todos/Index.jsx',
];

test('canonical UI/UX engineering standard file exists and defines ZET-UI-001 and ZET-UI-002', () => {
    const standardPath = path.join(repoRoot, 'engineering/standards/ui-ux.yaml');
    assert.equal(fs.existsSync(standardPath), true, 'engineering/standards/ui-ux.yaml must exist');

    const content = fs.readFileSync(standardPath, 'utf8');
    assert.match(content, /id:\s*ZET-UI-001/);
    assert.match(content, /id:\s*ZET-UI-002/);
    assert.match(content, /text-lg font-semibold/);
    assert.match(content, /w-full px-4 sm:px-6 py-4/);
});

test('primary workspace pages follow Notion-style full-width fluid layout and uniform typography', () => {
    for (const relPath of WORKSPACE_PAGES) {
        const content = fs.readFileSync(path.join(repoRoot, relPath), 'utf8');

        assert.match(
            content,
            /w-full px-4 sm:px-6 py-4/,
            `${relPath} must use the canonical full-width fluid container (w-full px-4 sm:px-6 py-4)`,
        );

        assert.match(
            content,
            /<h1[^>]*text-lg font-semibold/,
            `${relPath} must use the uniform compact page heading (h1 with text-lg font-semibold)`,
        );

        assert.doesNotMatch(
            content,
            /\b(?:max-w-3xl|max-w-4xl|max-w-6xl)\b/,
            `${relPath} must not wrap workspace content in narrow max-w-3xl/4xl/6xl containers`,
        );

        assert.doesNotMatch(
            content,
            /\b(?:text-4xl|text-5xl|text-6xl)\b|rounded-\[2(?:\.5)?rem\]/,
            `${relPath} must not use oversized marketing-hero typography or rounded-[2rem]/[2.5rem] cards`,
        );
    }
});

test('vite config injects dynamic version + git commit and enables PWA autoUpdate', () => {
    const viteConfig = fs.readFileSync(path.join(repoRoot, 'vite.config.js'), 'utf8');
    assert.match(viteConfig, /__APP_VERSION__/);
    assert.match(viteConfig, /__APP_COMMIT__/);
    assert.match(viteConfig, /registerType:\s*'autoUpdate'/);
    assert.match(viteConfig, /skipWaiting:\s*true/);
    assert.match(viteConfig, /clientsClaim:\s*true/);
});

test('AppLayout and Login display dynamic application version and commit hash', () => {
    const appLayout = fs.readFileSync(path.join(repoRoot, 'resources/js/Layouts/AppLayout.jsx'), 'utf8');
    assert.match(appLayout, /data-testid="app-version-badge"/);
    assert.match(appLayout, /__APP_VERSION__/);
    assert.match(appLayout, /__APP_COMMIT__/);

    const loginPage = fs.readFileSync(path.join(repoRoot, 'resources/js/Pages/Auth/Login.jsx'), 'utf8');
    assert.match(loginPage, /data-testid="login-version-badge"/);
    assert.match(loginPage, /__APP_VERSION__/);
    assert.match(loginPage, /__APP_COMMIT__/);
});

test('AppLayout sidebar uses uniform text-sm typography, w-4 h-4 icons, and organized menu groups', () => {
    const appLayout = fs.readFileSync(path.join(repoRoot, 'resources/js/Layouts/AppLayout.jsx'), 'utf8');
    assert.match(appLayout, /Planning & Focus/);
    assert.match(appLayout, /Knowledge & Visual/);
    assert.match(appLayout, /AI & Automation/);
    assert.match(appLayout, /Admin & Ops/);
    assert.match(appLayout, /className=\{`flex items-center gap-2\.5 px-2\.5 py-1\.5 rounded-md text-sm font-medium/);
    assert.doesNotMatch(appLayout, /<Icon className=\{`w-5 h-5/);
});

test('ModeToggle uses compact borderless ghost h-7 w-7 button with w-4 h-4 icons', () => {
    const modeToggle = fs.readFileSync(path.join(repoRoot, 'resources/js/Components/mode-toggle.jsx'), 'utf8');
    assert.match(modeToggle, /variant="ghost"/);
    assert.match(modeToggle, /h-7 w-7/);
    assert.match(modeToggle, /h-4 w-4/);
    assert.doesNotMatch(modeToggle, /h-\[1\.2rem\]/);
});

test('Today page uses compactSummary focus greeting, clean activity formatting, quick-add todo, and mobile-only FAB', () => {
    const dashboard = fs.readFileSync(path.join(repoRoot, 'resources/js/Pages/Dashboard.jsx'), 'utf8');
    assert.match(dashboard, /<FocusGreeting[^>]*compactSummary/);
    assert.match(dashboard, /formatActivityExcerpt/);
    assert.match(dashboard, /Quick add a task/);
    assert.match(dashboard, /lg:hidden/);
    assert.match(dashboard, /min-w-0 space-y-3 xl:col-span-7/);
    assert.match(dashboard, /min-w-0 grid gap-3 sm:grid-cols-2/);

    const appLayout = fs.readFileSync(path.join(repoRoot, 'resources/js/Layouts/AppLayout.jsx'), 'utf8');
    assert.match(appLayout, /flex-1 min-w-0 flex flex-col overflow-hidden/);
    assert.match(appLayout, /overflow-y-auto overflow-x-hidden/);
});
