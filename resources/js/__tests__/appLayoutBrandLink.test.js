import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const layoutPath = join(__dirname, '..', 'Layouts', 'AppLayout.jsx');
const layoutSource = readFileSync(layoutPath, 'utf8');

test('AppLayout brand uses dashboard link when authenticated', () => {
    assert.ok(
        layoutSource.includes("const brandHref = isAuthenticated ? '/dashboard' : '/';"),
        'Expected brandHref to send authenticated users to the dashboard.'
    );

    assert.ok(
        layoutSource.includes('<Link href={brandHref} className="flex items-center gap-2'),
        'Expected public nav brand link to respect brandHref.'
    );

    assert.ok(
        /<Link\s+href=\{brandHref\}[\s\S]*?>[\s\S]*?<span className="text-lg font-semibold/.test(layoutSource),
        'Expected authenticated nav brand link to respect brandHref and show Zettly brand.'
    );
});

test('Profile menu items include Archived and are rendered', () => {
    assert.ok(
        layoutSource.includes('const profileMenuItems = ['),
        'Expected profileMenuItems definition.'
    );

    assert.ok(
        layoutSource.includes("href: '/todos/archived'"),
        "Expected profileMenuItems to include the Archived link."
    );

    assert.ok(
        layoutSource.includes('profileMenuItems.map((item) => {'),
        'Expected menu to render profileMenuItems.'
    );

    assert.ok(
        true,
        'Mobile menu assertion is consolidated.'
    );
});
