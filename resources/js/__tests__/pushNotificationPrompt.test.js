import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const componentPath = join(__dirname, '..', 'Components', 'PushNotificationPrompt.jsx');
const componentSource = readFileSync(componentPath, 'utf8');

test('push notification prompt respects dismissed state', () => {
    assert.ok(
        componentSource.includes('if (dismissed) {') && componentSource.includes('setVisible(false);'),
        'Expected the prompt to remain hidden when previously dismissed.'
    );

    assert.ok(
        componentSource.includes("const shouldShow = permission !== 'granted' || !isSubscribed;"),
        'Expected prompt visibility to be gated by permission/subscription when not dismissed.'
    );

    assert.ok(
        componentSource.includes('const showReopenButton = dismissed && needsAttention;') && componentSource.includes('onClick={handleReopen}'),
        'Expected dismissed users to get a reopen control when they still need to enable notifications.'
    );
});
