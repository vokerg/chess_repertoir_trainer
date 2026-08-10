import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

const rootPackage = await readJson(new URL('../../../../package.json', import.meta.url));
const apiPackage = await readJson(new URL('../../package.json', import.meta.url));
const webPackage = await readJson(new URL('../../../web/package.json', import.meta.url));

assert.equal(
  rootPackage.scripts.dev,
  'npm run build:domain && npm run build:contracts && concurrently --kill-others "npm run dev:prepared --workspace=apps/api" "npm run dev:prepared --workspace=apps/web"',
  'combined dev must prepare shared packages once and then launch only prepared long-running processes',
);

assert.equal(
  apiPackage.scripts.predev,
  'npm --prefix ../.. run build:domain && npm --prefix ../.. run build:contracts',
  'standalone API dev must retain shared-package preparation',
);
assert.equal(
  apiPackage.scripts.dev,
  'ts-node-dev --respawn --transpile-only src/main.ts',
  'standalone API dev must retain its existing respawn behavior',
);
assert.equal(
  apiPackage.scripts['dev:prepared'],
  'ts-node-dev --transpile-only src/main.ts',
  'combined API dev must allow startup failure to terminate the watcher process',
);

assert.equal(
  webPackage.scripts.predev,
  'npm --prefix ../.. run build:contracts',
  'standalone web dev must retain contract preparation',
);
assert.equal(
  webPackage.scripts.dev,
  'npm run config && ng serve',
  'standalone web dev must retain its existing behavior',
);
assert.equal(
  webPackage.scripts['dev:prepared'],
  'npm run config && ng serve',
  'combined web dev must bypass the workspace predev lifecycle',
);

console.log('Development orchestration tests passed.');
