import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const mobilePackage = JSON.parse(
  readFileSync(new URL('../apps/mobile/package.json', import.meta.url), 'utf8'),
);
const entryUrl = new URL('../apps/mobile/index.js', import.meta.url);
const appIndexUrl = new URL('../apps/mobile/app/index.tsx', import.meta.url);
const trainingRouteUrl = new URL('../apps/mobile/app/training-lab.tsx', import.meta.url);

assert.equal(mobilePackage.main, 'index.js', 'mobile must use the explicit Expo Router entry');
assert.equal(existsSync(entryUrl), true, 'mobile Expo Router entry must exist');
assert.equal(existsSync(appIndexUrl), true, 'mobile root route must exist');
assert.equal(existsSync(trainingRouteUrl), true, 'mobile training route must exist');

const entry = readFileSync(entryUrl, 'utf8');
assert.match(
  entry,
  /require\.context\(['"]\.\/app['"]\)/,
  'mobile entry must bind Expo Router to apps/mobile/app explicitly',
);
assert.match(entry, /registerRootComponent\(App\)/, 'mobile entry must register the root component');

console.log('Mobile router entry guard passed.');
