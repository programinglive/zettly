import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const priorityPagePath = path.resolve('resources/js/Pages/Priority/Index.jsx');
const vuePagePath = path.resolve('resources/js/Pages/Priority/Index.vue');

test('Priority page is a native React Inertia component without Vue leftovers', () => {
  assert.equal(fs.existsSync(priorityPagePath), true, 'resources/js/Pages/Priority/Index.jsx must exist');
  assert.equal(fs.existsSync(vuePagePath), false, 'Obsolete Vue file Index.vue must be removed');

  const source = fs.readFileSync(priorityPagePath, 'utf8');
  assert.match(source, /from '@inertiajs\/react'/);
  assert.match(source, /DashboardLayout/);
  assert.match(source, /P0 Critical/);
  assert.match(source, /Main Work/);
  assert.match(source, /Blocked by/);
  assert.match(source, /\/priority\/plan\/items/);
  assert.match(source, /\/priority\/explain\//);
  assert.doesNotMatch(source, /\.sort\(/, 'Priority UI must never perform client-side ranking');
});
