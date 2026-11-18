import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createAuthBroker, parseTtlMs } from '../src/auth-broker.js';

function makeTestBroker(baseDir, clock) {
  return createAuthBroker({
    baseDir,
    now: clock,
    protect: async (plain) => Buffer.from(`ENC:${plain}`, 'utf8').toString('base64'),
    unprotect: async (enc) => {
      const decoded = Buffer.from(enc, 'base64').toString('utf8');
      if (!decoded.startsWith('ENC:')) throw new Error('Corrupt vault');
      return decoded.slice(4);
    },
  });
}

test('auth broker stores encrypted session, issues grant, runs scoped command, and cleans up ephemeral state', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zettly-broker-test-'));
  let now = 1_700_000_000_000;
  try {
    const broker = makeTestBroker(dir, () => now);
    await broker.saveBrowserSession({
      origin: 'https://zettly.programinglive.com',
      storageState: { cookies: [{ name: 'zettly_session', value: 'secret-cookie-val' }] },
      user: { email: 'owner@example.test' },
    });

    const rawVault = await readFile(broker.paths.vaultFile, 'utf8');
    assert.ok(!rawVault.includes('secret-cookie-val'), 'Vault must not store plaintext session cookies');

    const grant = await broker.grant({ agent: 'playwright', scope: 'browser:read', ttl: '2h' });
    assert.equal(grant.agent, 'playwright');
    assert.equal(grant.advisoryOnly, true);

    let seenStateFile = null;
    const res = await broker.runWithGrant({
      agent: 'playwright',
      commandArgs: ['echo', 'ok'],
      runner: async (_args, env) => {
        seenStateFile = env.ZETTLY_BROKER_STORAGE_STATE;
        const content = JSON.parse(await readFile(seenStateFile, 'utf8'));
        assert.equal(content.cookies[0].value, 'secret-cookie-val');
        return 0;
      },
    });
    assert.equal(res.exitCode, 0);

    await assert.rejects(() => readFile(seenStateFile, 'utf8'), 'Ephemeral state file must be removed after run');

    const audit = await readFile(broker.paths.auditFile, 'utf8');
    assert.ok(!audit.includes('secret-cookie-val'), 'Audit log must never contain session secrets');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('auth broker enforces TTL expiry, revocation, and corrupt vault handling', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zettly-broker-exp-'));
  let now = 1_700_000_000_000;
  try {
    const broker = makeTestBroker(dir, () => now);
    await broker.saveBrowserSession({
      origin: 'https://zettly.programinglive.com',
      storageState: { cookies: [{ name: 'zettly_session', value: 's1' }] },
    });
    await broker.grant({ agent: 'playwright', scope: 'browser:read', ttl: '1h' });

    now += 3_600_001;
    await assert.rejects(
      () => broker.runWithGrant({ agent: 'playwright', commandArgs: ['echo'], runner: async () => 0 }),
      /expired/
    );

    await broker.grant({ agent: 'playwright', scope: 'browser:read', ttl: '1h' });
    await broker.revoke('playwright');
    await assert.rejects(
      () => broker.runWithGrant({ agent: 'playwright', commandArgs: ['echo'], runner: async () => 0 }),
      /revoked/
    );

    await writeFile(broker.paths.vaultFile, 'corrupt-data', 'utf8');
    const st = await broker.status();
    assert.equal(st.vault_state, 'corrupt');
    assert.equal(st.browser_authenticated, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('auth broker prevents concurrent runs for the same agent profile and caps TTL at 8h', async () => {
  assert.throws(() => parseTtlMs('9h'), /1s and 8h/);
  const dir = await mkdtemp(join(tmpdir(), 'zettly-broker-lock-'));
  try {
    const broker = makeTestBroker(dir, () => 1_700_000_000_000);
    await broker.saveBrowserSession({
      origin: 'https://zettly.programinglive.com',
      storageState: { cookies: [] },
    });
    await broker.grant({ agent: 'playwright', scope: 'browser:read', ttl: '8h' });

    const res = await broker.runWithGrant({
      agent: 'playwright',
      commandArgs: ['echo'],
      runner: async () => {
        await assert.rejects(
          () => broker.runWithGrant({ agent: 'playwright', commandArgs: ['echo'], runner: async () => 0 }),
          /active browser profile lock/
        );
        return 0;
      },
    });
    assert.equal(res.exitCode, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
