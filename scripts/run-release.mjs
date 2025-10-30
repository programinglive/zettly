import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

const result = spawnSync('npx', ['standard-version', ...args], {
    stdio: 'inherit',
    env: {
        ...process.env,
        HUSKY: '0',
        HUSKY_SKIP_HOOKS: '1',
        npm_lifecycle_event: 'release',
    },
});

if (result.status !== 0) {
    process.exit(result.status ?? 1);
}
