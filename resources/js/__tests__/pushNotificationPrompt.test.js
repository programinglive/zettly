import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const componentPath = join(__dirname, '..', 'Components', 'PushNotificationPrompt.jsx');
const componentSource = readFileSync(componentPath, 'utf8');

test('push notification prompt now renders nothing', () => {
    assert.ok(
        componentSource.includes('return null;'),
        'Expected the prompt component to return null after deprecating the floating banner.'
    );

    assert.ok(
        componentSource.includes('console.debug('),
        'Expected the prompt component to log diagnostic information for the legacy removal.'
    );
});
