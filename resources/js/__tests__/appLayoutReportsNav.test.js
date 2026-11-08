import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const appLayoutSource = readFileSync(join(__dirname, '..', 'Layouts', 'AppLayout.jsx'), 'utf8');

test('app sidebar exposes a Reports entry for the report workspace', () => {
    // Both the desktop sidebar and the mobile drawer render from the same
    // sidebarNavigation array, so one entry covers both.
    assert.ok(
        /href:\s*'\/reports',\s*\n\s*label:\s*'Reports',/.test(appLayoutSource),
        'Expected a /reports sidebar entry labelled "Reports".',
    );
});

test('reports sidebar entry uses a lucide icon and the main group', () => {
    const block = appLayoutSource.match(/href:\s*'\/reports',\s*\n\s*label:\s*'Reports',\s*\n\s*icon:\s*(\w+),\s*\n\s*group:\s*'(main|admin)',/);

    assert.ok(block, 'Expected the Reports nav entry to be fully specified.');
    assert.equal(block[2], 'main', 'Reports belongs to the main navigation group.');

    const imports = appLayoutSource.match(/^import \{([\s\S]*?)\} from 'lucide-react';/m);
    assert.ok(imports, 'Expected lucide-react icon imports.');
    assert.ok(
        imports[1].includes(block[1]),
        `Expected the ${block[1]} icon to be imported from lucide-react.`,
    );
});
