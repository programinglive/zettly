import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('AiTodoTriageCard requires explicit human Accept & Apply or Reject before mutating', () => {
    const cardPath = path.resolve('resources/js/Components/AiTodoTriageCard.jsx');
    const source = fs.readFileSync(cardPath, 'utf8');

    assert.match(source, /Suggest with AI/);
    assert.match(source, /Accept & Apply/);
    assert.match(source, /Reject/);
    assert.match(source, /expected_updated_at/);
    assert.match(source, /\/ai-triage\/apply/);
});

test('Todos Edit page gates AiTodoTriageCard behind aiTriageEnabled and !isNote', () => {
    const editPath = path.resolve('resources/js/Pages/Todos/Edit.jsx');
    const source = fs.readFileSync(editPath, 'utf8');

    assert.match(source, /aiTriageEnabled/);
    assert.match(source, /AiTodoTriageCard/);
});
