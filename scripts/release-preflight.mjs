import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Compute the next SemVer string from a current version and release type.
 */
export function computeNextVersion(currentVersion, releaseType) {
    const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(currentVersion).trim());
    if (!match) {
        throw new Error(`Invalid current version: ${currentVersion}`);
    }

    const major = Number(match[1]);
    const minor = Number(match[2]);
    const patch = Number(match[3]);

    switch (releaseType) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
            return `${major}.${minor}.${patch + 1}`;
        default:
            throw new Error(`Unsupported release type: ${releaseType}. Expected patch, minor, or major.`);
    }
}

/**
 * Evaluate release preflight checks before mutating version files or pushing tags.
 */
export function evaluateReleasePreflight({
    currentVersion,
    releaseType,
    existingTags = [],
    protectedTagRulesetActive = false,
    hasAppCredentials = false,
    hasReleaseToken = false,
    ciPassed = true,
    targetSha = '',
}) {
    const errors = [];
    let nextVersion = null;
    let nextTag = null;

    try {
        nextVersion = computeNextVersion(currentVersion, releaseType);
        nextTag = `v${nextVersion}`;
    } catch (error) {
        errors.push(error.message);
    }

    if (nextTag && existingTags.includes(nextTag)) {
        errors.push(`Version collision: tag ${nextTag} already exists.`);
    }

    if (!ciPassed) {
        errors.push(`Incomplete or failing CI for target commit ${targetSha || 'HEAD'}.`);
    }

    if (protectedTagRulesetActive && !hasAppCredentials && !hasReleaseToken) {
        errors.push(
            `Insufficient permission: protected-release-tags ruleset blocks GITHUB_TOKEN from creating ${nextTag || 'v*'} tags. ` +
            'Configure RELEASE_APP_ID + RELEASE_APP_PRIVATE_KEY (or RELEASE_TOKEN) with ruleset bypass permission, or run the release from an authorized Repository Admin CLI.'
        );
    }

    return {
        ok: errors.length === 0,
        nextVersion,
        nextTag,
        authMode: hasAppCredentials ? 'github-app' : hasReleaseToken ? 'release-token' : 'github-token',
        errors,
    };
}

function runCli() {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    const releaseType = process.env.RELEASE_TYPE || process.argv[2] || 'patch';
    const existingTags = execSync('git tag -l "v*"', { encoding: 'utf8' })
        .split(/\r?\n/)
        .map((t) => t.trim())
        .filter(Boolean);
    const targetSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

    const hasAppCredentials = Boolean(process.env.HAS_APP_CREDENTIALS === 'true');
    const hasReleaseToken = Boolean(process.env.HAS_RELEASE_TOKEN === 'true');
    const protectedTagRulesetActive = Boolean(process.env.PROTECTED_TAG_RULESET_ACTIVE !== 'false');
    const ciPassed = process.env.CI_PASSED !== 'false';

    const result = evaluateReleasePreflight({
        currentVersion: pkg.version,
        releaseType,
        existingTags,
        protectedTagRulesetActive,
        hasAppCredentials,
        hasReleaseToken,
        ciPassed,
        targetSha,
    });

    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) {
        process.exit(1);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
