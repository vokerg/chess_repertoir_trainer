import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const rootPackage = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const packageLock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const apiPackage = JSON.parse(readFileSync(new URL('../apps/api/package.json', import.meta.url), 'utf8'));
const webPackage = JSON.parse(readFileSync(new URL('../apps/web/package.json', import.meta.url), 'utf8'));
const contractsPackage = JSON.parse(readFileSync(new URL('../packages/contracts/package.json', import.meta.url), 'utf8'));
const gitignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
const importedGameRepository = readFileSync(
  new URL('../apps/api/src/modules/imported-games/imported-games.repository.prisma.ts', import.meta.url),
  'utf8',
);
const importedGameQueryService = readFileSync(
  new URL('../apps/api/src/modules/imported-games/imported-game-query.service.ts', import.meta.url),
  'utf8',
);
const apiSourceUrl = new URL('../apps/api/src/', import.meta.url);
const apiRouteUrls = [
  new URL('../apps/api/src/modules/', import.meta.url),
  new URL('../apps/api/src/routes/', import.meta.url),
];

assert.equal(existsSync(new URL('../apps/mobile', import.meta.url)), false, 'apps/mobile must remain retired');
assert.doesNotMatch(rootPackage, /apps\/mobile|(?:dev|ios|build|test|lint):mobile/);
assert.equal(packageLock.packages['apps/mobile'], undefined, 'package-lock must not contain a mobile workspace');
for (const [workspacePath, workspacePackage] of Object.entries(packageLock.packages)) {
  if (workspacePath !== '' && !workspacePath.startsWith('apps/') && !workspacePath.startsWith('packages/')) continue;
  const directDependencies = {
    ...workspacePackage.dependencies,
    ...workspacePackage.devDependencies,
    ...workspacePackage.optionalDependencies,
  };
  for (const retiredDependency of ['expo', 'expo-router', 'react-native']) {
    assert.equal(
      directDependencies[retiredDependency],
      undefined,
      `${workspacePath || 'root'} must not directly depend on ${retiredDependency}`,
    );
  }
}
assert.match(gitignore, /^backups\/courses\/$/m, 'generated course backups must be ignored');
assert.doesNotMatch(importedGameRepository, /findImportedGamesForSummary/);
assert.doesNotMatch(importedGameQueryService, /summarizeRows/);
for (const fileUrl of sourceFiles(apiSourceUrl)) {
  const path = fileUrl.pathname;
  assert.doesNotMatch(path, /\.openapi\.ts$/, `Hand-maintained OpenAPI file is forbidden: ${path}`);
  const source = readFileSync(fileUrl, 'utf8');
  assert.doesNotMatch(source, /registerOpenApiRoute|registerOpenApiSchemas|legacyOpenApiDocument|getGeneratedOpenApiPaths|getGeneratedOpenApiSchemas/,
    `Legacy OpenAPI symbol is forbidden: ${path}`);
}

for (const routesRoot of apiRouteUrls) {
  for (const fileUrl of sourceFiles(routesRoot).filter((url) => url.pathname.endsWith('.routes.ts') || url.pathname.endsWith('/externalAccounts.ts') || url.pathname.endsWith('/lichessAuth.ts'))) {
    const source = readFileSync(fileUrl, 'utf8');
    assert.doesNotMatch(
      source,
      /\.(?:safeParse|parse)\(request\.(?:params|query|body)/,
      `Schema-backed route handlers must consume Fastify-validated request values: ${fileUrl.pathname}`,
    );
  }
}

const routeGuard = readFileSync(new URL('../apps/api/src/routes/product-route-schema.ts', import.meta.url), 'utf8');
for (const requiredMetadata of ['operationId', 'tags', 'summary', 'response']) {
  assert.match(routeGuard, new RegExp(requiredMetadata), `product route guard must require ${requiredMetadata}`);
}
assert.doesNotMatch(routeGuard, /route\.schema\s*\?\?=|schema\.operationId\s*=/, 'product route guard must not fabricate metadata');

for (const [workspaceName, workspacePackage] of [['API', apiPackage], ['web', webPackage]]) {
  const requiredScripts = workspaceName === 'API' ? ['prebuild', 'predev', 'prelint'] : ['prebuild', 'predev', 'pretest', 'prelint'];
  for (const script of requiredScripts) {
    assert.match(workspacePackage.scripts[script] ?? '', /build:contracts/, `${workspaceName} ${script} must prepare contracts`);
  }
}
for (const script of ['prebuild', 'predev', 'prelint']) {
  assert.match(apiPackage.scripts[script] ?? '', /build:domain/, `API ${script} must prepare chess-domain`);
}
for (const target of Object.values(contractsPackage.exports)) {
  assert.match(target.types, /^\.\/dist\//);
  assert.match(target.default, /^\.\/dist\//);
}
assert.ok(contractsPackage.scripts.build, 'contracts must expose a build script for dist exports');

assert.equal(existsSync(new URL('../apps/api/src/openapi/route-registry.ts', import.meta.url)), false);
assert.equal(existsSync(new URL('../apps/api/src/routes/swagger.ts', import.meta.url)), false);
assert.equal(existsSync(new URL('../docs/openapi-migration.md', import.meta.url)), false);

console.log('Architecture guardrails passed.');

function sourceFiles(directoryUrl) {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const entryUrl = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directoryUrl);
    if (entry.isDirectory()) return sourceFiles(entryUrl);
    return entry.isFile() && entry.name.endsWith('.ts') ? [entryUrl] : [];
  });
}
