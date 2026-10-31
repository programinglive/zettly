import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { homedir, platform } from 'node:os';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const homeConfig = join(homedir(), '.zettly', 'config.json');
const vaultPath = join(homedir(), '.zettly', 'token.dpapi');
const groups = {
  todos: ['todos', 'todo'], notes: ['todos', 'note'], tags: ['tags'], focus: ['focus'],
  habits: ['habits'], organizations: ['organizations'], drawings: ['drawings'],
  attachments: ['attachments'], graph: ['graph'], push: ['push'], profile: ['profile'],
  system: ['system'],
};

async function config() {
  try { return JSON.parse(await readFile(homeConfig, 'utf8')); }
  catch { return { host: 'https://zettly.programinglive.com' }; }
}

function powershell(script, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true });
    let stdout = ''; let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (part) => { stdout += part; });
    child.stderr.setEncoding('utf8').on('data', (part) => { stderr += part; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `PowerShell exited ${code}`)));
    child.stdin.end(input);
  });
}

async function token() {
  if (process.env.ZETTLY_API_TOKEN) return process.env.ZETTLY_API_TOKEN;
  if (platform() !== 'win32') return '';
  try {
    return await powershell(`$s=Get-Content -Raw -LiteralPath '${vaultPath.replaceAll("'", "''")}' | ConvertTo-SecureString; $p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try {[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}`);
  } catch { return ''; }
}

async function saveToken(value) {
  if (platform() !== 'win32') throw new Error('Secure token storage is currently supported on Windows. Set ZETTLY_API_TOKEN on other systems.');
  const safePath = vaultPath.replaceAll("'", "''");
  await mkdir(dirname(vaultPath), { recursive: true });
  await powershell(`$t=[Console]::In.ReadToEnd(); $s=ConvertTo-SecureString $t -AsPlainText -Force; $e=ConvertFrom-SecureString $s; [IO.File]::WriteAllText('${safePath}',$e)`, value);
}

function parse(argv) {
  const positionals = []; const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=', 2);
      if (inline !== undefined) flags[key] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[key] = argv[++i];
      else flags[key] = true;
    } else positionals.push(arg);
  }
  return { positionals, flags };
}

function print(value, json) {
  if (json || typeof value !== 'object' || value === null) {
    console.log(json ? JSON.stringify(value, null, 2) : String(value ?? ''));
    return;
  }
  const rows = Array.isArray(value) ? value : (value.data && Array.isArray(value.data) ? value.data : null);
  if (!rows?.length || typeof rows[0] !== 'object') { console.log(JSON.stringify(value, null, 2)); return; }
  const columns = Object.keys(rows[0]).filter((key) => !['document', 'pivot'].includes(key)).slice(0, 8);
  const widths = columns.map((column) => Math.min(34, Math.max(column.length, ...rows.map((row) => String(row[column] ?? '').slice(0, 34).length))));
  console.log(columns.map((column, index) => column.padEnd(widths[index])).join('  '));
  console.log(columns.map((_, index) => '-'.repeat(widths[index])).join('  '));
  for (const row of rows) console.log(columns.map((column, index) => String(row[column] ?? '').replaceAll('\n', ' ').slice(0, widths[index]).padEnd(widths[index])).join('  '));
}

async function api(path, method, body, flags) {
  const cfg = await config(); const secret = await token();
  if (!secret) throw new Error('Not authenticated. Run `zettly auth login` or set ZETTLY_API_TOKEN.');
  const url = new URL(`/api/v1/${path.replace(/^\//, '')}`, cfg.host);
  if (method === 'GET') {
    for (const [key, value] of Object.entries(flags)) {
      if (!['json', 'yes', 'no-interaction', 'file', 'data', 'token'].includes(key)) url.searchParams.set(key.replaceAll('_', '-'), value === true ? '1' : value);
    }
  }
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (response.redirected) throw new Error(`API redirected to ${new URL(response.url).pathname}; this endpoint did not return a CLI response.`);
  const text = await response.text(); let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) { const err = new Error(data?.message || `${response.status} ${response.statusText}`); err.exitCode = response.status === 401 ? 2 : 1; throw err; }
  if (text && !response.headers.get('content-type')?.includes('application/json')) throw new Error('API returned a non-JSON response; the action was not reported as successful.');
  return data;
}

async function uploadAttachment(todoId, filePath, flags) {
  if (!filePath) throw new Error('Use --file <path>');
  const cfg = await config(); const secret = await token();
  if (!secret) throw new Error('Not authenticated. Run `zettly auth login` or set ZETTLY_API_TOKEN.');
  const bytes = await readFile(filePath); const form = new FormData();
  form.append('file', new Blob([bytes]), basename(filePath));
  const response = await fetch(new URL(`/api/v1/todos/${todoId}/attachments`, cfg.host), { method: 'POST', headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' }, body: form });
  if (response.redirected) throw new Error(`Upload was redirected to ${new URL(response.url).pathname}.`);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `${response.status} ${response.statusText}`);
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Upload endpoint returned a non-JSON response.');
  print(data, flags.json);
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try { return await rl.question(question); } finally { rl.close(); }
}

async function askSecret(question) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) return ask(question);
  process.stderr.write(question);
  process.stdin.setEncoding('utf8'); process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stderr.write('\n');
      error ? reject(error) : resolve(value);
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\u0003') return finish(new Error('Cancelled'));
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function confirmAction(flags, question) {
  if (flags.yes) return true;
  if (flags['no-interaction']) throw new Error('Use --yes to confirm this operation in non-interactive mode.');
  const answer = await ask(`${question} [y/N] `);
  return ['y', 'yes'].includes(answer.toLowerCase());
}

function help() {
  console.log(`Zettly CLI\n\nUsage: zettly <command> [resource] [id] [options]\n\nCommands:\n  auth login|issue-token|logout|status  Manage CLI credentials\n  config set-host <url>                Set Zettly server URL\n  whoami                              Show the authenticated profile\n  <group> list|show|create|update|delete|action\n                                      todos, notes, tags, focus, habits,\n                                      organizations, drawings, attachments, graph, push, profile, system\n\nOptions: --json, --yes, --file <path>, --key value\nCreate/update payloads use --file JSON or --data JSON.\nSet ZETTLY_API_TOKEN for automation. Destructive actions prompt unless --yes.`);
}

export async function run(argv) {
  const { positionals, flags } = parse(argv); const [command, sub = 'list', id, ...rest] = positionals;
  if (!command || command === 'help' || flags.help) return help();
  if (command === 'config' && sub === 'set-host') {
    if (!id) throw new Error('Usage: zettly config set-host <url>');
    const host = new URL(id).origin; await mkdir(dirname(homeConfig), { recursive: true }); await writeFile(homeConfig, JSON.stringify({ ...(await config()), host }, null, 2)); print(`Host set to ${host}`, flags.json); return;
  }
  if (command === 'auth') {
    if (sub === 'login') { const value = process.env.ZETTLY_API_TOKEN || await askSecret('Personal access token: '); if (!value) throw new Error('Token is required'); await saveToken(value.trim()); print('Token stored securely.', flags.json); return; }
    if (sub === 'logout') { if (platform() === 'win32') { const { unlink } = await import('node:fs/promises'); await unlink(vaultPath).catch(() => {}); } print('Stored token removed.', flags.json); return; }
    if (sub === 'status') { print({ authenticated: Boolean(await token()), host: (await config()).host }, flags.json); return; }
    if (sub === 'issue-token') {
      const result = await api('auth/token', 'POST', { name: flags.name || 'zettly-cli' }, flags);
      await saveToken(result.token); print({ id: result.id, name: result.name, abilities: result.abilities, stored_securely: true }, flags.json); return;
    }
  }
  if (command === 'whoami') { print(await api('user', 'GET', null, flags), flags.json); return; }
  if (command === 'system' && sub === 'status') { print(await api('system/status', 'GET', null, flags), flags.json); return; }
  if (command === 'attachments' && sub === 'upload') { await uploadAttachment(id, flags.file, flags); return; }
  if (command === 'attachments' && sub === 'download') {
    if (!flags.file) throw new Error('Use --file <output-path>');
    const cfg = await config(); const secret = await token(); if (!secret) throw new Error('Not authenticated.');
    const response = await fetch(new URL(`/api/v1/attachments/${id}/download`, cfg.host), { headers: { Authorization: `Bearer ${secret}` } });
    if (response.redirected) throw new Error(`Download was redirected to ${new URL(response.url).pathname}.`);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    await writeFile(flags.file, Buffer.from(await response.arrayBuffer())); print(`Downloaded ${flags.file}`, flags.json); return;
  }
  if (command === 'push' && sub === 'test') { print(await api('push/test', 'POST', {}, flags), flags.json); return; }
  if (command === 'focus' && sub === 'current') { print(await api('focus/current', 'GET', null, flags), flags.json); return; }
  if (command === 'habits' && sub === 'stats') { print(await api(`habits/${id}/stats`, 'GET', null, flags), flags.json); return; }
  if (command === 'todos' && ['archived', 'completed', 'deleted'].includes(sub)) {
    if (sub === 'archived') flags.archived = true;
    if (sub === 'completed') flags.filter = 'completed';
    if (sub === 'deleted') flags.trashed = 'only';
    print(await api('todos', 'GET', null, flags), flags.json); return;
  }
  if (command === 'tags' && sub === 'search') { print(await api('tags/search', 'GET', null, flags), flags.json); return; }
  if (command === 'push' && sub === 'subscribe') { print(await api('push-subscriptions', 'POST', flags.data ? JSON.parse(flags.data) : flags, flags), flags.json); return; }
  if (command === 'push' && sub === 'unsubscribe') {
    if (!await confirmAction(flags, 'Remove this push subscription?')) return;
    print(await api('push-subscriptions', 'DELETE', flags.data ? JSON.parse(flags.data) : { endpoint: flags.endpoint }, flags), flags.json); return;
  }
  if (command === 'graph' && sub === 'export') {
    const result = await api('graph/export', 'GET', null, flags);
    if (flags.file) { await writeFile(flags.file, JSON.stringify(result.data ?? result, null, 2)); print(`Exported ${flags.file}`, flags.json); }
    else print(result, flags.json); return;
  }
  if (command === 'graph' && sub === 'rebuild') {
    if (!await confirmAction(flags, 'Rebuild the shared graph for all users?')) return;
    print(await api('graph/rebuild', 'POST', {}, flags), flags.json); return;
  }
  if (command === 'push' && sub === 'status') { print(await api('push-subscriptions', 'GET', null, flags), flags.json); return; }
  if (command === 'system' && sub === 'test-email') {
    if (!await confirmAction(flags, `Send test email to ${flags.recipient || 'configured account'}?`)) return;
    const body = flags.data ? JSON.parse(flags.data) : flags.file ? JSON.parse(await readFile(flags.file, 'utf8')) : Object.fromEntries(['recipient', 'subject', 'message'].filter((key) => flags[key] !== undefined).map((key) => [key, flags[key]]));
    print(await api('admin/email-test', 'POST', body, flags), flags.json); return;
  }
  if (command === 'profile' && sub === 'token-revoke') {
    if (!await confirmAction(flags, `Revoke API token ${id}?`)) return;
    print(await api(`profile/tokens/${id}`, 'DELETE', null, flags), flags.json); return;
  }
  if (command === 'profile' && sub === 'tokens') { print(await api('profile', 'GET', null, flags), flags.json); return; }
  if (command === 'profile' && sub === 'delete') {
    if (!await confirmAction(flags, 'Permanently delete this Zettly account?')) return;
    const password = await askSecret('Current password: '); print(await api('profile', 'DELETE', { password }, flags), flags.json); return;
  }
  if (command === 'profile' && sub === 'update') {
    const body = flags.data ? JSON.parse(flags.data) : flags.file ? JSON.parse(await readFile(flags.file, 'utf8')) : Object.fromEntries(Object.entries(flags).filter(([key]) => !['json', 'yes', 'no-interaction', 'file'].includes(key)).map(([key, value]) => [key.replaceAll('-', '_'), value]));
    print(await api('profile', 'PATCH', body, flags), flags.json); return;
  }
  if (command === 'system' && sub === 'monitor') { print(await api('admin/system-monitor', 'GET', null, flags), flags.json); return; }
  if (!groups[command]) throw new Error(`Unknown command: ${command}. Run zettly help.`);
  let [base] = groups[command];
  if (command === 'notes') flags.type = 'note';
  if (command === 'profile') { print(await api('user', 'GET', null, flags), flags.json); return; }
  if (sub === 'export' && command === 'drawings') {
    const data = await api(`${base}/${id}`, 'GET', null, flags); const doc = data.drawing ?? data;
    const output = flags.file || `${doc.title || id}.json`; await writeFile(output, JSON.stringify(doc, null, 2)); print(`Exported ${output}`, flags.json); return;
  }
  if (sub === 'import' && command === 'drawings') {
    if (!flags.file) throw new Error('Use --file <drawing.json>');
    const payload = JSON.parse(await readFile(flags.file, 'utf8')); print(await api(base, 'POST', payload, flags), flags.json); return;
  }
  const actions = { list: ['GET', base], show: ['GET', `${base}/${id}`], create: ['POST', base], update: ['PATCH', `${base}/${id}`], delete: ['DELETE', `${base}/${id}`] };
  let [method, path] = actions[sub] || ['POST', `${base}/${id}/${sub}`];
  if (command === 'todos' && sub === 'complete') { method = 'PATCH'; path = `todos/${id}/toggle`; }
  if (command === 'todos' && sub === 'priority') path = `todos/${id}/update-priority`;
  if (command === 'todos' && sub === 'eisenhower') path = `todos/${id}/update-eisenhower`;
  if (command === 'todos' && sub === 'checklist-toggle') { method = 'PATCH'; path = `todos/${id}/checklist/${rest[0]}/toggle`; }
  if (command === 'tags' && sub === 'restore') path = `tags/${id}/restore`;
  if (command === 'todos' && sub === 'archive-completed') path = 'todos/archive-completed';
  if (command === 'todos' && sub === 'reorder') path = 'todos/reorder';
  if (command === 'organizations' && sub === 'member-role') { method = 'PATCH'; path = `organizations/${id}/members/${rest[0]}/role`; }
  if (command === 'organizations' && sub === 'member-remove') { method = 'DELETE'; path = `organizations/${id}/members/${rest[0]}`; }
  if (['delete', 'archive', 'restore', 'leave', 'rebuild', 'test-email', 'member-remove'].includes(sub)
    && !await confirmAction(flags, `Confirm ${sub} ${command}${id ? ` ${id}` : ''}?`)) return;
  let body;
  if (['create', 'update'].includes(sub) || !actions[sub]) {
    if (flags.data) body = JSON.parse(flags.data);
    else if (flags.file) body = JSON.parse(await readFile(flags.file, 'utf8'));
    else { body = {}; for (const [key, value] of Object.entries(flags)) if (!['json', 'yes', 'no-interaction', 'file'].includes(key)) body[key.replaceAll('-', '_')] = value === true ? true : value; }
    if (command === 'notes' && ['create', 'update'].includes(sub)) body.type = 'note';
  }
  if (id && !['list', 'create'].includes(sub)) path = path.replace(/undefined$/, id);
  print(await api(path, method, body, flags), flags.json);
}
