import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const browserPath = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
const out = process.env.ART_OUT || '.browser-check/kards-art-pass1';
const widths = (process.env.ART_WIDTHS || '1440,390').split(',').map(Number);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: browserPath, headless: true });
try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 960 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173/');
    await page.evaluate(() => document.fonts.ready);
    const gameplayReferences = await page.evaluate(() => [...document.querySelectorAll('*')].filter(node => {
      const source = (node.getAttribute('src') || '') + getComputedStyle(node).backgroundImage;
      return /gameplay|cards-reference|9b6e443/i.test(source);
    }).length);
    assert.equal(gameplayReferences, 0, 'Gameplay references must not be rendered in the product.');
    assert.equal(await page.locator('.wordmark').evaluate(img => img.complete && img.naturalWidth > 0), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${out}/default-${width}.png`, fullPage: true });
    await page.locator('#coins').fill('5000');
    await page.locator('#ownedNormal').fill('5');
    await page.locator('#ownedOfficer').fill('1');
    await page.locator('#progress').fill('12.4');
    assert.match(await page.locator('#result-status').innerText(), /按基础经验达到/);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${out}/reachable-${width}.png`, fullPage: true });
    console.log(`${out}/default-${width}.png`);
    console.log(`${out}/reachable-${width}.png`);
    await context.close();
  }
} finally {
  await browser.close();
}
