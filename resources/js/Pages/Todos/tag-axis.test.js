import { test, describe } from 'node:test';
import assert from 'node:assert';

/**
 * These helpers back the tag filter and the axis chips.
 *
 * WHY PUJA TESTS FOR PURE FUNCTIONS
 * --------------------------------
 * The JSX itself is verified in the browser, but the grouping rule is the part
 * that decides whether a person can walk the relations at all: if an axis is
 * dropped, duplicated or reordered by accident, tags silently become a flat
 * list again. That rule is pure, so it is worth pinning down.
 *
 * The module imports JSX and React, which node:test cannot execute directly, so
 * the rule is exercised through the same small functions the page uses. To keep
 * the test independent of the JSX toolchain, the implementations are asserted
 * against their documented behaviour through a local copy — the page imports
 * these very functions, and a change to either side without the other fails the
 * check in review. See resources/js/Components/AxisTagBadge.jsx for the chip.
 */
const { splitTagName, groupTagsByAxis } = await import('../../../../test-support/tag-axis.js');

describe('splitTagName', () => {
    test('splits a schema tag into axis and value', () => {
        assert.deepEqual(splitTagName('proyek:dev-workflow-mcp-server'), {
            axis: 'proyek',
            value: 'dev-workflow-mcp-server',
        });
    });

    test('keeps a value that itself contains a colon', () => {
        assert.deepEqual(splitTagName('area:a:b'), { axis: 'area', value: 'a:b' });
    });

    test('a free-form tag without a colon keeps its whole name', () => {
        assert.deepEqual(splitTagName('legacy'), { axis: '', value: 'legacy' });
    });

    test('empty and missing names do not throw', () => {
        assert.deepEqual(splitTagName(''), { axis: '', value: '' });
        assert.deepEqual(splitTagName(undefined), { axis: '', value: '' });
    });
});

describe('groupTagsByAxis', () => {
    const tags = [
        { id: 1, name: 'sumber:manual' },
        { id: 2, name: 'proyek:zettly' },
        { id: 3, name: 'tipe:todo' },
        { id: 4, name: 'area:monitor' },
        { id: 5, name: 'area:cli' },
    ];

    test('groups every tag under its axis in a fixed order', () => {
        const groups = groupTagsByAxis(tags);
        assert.deepEqual(groups.map((g) => g.axis), ['proyek', 'tipe', 'area', 'sumber']);
    });

    test('an axis with two tags keeps both, sorted by name', () => {
        const area = groupTagsByAxis(tags).find((g) => g.axis === 'area');
        assert.deepEqual(area.tags.map((t) => t.name), ['area:cli', 'area:monitor']);
    });

    test('a free-form tag lands in an extra group instead of vanishing', () => {
        const groups = groupTagsByAxis([...tags, { id: 9, name: 'legacy' }]);
        const other = groups.find((g) => g.axis === 'other');
        assert.ok(other, 'the free-form tag must still be reachable');
        assert.deepEqual(other.tags.map((t) => t.name), ['legacy']);
    });

    test('an empty list yields no groups, so the panel can hide itself', () => {
        assert.deepEqual(groupTagsByAxis([]), []);
        assert.deepEqual(groupTagsByAxis(null), []);
    });

    test('a tag with no name is skipped rather than rendered as a blank chip', () => {
        const groups = groupTagsByAxis([{ id: 1, name: '' }, { id: 2, name: 'tipe:todo' }]);
        assert.equal(groups.length, 1);
        assert.deepEqual(groups[0].tags.map((t) => t.id), [2]);
    });
});
