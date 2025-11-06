import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const textInputPath = join(__dirname, '..', 'Components', 'TextInput.jsx');
const source = readFileSync(textInputPath, 'utf8');

test('TextInput provides internal padding by default', () => {
    assert.match(
        source,
        /shadow-sm px-3 py-2 focus:border-indigo-500/,
        'Expected base TextInput styles to include horizontal and vertical padding before focus utilities.'
    );
});
