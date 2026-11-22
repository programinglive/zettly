import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const source = readFileSync(join(__dirname, '..', 'Layouts', 'AppLayout.jsx'), 'utf8');

function arrayBlock(name) {
  const match = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n    \\];`));
  return match ? match[1] : '';
}

test('primary navigation leads with Summary above Today in the agreed order', () => {
  const block = arrayBlock('primaryNavigation');
  const hrefs = [...block.matchAll(/href:\s*'([^']+)'/g)].map((match) => match[1]);
  assert.deepEqual(hrefs, [
    '/summary', '/dashboard', '/todos', '/notes', '/journal', '/reports', '/profile',
  ]);
});

test('Settings primary entry points at the existing profile route', () => {
  const block = arrayBlock('primaryNavigation');
  assert.match(block, /href:\s*'\/profile',\s*\n\s*label:\s*'Settings',/);
});

test('every legacy destination remains reachable from the layout', () => {
  const legacy = [
    '/todos/board', '/draw', '/habits', '/graph', '/manage/tags',
    '/agent/jobs', '/agent/setup', '/admin/system-monitor',
    '/organizations', '/profile',
  ];
  for (const href of legacy) {
    assert.ok(source.includes(`'${href}'`), `Expected legacy destination ${href} to remain reachable.`);
  }
});

test('secondary, developer and admin navigation arrays are present', () => {
  assert.ok(arrayBlock('secondaryNavigation').includes('/todos/board'));
  assert.ok(arrayBlock('secondaryNavigation').includes('/draw'));
  assert.ok(arrayBlock('secondaryNavigation').includes('/habits'));
  assert.ok(arrayBlock('secondaryNavigation').includes('/graph'));
  assert.ok(arrayBlock('secondaryNavigation').includes('/manage/tags'));
  assert.ok(source.includes('developerNavigation'));
  assert.ok(source.includes('adminNavigation'));
});

test('desktop sidebar and mobile drawer both render from the same primary array', () => {
  assert.equal(
    (source.match(/primaryNavigation\.map\(/g) || []).length,
    2,
    'Both the desktop sidebar and the mobile drawer must map primaryNavigation.',
  );
});

test('owner and super-admin gating is preserved', () => {
  assert.match(source, /if \(canUseCodingAgent\)/);
  assert.match(source, /if \(canProvisionCodingAgent && !canUseCodingAgent\)/);
  assert.match(source, /if \(isSuperAdmin\)/);
});
