import { cp, mkdir, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const assets = [
  'assets/kards/logo.svg', 'assets/kards/desk.jpg', 'assets/kards/paper.png',
  'licenses/geist-OFL.txt', 'licenses/lucide-LICENSE.txt', 'licenses/oswald-OFL.txt',
  'licenses/capacitor-core-MIT.txt', 'licenses/capacitor-android-MIT.txt',
];
await mkdir('.android-local/web-public', { recursive: true });
for (const asset of assets) {
  const target = `.android-local/web-public/${asset}`;
  await mkdir(target.slice(0, target.lastIndexOf('/')), { recursive: true });
  await cp(`public/${asset}`, target);
}
const result = spawnSync(process.execPath, [
  'node_modules/vite/bin/vite.js', 'build', '--mode', 'android', '--outDir', 'dist-android',
], { stdio: 'inherit' });
assert.equal(result.status, 0, 'Android web build failed');
async function check(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    assert.ok(!/gameplay|cards-reference|\.browser-check|main\.ts$/i.test(entry.name), `Unwanted packaged asset: ${entry.name}`);
    if (entry.isDirectory()) await check(`${path}/${entry.name}`);
  }
}
await check('dist-android');
console.log('Offline Android web assets built; only selected runtime public assets included.');
