import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const indexPath = path.join(repoRoot, 'resources/js/Pages/Todos/Index.jsx');

test('Todos/Index.jsx uses human-centered toolbar (search, status tabs, canonical project selector, collapsible filters) instead of raw tag wall', () => {
    const content = fs.readFileSync(indexPath, 'utf8');

    // Canonical UI/UX standard compliance
    assert.match(content, /w-full px-4 sm:px-6 py-4/);
    assert.match(content, /<h1[^>]*text-lg font-semibold/);

    // Human-centered search + canonical project filter + collapsible secondary filters
    assert.match(content, /Search tasks/i, 'Tasks page must provide a search input');
    assert.match(content, /All Projects/, 'Tasks page must provide a Canonical Project selector');
    assert.match(content, /statusCounts/, 'Tasks page must display live Open/Completed/All status counts');
    assert.match(content, /canonicalProjects/, 'Tasks page must consume canonicalProjects prop');

    // Must not dump the old 130+ raw tag wall label directly above the list
    assert.doesNotMatch(content, /Filter by Tag/, 'Legacy uncollapsed "Filter by Tag" wall must be removed');

    // Bug fixes: CompletionReasonDialog must actually be rendered and NOTES_PAGE_SIZE typo removed
    assert.match(content, /<CompletionReasonDialog/, 'CompletionReasonDialog must be rendered in JSX');
    assert.doesNotMatch(content, /NOTES_PAGE_SIZE/, 'Undefined NOTES_PAGE_SIZE reference must be removed');

    // Markdown stripping helper must exist to prevent raw **DONE** preview leaks
    assert.match(content, /stripMarkdown/, 'Description preview must strip raw Markdown syntax');
});
