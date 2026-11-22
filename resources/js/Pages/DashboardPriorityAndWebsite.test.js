import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const dashboardSrc = fs.readFileSync(path.join(REPO_ROOT, 'resources', 'js', 'Pages', 'Dashboard.jsx'), 'utf8');
const homeSrc = fs.readFileSync(path.join(REPO_ROOT, 'resources', 'js', 'Pages', 'Home', 'Index.jsx'), 'utf8');

test('PR-01..PR-06 & UI-01..UI-07: Today Dashboard exposes Priority Queue, P0-P3 filter/sort, scoped counters, and Needs Next Action on empty focuses', () => {
    assert.match(dashboardSrc, /Priority Queue/);
    assert.match(dashboardSrc, /'ALL', 'P0', 'P1', 'P2', 'P3', 'UNPRIORITIZED'/);
    assert.match(dashboardSrc, /open today/);
    assert.match(dashboardSrc, /open overall/);
    assert.match(dashboardSrc, /active focuses/);
    assert.match(dashboardSrc, /Needs Next Action/);
    assert.match(dashboardSrc, /\/todos\/create\?focus_id=/);
    assert.match(dashboardSrc, /By Priority/);
    assert.match(dashboardSrc, /By Due Date/);
    assert.match(dashboardSrc, /Plan next task/);
});

test('HOME-01..HOME-06 & A11Y-01..A11Y-05: Zettly public website communicates product-first positioning with zero emoji gimmicks and valid CTAs', () => {
    assert.match(homeSrc, /Where Knowledge Becomes Action\./);
    assert.match(homeSrc, /Zettelkasten Knowledge \+ Priority-Driven Execution/);
    assert.match(homeSrc, /Connected Knowledge/);
    assert.match(homeSrc, /Intentional Prioritization/);
    assert.match(homeSrc, /Focused Execution/);
    assert.match(homeSrc, /Traceable Progress/);
    assert.match(homeSrc, /Visual Thinking/);
    assert.match(homeSrc, /Capture/);
    assert.match(homeSrc, /Connect/);
    assert.match(homeSrc, /Prioritize/);
    assert.match(homeSrc, /Execute/);
    assert.match(homeSrc, /Reflect/);
    assert.match(homeSrc, /href="\/dashboard"/);
    assert.match(homeSrc, /href="\/register"/);
    assert.match(homeSrc, /href="\/login"/);
    assert.match(homeSrc, /href="\/developer"/);
    assert.match(homeSrc, /href="\/docs"/);
    assert.match(homeSrc, /href="\/legal\/privacy"/);
    assert.match(homeSrc, /href="\/legal\/terms"/);
    assert.match(homeSrc, /tldraw/);

    // Verify decorative emoji gimmicks and generic framework slogans were removed
    assert.doesNotMatch(homeSrc, /Welcome to Zettly 🌊/);
    assert.doesNotMatch(homeSrc, /Finish Fast/);
    assert.doesNotMatch(homeSrc, /Look Good Doing It/);
    assert.doesNotMatch(homeSrc, /Built with React, Inertia\.js, and shadcn\/ui/);
    assert.doesNotMatch(homeSrc, /Proudly Powered By/);
});
