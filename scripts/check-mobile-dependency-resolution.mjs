import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rootPackage = readJson('../package.json');
const mobilePackage = readJson('../apps/mobile/package.json');
const mobileAppConfig = readJson('../apps/mobile/app.json');
const packageLock = readJson('../package-lock.json');

const expectedReactNativeVersion = mobilePackage.dependencies?.['react-native'];
assert.ok(expectedReactNativeVersion, 'apps/mobile must directly depend on react-native');
assert.equal(
  rootPackage.overrides?.['react-native'],
  expectedReactNativeVersion,
  'the root override must keep peer-installed React Native aligned with apps/mobile',
);

const reactNativeInstalls = Object.entries(packageLock.packages)
  .filter(([path]) => path === 'node_modules/react-native' || path.endsWith('/node_modules/react-native'))
  .map(([path, packageEntry]) => ({ path, version: packageEntry.version }));

assert.deepEqual(
  reactNativeInstalls,
  [{ path: 'node_modules/react-native', version: expectedReactNativeVersion }],
  'the monorepo must contain exactly one React Native installation',
);
assert.equal(
  mobileAppConfig.expo?.experiments?.autolinkingModuleResolution,
  true,
  'Expo SDK 54 monorepos must align Metro resolution with autolinking',
);
assert.ok(
  mobilePackage.dependencies?.['babel-preset-expo'],
  'apps/mobile must directly declare the Babel preset referenced by babel.config.js',
);

console.log(`Mobile dependency resolution passed with react-native ${expectedReactNativeVersion}.`);

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}
