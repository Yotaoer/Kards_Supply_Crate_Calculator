import { chromium } from 'playwright-core';
import { readFile, mkdir } from 'node:fs/promises';

const logo = (await readFile('public/assets/kards/logo.svg')).toString('base64');
const logoURL = ['data', 'image/svg+xml;base64,'].join(':') + logo;
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true,
});
try {
  const page = await browser.newPage();
  for (const [density, size, foreground] of [
    ['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216],
    ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432],
  ]) {
    const dir = `android/app/src/main/res/mipmap-${density}`;
    await mkdir(dir, { recursive: true });
    for (const kind of ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground']) {
      const side = kind === 'ic_launcher_foreground' ? foreground : size;
      await page.setViewportSize({ width: side, height: side });
      await page.setContent(`<html><body style="margin:0;width:${side}px;height:${side}px;display:grid;place-items:center;overflow:hidden;${kind === 'ic_launcher_foreground' ? '' : 'background:#30372a;'}${kind === 'ic_launcher_round' ? 'border-radius:50%;' : ''}"><img alt="" src="${logoURL}" style="width:64%;height:64%;object-fit:contain"></body></html>`);
      await page.locator('img').evaluate(img => img.decode());
      await page.screenshot({ path: `${dir}/${kind}.png`, omitBackground: true });
    }
  }
  console.log('Generated launcher density assets from the existing project logo.');
} finally {
  await browser.close();
}
