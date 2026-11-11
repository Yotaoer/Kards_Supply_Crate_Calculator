import { chromium } from 'playwright-core';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import assert from 'node:assert/strict';

const config = JSON.parse(await readFile('capacitor.config.json', 'utf8'));
assert.equal(config.appId, 'com.yotaoer.kardssupply');
assert.equal(config.webDir, 'dist-android');
assert.equal(config.server?.url, undefined);
const out = process.env.ANDROID_CHECK_OUT || '.browser-check/android-offline';
await mkdir(out, { recursive: true });
const root = resolve('dist-android');
const origin = 'https://offline-planner.example.test';
const networkAttempts = [];
const errors = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.txt': 'text/plain' };
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true,
});
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 960 } });
  await context.setOffline(true);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      networkAttempts.push(url.href);
      return route.abort();
    }
    const path = resolve(root, url.pathname.slice(1) || 'index.html');
    assert.ok(path.startsWith(root + sep));
    try {
      await route.fulfill({ body: await readFile(path), contentType: mime[extname(path)] || 'application/octet-stream' });
    } catch { await route.fulfill({ status: 404, body: '' }); }
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  assert.equal(await page.locator('#apk-download').count(), 0);
  assert.doesNotMatch(await page.locator('body').innerText(), /仅模拟|本次为模拟方案|资产不会自动扣减|官方素材仅供本地样板审查/);
  assert.equal(await page.evaluate(() => navigator.onLine), false);
  assert.equal(await page.locator('#page-view-status').innerText(), '离线版不统计');
  assert.equal(await page.locator('#page-view-script').count(), 0);
  await page.locator('#currentLevel').selectOption('0');
  await page.locator('#targetLevel').selectOption('1');
  await page.locator('#coins').fill('699');
  assert.equal(await page.locator('#minimum-cost').innerText(), '700 金币');
  assert.equal(await page.locator('#coin-shortfall').innerText(), '1 金币');
  await page.locator('#ownedNormal').fill('7');
  await page.locator('#coins').fill('0');
  assert.equal(await page.locator('#cost').innerText(), '0 金币');
  await page.getByRole('button', { name: '手动配比', exact: true }).click();
  await page.locator('#manualNormal').fill('4');
  await page.getByRole('button', { name: '增加普通包', exact: true }).click();
  assert.equal(await page.locator('#manualNormal').inputValue(), '5');
  await page.getByRole('button', { name: '自动推荐', exact: true }).click();
  await page.getByRole('button', { name: '手动配比', exact: true }).click();
  assert.equal(await page.locator('#manualNormal').inputValue(), '5');
  await page.locator('#progress').fill('0.8');
  await page.reload();
  assert.equal(await page.locator('#progress').inputValue(), '0.8');
  assert.equal(await page.locator('#manualNormal').inputValue(), '5');
  assert.equal(await page.locator('#ownedNormal').inputValue(), '7');
  assert.equal(await page.locator('#page-view-status').innerText(), '离线版不统计');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await page.locator('#copy-qq').click();
  assert.match(await page.locator('#copy-status').innerText(), /未能复制.*手动复制/);
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => [...document.fonts].some(font => font.family.includes('Oswald') && font.status === 'loaded')));
  assert.ok(await page.locator('.wordmark').evaluate(img => img.complete && img.naturalWidth > 0));
  assert.deepEqual(networkAttempts, []);
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${out}/offline-browser-390.png`, fullPage: true });
  await writeFile(`${out}/report.json`, JSON.stringify({
    scope: 'Browser offline emulation, native production build supplied from local files by request interception; not Android runtime testing.',
    offline: true, networkAttempts, errors,
    checks: ['first launch offline', 'funding700/shortfall1', 'owned packs free', 'manual draft preserved', 'fractional progress and local restore', 'native statistics disabled', 'clipboard honest fallback', 'bundled logo and fonts', 'no horizontal overflow'],
  }, null, 2));
  console.log('Offline browser checks passed: 9 groups; zero external requests. This is not Android device/emulator acceptance.');
  await context.close();
} finally {
  await browser.close();
}
