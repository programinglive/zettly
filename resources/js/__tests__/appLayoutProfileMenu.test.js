
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const layoutPath = join(__dirname, '..', 'Layouts', 'AppLayout.jsx');
const layoutSource = readFileSync(layoutPath, 'utf8');

test('Profile menu should NOT contain Completed, Archived, or Trash', () => {
    // Extract the profileMenuItems array definition
    const profileMenuRegex = /const profileMenuItems = \[([\s\S]*?)\];/;
    const match = layoutSource.match(profileMenuRegex);

    assert.ok(match, 'Could not find profileMenuItems definition in AppLayout.jsx');
    const menuItemsContent = match[1];

    // Assert that unwanted items are NOT present
    assert.strictEqual(
        menuItemsContent.includes('Completed'),
        false,
        'Profile menu should not contain "Completed"'
    );
    assert.strictEqual(
        menuItemsContent.includes('Archived'),
        false,
        'Profile menu should not contain "Archived"'
    );
    assert.strictEqual(
        menuItemsContent.includes('Trash'),
        false,
        'Profile menu should not contain "Trash"'
    );

    // Assert that wanted items ARE present
    assert.ok(
        menuItemsContent.includes('Profile Settings'),
        'Profile menu should contain "Profile Settings"'
    );
    assert.ok(
        menuItemsContent.includes('Organizations'),
        'Profile menu should contain "Organizations"'
    );
});
