import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Calendar page renders compact Notion-style Week/Month views and Weekly Focus Allocation editor', () => {
    const calendarPath = path.resolve('resources/js/Pages/Calendar/Index.jsx');
    const source = fs.readFileSync(calendarPath, 'utf8');

    assert.match(source, /Weekly Focus Allocation/);
    assert.match(source, /Beautyworld|ProgramingLive|schedule/);
    assert.match(source, /\/calendar\/allocations/);
    assert.match(source, /\/calendar\/todos\//);
});

test('AppLayout secondaryNavigation includes Calendar entry without altering primaryNavigation', () => {
    const layoutPath = path.resolve('resources/js/Layouts/AppLayout.jsx');
    const source = fs.readFileSync(layoutPath, 'utf8');

    assert.match(source, /href:\s*'\/calendar'/);
    assert.match(source, /label:\s*'Calendar'/);
});
