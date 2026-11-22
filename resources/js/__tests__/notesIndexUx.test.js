import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const indexPath = path.join(repoRoot, 'resources/js/Pages/Notes/Index.jsx');

test('Notes/Index.jsx uses calm Zettelkasten toolbar (search, canonical project selector, sort, collapsible tags) and strips Markdown', () => {
    const content = fs.readFileSync(indexPath, 'utf8');

    // Canonical UI/UX standard compliance
    assert.match(content, /w-full px-4 sm:px-6 py-4/);
    assert.match(content, /<h1[^>]*text-lg font-semibold/);

    // Human-centered search + canonical project filter + sort + totalNotes
    assert.match(content, /Search notes/i, 'Notes page must provide a search input');
    assert.match(content, /All Projects/, 'Notes page must provide a Canonical Project selector');
    assert.match(content, /canonicalProjects/, 'Notes page must consume canonicalProjects prop');
    assert.match(content, /totalNotes/, 'Notes page must display total note count');
    assert.match(content, /Recently Updated/, 'Notes page must provide sort options');

    // Markdown stripping helper must exist and preserve snake_case underscores
    assert.match(content, /stripMarkdown/, 'Note preview must strip raw Markdown syntax');
    assert.doesNotMatch(
        content,
        /\.replace\(\/\(\\\*\|_\)(\(\.\*\?\))\\1\/g/,
        'stripMarkdown must not strip underscores inside snake_case identifiers',
    );

    // Must not silently slice server-paginated 20 items down to 12
    assert.doesNotMatch(content, /filteredNotes\.slice\(0,\s*PAGE_CHUNK_SIZE\)/, 'Notes page must not truncate server-paginated results');
});
