import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const showPath = join(__dirname, '..', 'Pages', 'Agent', 'Show.jsx');
const showSource = readFileSync(showPath, 'utf8');

test('coding agent show page uses SanitizedHtml for rich markdown rendering', () => {
    assert.ok(
        showSource.includes("import SanitizedHtml from '../../Components/SanitizedHtml';") ||
        showSource.includes('import SanitizedHtml from "@/Components/SanitizedHtml";') ||
        showSource.includes('SanitizedHtml'),
        'Show.jsx must import SanitizedHtml component'
    );

    assert.ok(
        showSource.includes('<SanitizedHtml html={job.instruction}'),
        'Show.jsx must render job.instruction using SanitizedHtml instead of plain whitespace-pre-wrap'
    );
});

test('coding agent show page includes copy prompt helper', () => {
    assert.ok(
        showSource.includes('copyPrompt') || showSource.includes('clipboard'),
        'Show.jsx should offer a clipboard copy utility for the instruction prompt'
    );
});
