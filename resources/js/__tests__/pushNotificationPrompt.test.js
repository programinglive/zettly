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
        componentSource.includes("if (dismissed && permission !== 'granted')"),
        'Expected the prompt to only respect dismissal when permission not granted.'
    );

    assert.ok(
        componentSource.includes("const shouldShow = permission !== 'granted' || !isSubscribed;"),
        'Expected prompt to show when permission granted but not subscribed, even if dismissed.'
    );
});
