import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, sep, extname } from 'node:path';

const executablePath = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(path => path && existsSync(path));
if (!executablePath) throw new Error('No installed Chromium browser found; set BROWSER_PATH.');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const out = process.env.CHECK_OUT || '.browser-check';
const browser = await chromium.launch({ executablePath, headless: true });
const checks = [];
const errors = [];
const record = (name) => { checks.push(name); console.log(`PASS ${name}`); };
const expectText = async (page, selector, text) => assert.match(await page.locator(selector).innerText(), text);
await mkdir(out, { recursive: true });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(baseURL);
  await page.locator('#currentLevel').selectOption('0');
  await page.locator('#targetLevel').selectOption('1');
  await page.locator('#coins').fill('700');
  assert.equal(await page.locator('#manualNormal').inputValue(), '7');
  await expectText(page, '#gain', /^21 点$/);
  await expectText(page, '#result-status', /按基础经验达到/);
  assert.equal(await page.locator('#gap-fill').evaluate(node => node.style.width), '0%');
  await page.locator('#coins').fill('600');
  await expectText(page, '#gain', /^18 点$/);
  assert.equal(await page.locator('#gap-fill').evaluate(node => node.style.width), '1%');
  assert.equal(await page.locator('#gap-fill').evaluate(node => node.style.left), '9%');
  await page.locator('#coins').fill('700');
  await page.locator('#ownedNormal').fill('2');
  await expectText(page, '#cost', /^500 金币$/);
  await expectText(page, '#normal-used', /^2$/);
  record('auto target, existing packs free and new purchases charged');
  record('lower target gap segment stops at target, not end of full scale');

  await page.getByRole('button', { name: '手动配比', exact: true }).click();
  await page.locator('#manualNormal').fill('3');
  await page.getByRole('button', { name: '增加普通包', exact: true }).click();
  assert.equal(await page.locator('#manualNormal').inputValue(), '4');
  assert.equal(await page.locator('#manualNormal-range').inputValue(), '4');
  await page.getByRole('button', { name: '减少普通包', exact: true }).click();
  await page.locator('#manualNormal-range').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#manualNormal').inputValue(), '4');
  record('manual stepper, direct numeric edit and range keyboard sync');

  await page.getByRole('button', { name: '自动推荐', exact: true }).click();
  assert.equal(await page.locator('#manualNormal').inputValue(), '7');
  await page.getByRole('button', { name: '手动配比', exact: true }).click();
  assert.equal(await page.locator('#manualNormal').inputValue(), '4');
  await page.reload();
  assert.equal(await page.locator('#manualNormal').inputValue(), '4');
  assert.equal(await page.locator('#coins').inputValue(), '700');
  record('mode switching preserves manual draft; reload restores it');

  await page.locator('#manualNormal').fill('20');
  await expectText(page, '#result-status', /超出预算.*不可执行/);
  await expectText(page, '#balance-label', /预算差额/);
  await page.locator('#manualNormal').fill('-1');
  await expectText(page, '#global-error', /整数/);
  assert.equal(await page.locator('#manualNormal').getAttribute('aria-invalid'), 'true');
  await page.locator('#manualNormal').fill('1.5');
  await expectText(page, '#result-status', /输入有误/);
  assert.equal(await page.locator('#gain').innerText(), '-');
  await page.locator('#manualNormal').fill('');
  await expectText(page, '#global-error', /不能为空/);
  await page.locator('#manualNormal').fill('4');
  record('manual over-budget and invalid resources never show an executable plan');

  await page.locator('#progress').fill('');
  await page.locator('#progress').pressSequentially('0.8');
  assert.equal(await page.locator('#progress-range').inputValue(), '0.8');
  await expectText(page, '#required-label', /19.2/);
  await page.locator('#progress-range').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#progress').inputValue(), '0.801');
  await page.locator('#progress').fill('20.001');
  await expectText(page, '#global-error', /当前进度/);
  await page.locator('#progress').fill('0');
  record('fractional progress and range sync, stage upper limit enforced');

  await page.getByRole('button', { name: '自动推荐', exact: true }).click();
  await page.locator('#scenario').selectOption('full');
  await expectText(page, '#result-status', /期望.*非保底/);
  await expectText(page, '#result-basis', /期望.*非保底/);
  await expectText(page, '#scenario-note', /口径待核/);
  await page.locator('#apply').click();
  assert.equal(await page.locator('[data-mode="manual"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#manualNormal').inputValue(), '2');
  record('full-collection expectation wording; explicit apply recommendation to draft');

  await page.locator('#reset').click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(await page.locator('#coins').inputValue(), '700');
  await page.locator('#reset').click();
  await page.getByRole('button', { name: '确认清空', exact: true }).click();
  assert.equal(await page.locator('#coins').inputValue(), '0');
  assert.equal(await page.locator('#currentLevel').inputValue(), '2');
  await page.reload();
  assert.equal(await page.locator('#coins').inputValue(), '0');
  record('reset cancel preserves data; confirm resets persisted inputs');

  await page.locator('#currentLevel').selectOption('4');
  await expectText(page, '#result-status', /无需新增/);
  assert.equal(await page.locator('#progress').isDisabled(), true);
  await page.locator('#currentLevel').selectOption('2');
  await page.locator('#targetLevel').selectOption('1');
  await expectText(page, '#required-label', /还需 0/);
  record('max tier and already reached target consistent zero demand');

  await page.locator('#coins').fill('2000');
  await page.locator('#targetLevel').selectOption('4');
  await page.locator('#ownedNormal').fill('5');
  await page.locator('#ownedOfficer').fill('1');
  await page.locator('#progress').fill('12.4');
  await page.locator('#scenario').selectOption('full');
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('14px "Geist Variable"', 'KARDS0123456789')), true);
  const fontLoaded = await page.evaluate(() => [...document.fonts].some(font => font.family.includes('Geist') && font.status === 'loaded'));
  assert.ok(fontLoaded);
  assert.ok(await page.locator('svg.lucide').count() >= 5);
  assert.equal(await page.locator('#reset svg').count(), 1);
  assert.equal(await page.locator('#apply svg').count(), 1);
  assert.ok(await page.evaluate(() => [...document.fonts].some(font => font.family.includes('Oswald') && font.status === 'loaded')));
  assert.equal(await page.locator('.wordmark').evaluate(img => img.complete && img.naturalWidth > 0), true);
  record('local Geist font and lucide assets actually rendered');

  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      badImages: [...document.images].filter(img => !img.complete || !img.naturalWidth).length,
      focusStyle: getComputedStyle(document.querySelector('button')).outlineStyle,
    }));
    assert.equal(metrics.overflow, false, `horizontal overflow at ${width}`);
    assert.equal(metrics.badImages, 0);
    await page.screenshot({ path: `${out}/viewport-${width}.png`, fullPage: true });
  }
  await page.locator('#coins').focus();
  await page.keyboard.press('Tab');
  assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), 'BODY');
  const focus = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    const parent = getComputedStyle(document.activeElement.parentElement);
    return style.outlineStyle !== 'none' || parent.outlineStyle !== 'none';
  });
  assert.ok(focus);
  record('1440/768/390 no horizontal overflow; keyboard focus visible');

  const corruptContext = await browser.newContext();
  await corruptContext.addInitScript(() => localStorage.setItem('kards-supply-planner:v1', '{broken'));
  const corrupt = await corruptContext.newPage();
  await corrupt.goto(baseURL);
  await expectText(corrupt, '#storage-warning', /无法读取/);
  await corrupt.locator('#coins').fill('700');
  await expectText(corrupt, '#result-status', /预算无法/);
  await corruptContext.close();

  const blockedContext = await browser.newContext();
  await blockedContext.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('storage disabled'); };
    Storage.prototype.setItem = () => { throw new Error('storage disabled'); };
  });
  const blocked = await blockedContext.newPage();
  await blocked.goto(baseURL);
  await blocked.locator('#currentLevel').selectOption('0');
  await blocked.locator('#targetLevel').selectOption('1');
  await blocked.locator('#coins').fill('700');
  await expectText(blocked, '#result-status', /按基础经验达到/);
  await expectText(blocked, '#storage-warning', /保存不可用/);
  await blockedContext.close();
  record('corrupt and disabled storage still permit calculation');

  const buildRoot = resolve('dist');
  const prefix = '/Kards_Supply_Crate_Calculator/';
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (!pathname.startsWith(prefix)) throw new Error('outside test mount');
      const path = resolve(buildRoot, pathname.slice(prefix.length) || 'index.html');
      if (!path.startsWith(buildRoot + sep)) throw new Error('outside build');
      const content = await readFile(path);
      response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const built = await context.newPage();
    built.on('pageerror', error => errors.push(error.message));
    built.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await built.goto(`http://127.0.0.1:${server.address().port}${prefix}`);
    assert.equal(await built.locator('h1').innerText(), '军需箱资源规划');
    await built.locator('#currentLevel').selectOption('0');
    await built.locator('#targetLevel').selectOption('1');
    await built.locator('#coins').fill('700');
    await expectText(built, '#gain', /^21 点$/);
    await built.evaluate(() => document.fonts.ready);
    assert.ok(await built.evaluate(() => [...document.fonts].some(font => font.family.includes('Geist') && font.status === 'loaded')));
    await built.close();
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
  record('production build works under repository subpath with local fonts');
  assert.deepEqual(errors, []);
  record('no browser console errors or uncaught exceptions');
  await writeFile(`${out}/report.json`, JSON.stringify({ baseURL, executablePath, checks, errors, imagery: 'Official KARDS logo and non-gameplay desk/paper textures only. Gameplay screenshots and derived crops are retained as references but are not rendered. Local preview only; community license terms not fully verified.' }, null, 2));
  await context.close();
  console.log(`Browser checks passed: ${checks.length}; screenshots ${out}/viewport-{1440,768,390}.png`);
} finally {
  await browser.close();
}
