import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bootstrapPath = join(__dirname, '..', 'bootstrap.js');
const exampleEnvPath = join(__dirname, '..', '..', '..', '.env.example');

const bootstrapSource = readFileSync(bootstrapPath, 'utf8');
const exampleEnvSource = readFileSync(exampleEnvPath, 'utf8');

test('Sentry is initialized when VITE_SENTRY_DSN is present', () => {
    assert.ok(
        bootstrapSource.includes("if (import.meta.env.VITE_SENTRY_DSN)"),
        'Expected Sentry initialization to be guarded by VITE_SENTRY_DSN.'
    );
    assert.ok(
        bootstrapSource.includes("Sentry.init({"),
        'Expected Sentry.init call inside the guard.'
    );
});

test('Sentry env vars are documented in .env.example', () => {
    assert.ok(
        exampleEnvSource.includes('VITE_SENTRY_DSN="${SENTRY_DSN}"'),
        'Expected VITE_SENTRY_DSN to be present in .env.example.'
    );
    assert.ok(
        exampleEnvSource.includes('VITE_SENTRY_ENVIRONMENT=production'),
        'Expected VITE_SENTRY_ENVIRONMENT to be documented.'
    );
    assert.ok(
        exampleEnvSource.includes('VITE_SENTRY_TRACES_SAMPLE_RATE=0.1'),
        'Expected traces sample rate to be documented.'
    );
});
