import assert from 'node:assert/strict';

const storageStatePath = process.env.ZETTLY_BROKER_STORAGE_STATE;
const origin = process.env.ZETTLY_BROKER_ORIGIN;

if (!storageStatePath || !origin) {
  console.error('Must be executed via: zettly auth run --agent playwright -- node cli/scripts/playwright-verify.mjs');
  process.exit(2);
}

const pw = await import('playwright').catch(() => null);
if (!pw?.chromium) {
  console.error('Playwright package is not installed in this workspace.');
  process.exit(2);
}

const routes = ['/dashboard', '/priority', '/todos', '/notes', '/journal', '/reports', '/engineering'];
const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await pw.chromium.launch({ headless: true });
const report = { origin, viewports: {}, consoleErrors: [], pageErrors: [], serverErrors: [] };

try {
  for (const vp of viewports) {
    const context = await browser.newContext({
      storageState: storageStatePath,
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') report.consoleErrors.push(`${vp.name}: ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      report.pageErrors.push(`${vp.name}: ${err.message}`);
    });
    page.on('response', (res) => {
      if (res.status() >= 500) report.serverErrors.push(`${vp.name}: ${res.status()} ${res.url()}`);
    });

    const checked = [];
    for (const route of routes) {
      const res = await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
      const finalPath = new URL(page.url()).pathname;
      assert.ok(!finalPath.startsWith('/login'), `${vp.name} ${route} redirected to ${finalPath}`);
      assert.ok((res?.status() ?? 500) < 400, `${vp.name} ${route} returned HTTP ${res?.status()}`);
      checked.push({ route, status: res?.status(), finalPath });
    }
    report.viewports[vp.name] = checked;
    await context.close();
  }

  assert.equal(report.consoleErrors.length, 0, `Console errors: ${report.consoleErrors.join('; ')}`);
  assert.equal(report.pageErrors.length, 0, `Page errors: ${report.pageErrors.join('; ')}`);
  assert.equal(report.serverErrors.length, 0, `Server errors: ${report.serverErrors.join('; ')}`);

  console.log(JSON.stringify({ ok: true, ...report }, null, 2));
} finally {
  await browser.close();
}
