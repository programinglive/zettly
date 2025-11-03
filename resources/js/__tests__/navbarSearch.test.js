import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const componentPath = join(__dirname, '..', 'Components', 'NavbarSearch.jsx');
const componentSource = readFileSync(componentPath, 'utf8');

test('navbar search renders Algolia attribution badge', () => {
    assert.match(
        componentSource,
        /<span>Search by<\/span>/,
        'Expected Algolia badge label to be present.'
    );

    assert.match(
        componentSource,
        /alt="Algolia"/,
        'Expected Algolia logo to be referenced in badge.'
    );

    assert.match(
        componentSource,
        /https:\/\/www\.algolia\.com\/\?utm_source=zettly&utm_medium=referral&utm_campaign=oss_search/,
        'Expected Algolia attribution URL to be documented in component.'
    );
});

test('navbar search input uses updated pill styling', () => {
    assert.match(
        componentSource,
        /className="pl-9 pr-12 h-11 rounded-full border border-border\/60 bg-white\/95 text-foreground shadow-sm/,
        'Expected search input to use pill-shaped styling with subtle shadow.'
    );

    assert.match(
        componentSource,
        /dark:bg-slate-900\/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:border-slate-700/,
        'Expected search input to include dark theme styling tokens.'
    );
});

test('navbar search exposes clear button and closes results when query is empty', () => {
    assert.match(
        componentSource,
        /aria-label="Clear search"/,
        'Expected clear button with accessible label to be rendered.'
    );

    assert.match(
        componentSource,
        /if \(!query\.trim\(\)\) {\s*setSections\(\[\]\);[\s\S]*setOpen\(false\);[\s\S]*setActiveIndex\(-1\);/,
        'Expected effect hook to close results and reset active index when query is cleared.'
    );
});
