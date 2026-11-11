import { chromium } from 'playwright-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const out = process.env.ADDITIONS_OUT || '.browser-check/coin-links';
await mkdir(out, { recursive: true });
const checks = [];
const record = name => { checks.push(name); console.log(`PASS ${name}`); };
const text = (page, id) => page.locator(`#${id}`).innerText();
const matches = async (page, id, regex) => assert.match(await text(page, id), regex);
const pageErrors = [];
const origin = 'https://planner.example.test';
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};

async function productionMock(mode) {
  const context = await browser.newContext();
  const root = resolve('dist');
  await context.route(`${origin}/**`, async route => {
    try {
      const path = resolve(root, new URL(route.request().url()).pathname.slice(1) || 'index.html');
      assert.ok(path.startsWith(root + sep));
      await route.fulfill({ body: await readFile(path), contentType: mime[extname(path)] || 'application/octet-stream' });
    } catch { await route.fulfill({ status: 404, body: '' }); }
  });
  let requests = 0;
  await context.route('https://busuanzi.ibruce.info/**', async route => {
    requests++;
    if (mode === 'failure') return route.abort();
    await route.fulfill({
      contentType: 'text/javascript',
      body: mode === 'success'
        ? 'document.getElementById("busuanzi_value_page_pv").textContent = "12345"; const container = document.getElementById("busuanzi_container_page_pv"); if (container) container.style.display = "inline";'
        : '/* provider did not return a count */',
    });
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  if (mode === 'timeout') await page.clock.install();
  await page.goto(origin);
  await page.locator('#page-view-script').waitFor({ state: 'attached' });
  return { context, page, requests: () => requests };
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async value => { window.__copiedGroup = value; } },
  }));
  const page = await context.newPage();
  let realStatRequests = 0;
  page.on('request', request => { if (request.url().includes('busuanzi')) realStatRequests++; });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('#currentLevel').selectOption('0');
  await page.locator('#targetLevel').selectOption('1');
  await page.locator('#coins').fill('699');
  await matches(page, 'minimum-cost', /^700 金币$/);
  await matches(page, 'coin-shortfall', /^1 金币$/);
  await matches(page, 'cost', /^600 金币$/);
  await page.locator('#coins').fill('700');
  await matches(page, 'coin-shortfall', /^0 金币$/);
  await page.locator('#ownedNormal').fill('7');
  await matches(page, 'minimum-cost', /^0 金币$/);
  await page.locator('#ownedNormal').fill('0');
  await page.locator('#progress').fill('14');
  await page.locator('#strategy').selectOption('packs');
  await matches(page, 'cost', /^330 金币$/);
  await matches(page, 'minimum-cost', /^200 金币$/);
  await page.getByRole('button', { name: '手动配比', exact: true }).click();
  await page.locator('#manualNormal').fill('20');
  await matches(page, 'cost', /^2,000 金币$/);
  await matches(page, 'minimum-cost', /^200 金币$/);
  await page.locator('#manualNormal').fill('1.5');
  assert.equal(await text(page, 'minimum-cost'), '-');
  assert.equal(await text(page, 'coin-shortfall'), '-');
  await page.locator('#manualNormal').fill('1');
  await page.locator('#scenario').selectOption('full');
  await matches(page, 'minimum-cost-label', /期望/);
  await matches(page, 'coin-shortfall-label', /期望/);
  await matches(page, 'result-basis', /非保底/);
  record('funding sync, independent of budget/strategy/manual draft; invalid numbers clear; expectation qualified');

  const links = {
    'project-link': 'https://github.com/Yotaoer/Kards_Supply_Crate_Calculator',
    'homepage-link': 'https://yotaoer.github.io/my-homepage/',
    'glyph-link': 'https://yotaoer.github.io/kards-glyph-workbench/',
    'glyph-source-link': 'https://github.com/Yotaoer/kards-glyph-workbench',
  };
  for (const [id, href] of Object.entries(links)) {
    const link = page.locator(`#${id}`);
    assert.equal(await link.getAttribute('href'), href);
    assert.equal(await link.getAttribute('target'), '_blank');
    assert.match(await link.getAttribute('rel'), /noopener/);
    assert.match(await link.getAttribute('rel'), /noreferrer/);
  }
  assert.equal(await page.locator('a[href*="qm.qq.com"]').count(), 0);
  await page.locator('#copy-qq').click();
  await matches(page, 'copy-status', /群号已复制/);
  assert.equal(await page.evaluate(() => window.__copiedGroup), '861577417');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async () => { throw new DOMException('Denied', 'NotAllowedError'); } },
  }));
  await page.locator('#copy-qq').click();
  await matches(page, 'copy-status', /未能复制.*手动复制/);
  assert.doesNotMatch(await text(page, 'copy-status'), /群号已复制/);
  assert.equal(await page.evaluate(() => window.getSelection().toString()), '861577417');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
  await page.locator('#copy-qq').click();
  await matches(page, 'copy-status', /未能复制.*手动复制/);
  assert.equal(await page.evaluate(() => window.getSelection().toString()), '861577417');
  record('verified hrefs, safe external anchors, QQ copy success, permission rejection and unavailable fallback');

  await matches(page, 'page-view-status', /本地预览不统计/);
  assert.equal(realStatRequests, 0);
  assert.equal(await page.locator('#page-view-script').count(), 0);
  record('localhost never loads counter or increments real analytics');

  await page.getByRole('button', { name: '自动推荐', exact: true }).click();
  await page.locator('#scenario').selectOption('base');
  await page.locator('#strategy').selectOption('coins');
  await page.locator('#progress').fill('0');
  await page.locator('#coins').fill('699');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await page.evaluate(() => { window.getSelection()?.removeAllRanges(); window.scrollTo(0, 0); });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('img[src*="gameplay"], img[src*="cards-reference"]').count(), 0);
    await page.screenshot({ path: `${out}/funding-${width}.png`, fullPage: true });
    await page.locator('footer').screenshot({ path: `${out}/footer-${width}.png` });
  }
  record('1440/390 funding and footer captured; no horizontal overflow or gameplay pictures');
  await context.close();

  const success = await productionMock('success');
  await matches(success.page, 'page-view-status', /^12,345 次$/);
  assert.equal(await success.page.locator('#busuanzi_container_page_pv').count(), 0);
  assert.equal(await success.page.locator('#analytics-source').isVisible(), false);
  assert.equal(await success.page.locator('#busuanzi_value_page_pv').isVisible(), false);
  assert.equal(await success.page.locator('#page-view-status').isVisible(), true);
  await success.page.locator('#coins').fill('1000');
  await success.page.locator('#coins').fill('1500');
  assert.equal(success.requests(), 1);
  assert.equal(await success.page.locator('#page-view-script').count(), 1);
  assert.equal(await success.page.locator('[id*="site_pv"], [id*="site_uv"]').count(), 0);
  record('production mock page_pv success; initialized once despite recalculations (not real public PV)');
  await success.context.close();

  const failure = await productionMock('failure');
  await failure.page.locator('#page-view-status').filter({ hasText: '统计暂不可用' }).waitFor();
  await failure.page.locator('#coins').fill('700');
  await matches(failure.page, 'minimum-cost', /^5,000 金币$/);
  assert.equal(failure.requests(), 1);
  record('production mock blocked analytics does not block calculation');
  await failure.context.close();

  const timeout = await productionMock('timeout');
  await timeout.page.clock.fastForward(9000);
  await matches(timeout.page, 'page-view-status', /统计暂不可用/);
  await timeout.page.evaluate(() => { document.getElementById('busuanzi_value_page_pv').textContent = '999'; });
  await matches(timeout.page, 'page-view-status', /统计暂不可用/);
  record('production mock missing count times out without fake zero or late overwrite');
  await timeout.context.close();
  assert.deepEqual(pageErrors, []);
  await writeFile(`${out}/report.json`, JSON.stringify({ checks, pageErrors, realPublicPV: 'Not verified; production tests use intercepted mock provider responses.' }, null, 2));
  console.log(`Additions checks passed: ${checks.length}`);
} finally {
  await browser.close();
}
