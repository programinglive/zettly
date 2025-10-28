import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

const createPath = '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Pages/Todos/Create.jsx';
const editPath = '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Pages/Todos/Edit.jsx';
const prioritySelectorPath = '/Users/mahardhika/code/project/mine/web/zettly/resources/js/Components/PrioritySelector.jsx';

const read = (path) => fs.readFileSync(path, 'utf8');

test('Todo create form lists due date before priority', () => {
    const content = read(createPath);

    const dueLabelIndex = content.indexOf('label htmlFor="due_date"');
    const priorityLabelIndex = content.indexOf('Priority');

    assert.ok(dueLabelIndex !== -1, 'Due date label should exist in create form');
    assert.ok(priorityLabelIndex !== -1, 'Priority label should exist in create form');
    assert.ok(
        dueLabelIndex < priorityLabelIndex,
        'Due date input should appear before priority selector in create form markup'
    );
});

test('Todo edit form lists due date before priority', () => {
    const content = read(editPath);

    const dueLabelIndex = content.indexOf('label htmlFor="due_date"');
    const priorityLabelIndex = content.indexOf('Priority');

    assert.ok(dueLabelIndex !== -1, 'Due date label should exist in edit form');
    assert.ok(priorityLabelIndex !== -1, 'Priority label should exist in edit form');
    assert.ok(
        dueLabelIndex < priorityLabelIndex,
        'Due date input should appear before priority selector in edit form markup'
    );
});

test('Priority selector uses single-column stacked layout classes', () => {
    const content = read(prioritySelectorPath);

    assert.ok(
        content.includes('flex flex-col gap-2.5'),
        'Priority selector should render options in a single-column flex stack'
    );
    assert.ok(
        content.includes('w-full flex-col') || content.includes('w-full flex-col justify-between'),
        'Priority selector buttons should take full width for stacked layout'
    );
    assert.ok(
        content.includes('space-y-1.5 rounded-lg') || content.includes('space-y-1.5 rounded'),
        'Priority selector detail block should use compact vertical spacing'
    );
});
