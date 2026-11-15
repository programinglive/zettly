import test from 'node:test';
import assert from 'node:assert/strict';
import { computeNextVersion, evaluateReleasePreflight } from '../release-preflight.mjs';

test('computeNextVersion increments patch, minor, and major SemVer correctly', () => {
    assert.equal(computeNextVersion('1.0.2', 'patch'), '1.0.3');
    assert.equal(computeNextVersion('1.0.2', 'minor'), '1.1.0');
    assert.equal(computeNextVersion('1.0.2', 'major'), '2.0.0');
});

test('evaluateReleasePreflight passes when GitHub App credentials and CI are valid', () => {
    const res = evaluateReleasePreflight({
        currentVersion: '1.0.2',
        releaseType: 'minor',
        existingTags: ['v1.0.1', 'v1.0.2'],
        protectedTagRulesetActive: true,
        hasAppCredentials: true,
        ciPassed: true,
        targetSha: 'a4ebc75805e7ad50e76292ca83bf65548efd25a1',
    });

    assert.equal(res.ok, true);
    assert.equal(res.nextTag, 'v1.1.0');
    assert.equal(res.authMode, 'github-app');
});

test('evaluateReleasePreflight fails fast when protected-release-tags is active without App or release token', () => {
    const res = evaluateReleasePreflight({
        currentVersion: '1.0.2',
        releaseType: 'minor',
        existingTags: ['v1.0.2'],
        protectedTagRulesetActive: true,
        hasAppCredentials: false,
        hasReleaseToken: false,
        ciPassed: true,
    });

    assert.equal(res.ok, false);
    assert.match(res.errors[0], /protected-release-tags/);
});

test('evaluateReleasePreflight detects existing tag collision and failing CI', () => {
    const res = evaluateReleasePreflight({
        currentVersion: '1.0.2',
        releaseType: 'minor',
        existingTags: ['v1.0.2', 'v1.1.0'],
        protectedTagRulesetActive: false,
        ciPassed: false,
        targetSha: 'abc123',
    });

    assert.equal(res.ok, false);
    assert.equal(res.errors.length, 2);
    assert.match(res.errors[0], /Version collision: tag v1\.1\.0 already exists/);
    assert.match(res.errors[1], /Incomplete or failing CI/);
});
