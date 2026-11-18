import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { spawn } from 'node:child_process';
import { appendFile, chmod, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { homedir, platform, tmpdir, userInfo } from 'node:os';
import { dirname, join } from 'node:path';

export const MAX_GRANT_TTL_MS = 8 * 60 * 60 * 1000;

export function parseTtlMs(ttl = '8h') {
  const raw = String(ttl || '8h').trim().toLowerCase();
  const match = raw.match(/^(\d+)(s|m|h)$/);
  if (!match) {
    throw new Error(`Invalid TTL "${ttl}". Use e.g. 30m, 2h, or 8h (max 8h).`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 's' ? 1000 : unit === 'm' ? 60_000 : 3_600_000;
  const ms = value * multiplier;
  if (ms <= 0 || ms > MAX_GRANT_TTL_MS) {
    throw new Error('Grant TTL must be between 1s and 8h.');
  }
  return ms;
}

function defaultPosixKey() {
  const info = userInfo();
  return scryptSync(`${info.username}@${process.env.HOSTNAME || 'localhost'}`, 'zettly-auth-broker-v1', 32);
}

function defaultProtectWin32(plaintext, psRunner) {
  const script = `
Add-Type -AssemblyName System.Security
$plain = [Console]::In.ReadToEnd().Trim()
if (-not $plain) { exit 2 }
$bytes = [System.Text.Encoding]::UTF8.GetBytes($plain)
$enc = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
[Convert]::ToBase64String($enc)
`.trim();
  return psRunner(script, plaintext);
}

function defaultUnprotectWin32(ciphertext, psRunner) {
  const script = `
Add-Type -AssemblyName System.Security
$b64 = [Console]::In.ReadToEnd().Trim()
if (-not $b64) { exit 0 }
$enc = [Convert]::FromBase64String($b64)
$dec = [System.Security.Cryptography.ProtectedData]::Unprotect($enc, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
[System.Text.Encoding]::UTF8.GetString($dec)
`.trim();
  return psRunner(script, ciphertext);
}

function runPowerShell(script, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (d) => { stdout += d; });
    child.stderr.setEncoding('utf8').on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `PowerShell exited ${code}`))));
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

function defaultProtectPosix(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', defaultPosixKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: tag.toString('base64'), data: enc.toString('base64') });
}

function defaultUnprotectPosix(payload) {
  const parsed = JSON.parse(payload);
  const decipher = createDecipheriv('aes-256-gcm', defaultPosixKey(), Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]).toString('utf8');
}

export function createAuthBroker(options = {}) {
  const baseDir = options.baseDir || join(homedir(), '.zettly');
  const vaultFile = join(baseDir, 'browser-vault.enc');
  const grantsFile = join(baseDir, 'auth-grants.json');
  const auditFile = join(baseDir, 'auth-audit.jsonl');
  const locksDir = join(baseDir, 'locks');
  const now = options.now || (() => Date.now());
  const isWin = (options.platform || platform()) === 'win32';
  const psRunner = options.psRunner || runPowerShell;

  const protect = options.protect || (isWin ? (s) => defaultProtectWin32(s, psRunner) : async (s) => defaultProtectPosix(s));
  const unprotect = options.unprotect || (isWin ? (s) => defaultUnprotectWin32(s, psRunner) : async (s) => defaultUnprotectPosix(s));

  async function ensureDirs() {
    await mkdir(baseDir, { recursive: true, mode: 0o700 });
    await mkdir(locksDir, { recursive: true, mode: 0o700 });
  }

  async function audit(event, details = {}) {
    await ensureDirs();
    const record = {
      ts: new Date(now()).toISOString(),
      event,
      ...details,
    };
    await appendFile(auditFile, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
  }

  async function readVault() {
    try {
      const raw = await readFile(vaultFile, 'utf8');
      if (!raw.trim()) return null;
      const decrypted = await unprotect(raw.trim());
      const parsed = JSON.parse(decrypted);
      if (!parsed || typeof parsed !== 'object' || !parsed.storageState) {
        return { corrupt: true };
      }
      return parsed;
    } catch (err) {
      if (err && err.code === 'ENOENT') return null;
      return { corrupt: true };
    }
  }

  async function writeVault(sessionRecord) {
    await ensureDirs();
    const encrypted = await protect(JSON.stringify(sessionRecord));
    await writeFile(vaultFile, encrypted, { encoding: 'utf8', mode: 0o600 });
    await chmod(vaultFile, 0o600).catch(() => {});
  }

  async function readGrants() {
    try {
      const raw = await readFile(grantsFile, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  async function writeGrants(grants) {
    await ensureDirs();
    await writeFile(grantsFile, JSON.stringify(grants, null, 2), { encoding: 'utf8', mode: 0o600 });
    await chmod(grantsFile, 0o600).catch(() => {});
  }

  function isExpired(isoString) {
    if (!isoString) return false;
    const ms = Date.parse(isoString);
    return Number.isFinite(ms) && ms <= now();
  }

  async function status() {
    const vault = await readVault();
    const grants = await readGrants();
    const activeGrants = {};
    for (const [agent, g] of Object.entries(grants)) {
      if (!g.revokedAt && !isExpired(g.expiresAt)) {
        activeGrants[agent] = {
          agent: g.agent,
          scope: g.scope,
          issuedAt: g.issuedAt,
          expiresAt: g.expiresAt,
          advisoryOnly: g.advisoryOnly ?? true,
        };
      }
    }

    if (!vault) {
      return { browser_authenticated: false, vault_state: 'missing', origin: null, expires_at: null, grants: activeGrants };
    }
    if (vault.corrupt) {
      return { browser_authenticated: false, vault_state: 'corrupt', origin: null, expires_at: null, grants: activeGrants };
    }
    if (isExpired(vault.expiresAt)) {
      return { browser_authenticated: false, vault_state: 'expired', origin: vault.origin || null, expires_at: vault.expiresAt, grants: activeGrants };
    }

    return {
      browser_authenticated: true,
      vault_state: 'valid',
      origin: vault.origin || null,
      authenticated_at: vault.authenticatedAt || null,
      expires_at: vault.expiresAt || null,
      user: vault.user || null,
      grants: activeGrants,
    };
  }

  async function saveBrowserSession({ origin, storageState, user = null, expiresAt = null }) {
    if (!origin || !storageState) {
      throw new Error('Both origin and storageState are required.');
    }
    const record = {
      origin,
      storageState,
      user,
      authenticatedAt: new Date(now()).toISOString(),
      expiresAt,
    };
    await writeVault(record);
    await audit('browser_login', { origin, user: user?.email || user?.name || null });
    return { stored: true, origin, expiresAt };
  }

  async function grant({ agent, scope = 'browser:read', ttl = '8h' }) {
    if (!agent || !/^[a-z0-9_-]+$/i.test(agent)) {
      throw new Error('Valid --agent name is required (alphanumeric, -, _).');
    }
    const current = await status();
    if (!current.browser_authenticated) {
      throw new Error(`Cannot grant "${agent}": browser vault is ${current.vault_state}. Run "zettly auth login --browser" first.`);
    }

    const ttlMs = parseTtlMs(ttl);
    const grants = await readGrants();
    const expiresMs = Math.min(
      now() + ttlMs,
      current.expires_at ? Date.parse(current.expires_at) : Number.MAX_SAFE_INTEGER
    );

    grants[agent] = {
      agent,
      scope,
      issuedAt: new Date(now()).toISOString(),
      expiresAt: new Date(expiresMs).toISOString(),
      revokedAt: null,
      advisoryOnly: scope === 'browser:read',
    };
    await writeGrants(grants);
    await audit('grant_issued', { agent, scope, expiresAt: grants[agent].expiresAt });
    return grants[agent];
  }

  async function revoke(agent) {
    if (!agent) throw new Error('Specify --agent <name>.');
    const grants = await readGrants();
    if (!grants[agent]) {
      return { agent, revoked: false, reason: 'not_found' };
    }
    grants[agent].revokedAt = new Date(now()).toISOString();
    await writeGrants(grants);
    await audit('grant_revoked', { agent });
    return { agent, revoked: true, revokedAt: grants[agent].revokedAt };
  }

  async function logout() {
    await unlink(vaultFile).catch(() => {});
    const grants = await readGrants();
    const ts = new Date(now()).toISOString();
    for (const key of Object.keys(grants)) {
      grants[key].revokedAt = grants[key].revokedAt || ts;
    }
    await writeGrants(grants).catch(() => {});
    await audit('browser_logout', {});
    return { logged_out: true };
  }

  async function acquireLock(agent) {
    await ensureDirs();
    const lockFile = join(locksDir, `${agent}.lock`);
    try {
      await writeFile(lockFile, JSON.stringify({ pid: process.pid, acquiredAt: new Date(now()).toISOString() }), {
        flag: 'wx',
        mode: 0o600,
      });
    } catch (err) {
      if (err && err.code === 'EEXIST') {
        throw new Error(`Agent "${agent}" already holds an active browser profile lock (${lockFile}).`);
      }
      throw err;
    }
    return async () => {
      await unlink(lockFile).catch(() => {});
    };
  }

  async function runWithGrant({ agent, commandArgs, runner }) {
    if (!agent) throw new Error('Specify --agent <name>.');
    if (!Array.isArray(commandArgs) || commandArgs.length === 0) {
      throw new Error('Specify a command after -- (e.g. zettly auth run --agent playwright -- npx playwright test).');
    }

    const current = await status();
    if (!current.browser_authenticated) {
      throw new Error(`Browser session is ${current.vault_state}; run "zettly auth login --browser".`);
    }

    const grants = await readGrants();
    const grantRecord = grants[agent];
    if (!grantRecord) {
      throw new Error(`No active grant for agent "${agent}". Run "zettly auth grant --agent ${agent}".`);
    }
    if (grantRecord.revokedAt) {
      throw new Error(`Grant for agent "${agent}" was revoked at ${grantRecord.revokedAt}.`);
    }
    if (isExpired(grantRecord.expiresAt)) {
      throw new Error(`Grant for agent "${agent}" expired at ${grantRecord.expiresAt}.`);
    }

    const vault = await readVault();
    if (!vault || vault.corrupt) {
      throw new Error('Browser vault is unavailable or corrupt.');
    }

    const releaseLock = await acquireLock(agent);
    const tempDir = await mkdtemp(join(tmpdir(), `zettly-broker-${agent}-`));
    const ephemeralStateFile = join(tempDir, 'state.json');

    try {
      await writeFile(ephemeralStateFile, JSON.stringify(vault.storageState), { encoding: 'utf8', mode: 0o600 });
      await chmod(ephemeralStateFile, 0o600).catch(() => {});
      await audit('grant_run_start', { agent, scope: grantRecord.scope });

      const execRunner = runner || defaultCommandRunner;
      const exitCode = await execRunner(commandArgs, {
        ...process.env,
        ZETTLY_BROKER_AGENT: agent,
        ZETTLY_BROKER_SCOPE: grantRecord.scope,
        ZETTLY_BROKER_ORIGIN: vault.origin,
        ZETTLY_BROKER_STORAGE_STATE: ephemeralStateFile,
      });

      await audit('grant_run_end', { agent, exitCode });
      return { exitCode };
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      await releaseLock();
    }
  }

  return {
    status,
    saveBrowserSession,
    grant,
    revoke,
    logout,
    runWithGrant,
    paths: { baseDir, vaultFile, grantsFile, auditFile, locksDir },
  };
}

function defaultCommandRunner(commandArgs, env) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = commandArgs;
    const child = spawn(cmd, args, { stdio: 'inherit', env, shell: false });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}
