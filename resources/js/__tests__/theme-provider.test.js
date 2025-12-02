import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

import path from 'node:path';

const themeProviderPath = path.resolve('resources/js/Components/theme-provider.jsx');


const read = (path) => fs.readFileSync(path, 'utf8');

test('ThemeProvider uses setThemeState to avoid naming conflict', () => {
    const content = read(themeProviderPath);

    assert.ok(
        content.includes('const [theme, setThemeState] = useState'),
        'Should rename state setter to setThemeState'
    );
    assert.ok(
        content.includes('setThemeState(newTheme)'),
        'Should call setThemeState in setTheme function'
    );
    assert.ok(
        !content.includes('setTheme(theme)'),
        'Should NOT call setTheme recursively'
    );
});

test('ThemeProvider applies dark class to document element', () => {
    const content = read(themeProviderPath);

    assert.ok(
        content.includes("root.classList.add(theme)"),
        'Should add theme class to root element'
    );
    assert.ok(
        content.includes("root.classList.remove('light', 'dark')"),
        'Should remove previous theme classes'
    );
});

test('ThemeProvider persists theme to localStorage', () => {
    const content = read(themeProviderPath);

    assert.ok(
        content.includes("localStorage.setItem(storageKey, newTheme)"),
        'Should persist theme to localStorage'
    );
    assert.ok(
        content.includes("localStorage.getItem(storageKey)"),
        'Should read theme from localStorage on init'
    );
});
