import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const indexPath = join(__dirname, '..', 'Pages', 'Agent', 'Index.jsx');
const indexSource = readFileSync(indexPath, 'utf8');

test('coding agent index renders magic wand prompt generator button', () => {
    assert.ok(
        indexSource.includes('/agent/generate-prompt'),
        'Index.jsx should call the /agent/generate-prompt endpoint'
    );
    assert.ok(
        indexSource.includes('🪄') || indexSource.includes('Magic Wand'),
        'Index.jsx should have a magic wand icon or label'
    );
    assert.ok(
        indexSource.includes('enhancePrompt') || indexSource.includes('generatePrompt'),
        'Index.jsx should have a prompt generator function'
    );
});
