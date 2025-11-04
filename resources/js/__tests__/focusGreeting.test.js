import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const focusGreetingPath = join(__dirname, '..', 'Components', 'FocusGreeting.jsx');
const dialogPath = join(__dirname, '..', 'Components', 'ui', 'dialog.jsx');

const focusGreetingSource = readFileSync(focusGreetingPath, 'utf8');
const dialogSource = readFileSync(dialogPath, 'utf8');

test('focus greeting auto-opens dialog when no current focus', () => {
    assert.ok(
        focusGreetingSource.includes('const autoOpenRef = useRef(false);'),
        'Expected focus greeting to track whether the dialog was auto-opened.'
    );

    assert.ok(
        focusGreetingSource.includes("if (!data.data && !autoOpenRef.current) {\n                    setShowDialog(true);\n                    autoOpenRef.current = true;"),
        'Expected focus greeting to open the dialog automatically when no focus exists.'
    );

    assert.ok(
        focusGreetingSource.includes('autoOpenRef.current = true;') && focusGreetingSource.match(/setShowDialog\(false\);\s*autoOpenRef\.current = true;/),
        'Expected focus greeting to mark that the dialog has auto-opened after creating a focus or fetching an existing one.'
    );
});

test('focus greeting dialog uses enlarged layout', () => {
    assert.ok(
        dialogSource.includes("className={cn(\n                    'fixed left-1/2 top-1/2 z-50 grid w-full max-w-3xl"),
        'Expected dialog content to allow wider (3xl) layout for better screen utilization.'
    );

    assert.ok(
        dialogSource.includes('rounded-2xl') && dialogSource.includes('p-8') && dialogSource.includes('shadow-2xl'),
        'Expected dialog content to use enlarged spacing and rounded corners.'
    );
});
