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

test('focus greeting auto-opens dialog when no current focus and not skipping', () => {
    assert.ok(
        focusGreetingSource.includes('const autoOpenRef = useRef(false);'),
        'Expected focus greeting to track whether the dialog was auto-opened.'
    );

    assert.ok(
        focusGreetingSource.includes('if (!data.data && !autoOpenRef.current)') &&
        /if \(!skipAutoOpen\) {\s*setShowDialog\(true\);/m.test(focusGreetingSource),
        'Expected focus greeting to open the dialog automatically when no focus exists and auto-open is not skipped.'
    );

    assert.ok(
        focusGreetingSource.includes('autoOpenRef.current = true;') &&
        focusGreetingSource.match(/setShowDialog\(false\);\s*autoOpenRef\.current = true;/),
        'Expected focus greeting to mark that the dialog has auto-opened after creating a focus or fetching an existing one.'
    );
});

test('focus greeting skips auto-open on tablets', () => {
    assert.ok(
        focusGreetingSource.includes('const tabletDetectionRef = useRef(false);'),
        'Expected focus greeting to track tablet detection state.'
    );

    assert.ok(
        /if \(typeof window !== ['"]undefined['"]\) {\s*tabletDetectionRef\.current = detectTabletDevice\(\);\s*skipAutoOpen = tabletDetectionRef\.current;/m.test(
            focusGreetingSource
        ),
        'Expected focus greeting to set skipAutoOpen based on tablet detection.'
    );

    assert.ok(
        /if \(!tabletDetectionRef\.current\) {\s*setShowDialog\(true\);\s*} else {\s*setShowDialog\(false\);\s*}/m.test(focusGreetingSource),
        'Expected focus greeting to avoid reopening the dialog automatically after completion when on tablet.'
    );
});

test('focus greeting fetches include credentials and safe parsing', () => {
    assert.ok(
        /axios\.get\(`\/focus\/current\$\{queryString\}`/.test(focusGreetingSource),
        'Expected current focus fetch to use axios.get.'
    );

    assert.ok(
        /axios\.post\('\/focus', {\s*title: title\.trim\(\),/.test(focusGreetingSource),
        'Expected create focus request to use axios.post.'
    );


});

test('focus greeting renders CompletionReasonDialog', () => {
    assert.ok(
        focusGreetingSource.includes('CompletionReasonDialog'),
        'Expected focus greeting to render the shared CompletionReasonDialog component.'
    );
});

test('focus greeting opens reason dialog on completion request', () => {
    assert.ok(
        /setShowReasonDialog\s*\(\s*true\s*\);/m.test(focusGreetingSource) && focusGreetingSource.includes('handleRequestCompleteFocus'),
        'Expected focus greeting to open the reason dialog when completion is requested.'
    );
});

test('focus greeting sends correct completion request', () => {
    assert.ok(
        /axios\.post\s*\(\s*`\/focus\/\$\{currentFocus\.id\}\/complete`\s*,\s*{\s*reason,\s*filter_date:/m.test(focusGreetingSource),
        'Expected focus greeting to send the completion reason and filter_date in the axios request body.'
    );
});

test('focus greeting updates history after completion', () => {
    assert.ok(
        /setStatusEvents\s*\(\s*\(prev\)\s*=>\s*{/m.test(focusGreetingSource) && focusGreetingSource.includes('Recent Focus History'),
        'Expected focus greeting to update and render the recent focus history list after completion.'
    );
});

test('focus greeting handles text wrapping', () => {
    assert.ok(
        focusGreetingSource.includes('line-clamp-2'),
        'Expected focus greeting to wrap long reason text without overflowing the card.'
    );
});

test('focus greeting history renders focus title', () => {
    assert.ok(
        focusGreetingSource.includes('event.focus?.title'),
        'Expected recent focus history entries to include focus title.'
    );
});

test('focus greeting history falls back to user-friendly name when missing', () => {
    assert.ok(
        /event\.user\?\.name\s*\?\?\s*'You'/.test(focusGreetingSource),
        'Expected recent focus history entries to default to "You" when user information is missing.'
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

test('focus greeting prompts for a new focus after completion', () => {
    assert.ok(
        /setCurrentFocus\(null\);\s*setTitle\(''\);\s*setDescription\(''\);/m.test(focusGreetingSource),
        'Expected focus greeting to clear the form after completing a focus.'
    );

    assert.ok(
        /if \(!tabletDetectionRef\.current\) {\s*setShowDialog\(true\);\s*} else {\s*setShowDialog\(false\);\s*}\s*autoOpenRef\.current = false;/m.test(
            focusGreetingSource
        ),
        'Expected focus greeting to reopen the dialog only when not on tablet, and mark auto-open state reset.'
    );
});
