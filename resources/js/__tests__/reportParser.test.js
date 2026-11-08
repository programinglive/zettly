import test from 'node:test';
import assert from 'node:assert/strict';
import { inlineSegments, parseReport } from '../lib/reportParser.js';

const REAL_REPORT = [
    '# Daily Activity Summary: 2026-11-08 - 2026-11-08',
    '',
    '- Machines: MMCH',
    '- Projects: 1',
    '- Tasks completed: 2',
    '',
    '## Work by project',
    '',
    '### zettly',
    '',
    '- **Add a Reports workspace** — completed (Development)',
    '  - Modified files: app/Http/Controllers/ReportsController.php, routes/web.php',
    '  - Observed issues: Vite manifest missing in tests',
    '  - Outcome: **feature merged** and verified',
    '',
    '## Outstanding work',
    '',
    '- None recorded.',
].join('\n');

test('parses headings into standalone blocks', () => {
    const blocks = parseReport(REAL_REPORT);
    const headings = blocks.filter((b) => b.type.startsWith('h'));

    assert.equal(headings.length, 4);
    assert.deepEqual(
        headings.map((h) => [h.type, h.text]),
        [
            ['h1', 'Daily Activity Summary: 2026-11-08 - 2026-11-08'],
            ['h2', 'Work by project'],
            ['h3', 'zettly'],
            ['h2', 'Outstanding work'],
        ],
    );
});

test('groups consecutive bullets into one list with nested children', () => {
    const blocks = parseReport(REAL_REPORT);
    const workList = blocks.find((b) => b.type === 'list' && b.items.some((i) => i.text.startsWith('**Add a Reports workspace**')));

    assert.ok(workList, 'expected the project work list to be one list block');
    assert.equal(workList.items.length, 1, 'a session bullet with sub-bullets is one top-level item');

    const session = workList.items[0];
    assert.equal(session.children.length, 3, 'modified files, observed issues and outcome nest under the session');
    assert.ok(session.children[0].includes('ReportsController'), 'nested files line kept its text');
});

test('splits the report into separate lists at blank lines', () => {
    const blocks = parseReport(REAL_REPORT);
    const lists = blocks.filter((b) => b.type === 'list');

    assert.equal(lists.length, 3, 'headline bullets, work bullets and outstanding bullets are three lists');
    assert.deepEqual(lists.map((l) => l.items.length), [3, 1, 1]);
});

test('parses CRLF content from Windows-hosted hooks', () => {
    const blocks = parseReport(REAL_REPORT.replace(/\n/g, '\r\n'));

    assert.deepEqual(
        blocks.filter((b) => b.type.startsWith('h')).map((h) => h.text),
        ['Daily Activity Summary: 2026-11-08 - 2026-11-08', 'Work by project', 'zettly', 'Outstanding work'],
    );
});

test('promotes an orphan nested bullet to top level instead of losing it', () => {
    const blocks = parseReport('  - orphan nested line');
    const list = blocks.find((b) => b.type === 'list');

    assert.ok(list, 'orphan nested line should still become a list item');
    assert.deepEqual(list.items, [{ text: 'orphan nested line', children: [] }]);
});

test('treats unknown lines as plain paragraphs', () => {
    const blocks = parseReport('plain text line');

    assert.deepEqual(blocks, [{ key: 'p-0', type: 'p', text: 'plain text line' }]);
});

test('returns no blocks for empty content', () => {
    assert.deepEqual(parseReport(''), []);
    assert.deepEqual(parseReport(null), []);
    assert.deepEqual(parseReport(undefined), []);
});

test('splits bold segments for the renderer without touching React', () => {
    const segments = inlineSegments('**bold** plain **tail**');

    assert.deepEqual(segments, [
        { text: 'bold', bold: true },
        { text: ' plain ', bold: false },
        { text: 'tail', bold: true },
    ]);
});

test('leaves text without bold markers as a single plain segment', () => {
    assert.deepEqual(inlineSegments('no markers'), [{ text: 'no markers', bold: false }]);
});
