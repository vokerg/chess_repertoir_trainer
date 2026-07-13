import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const rootPackageText = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const rootPackage = JSON.parse(rootPackageText);
const packageLock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const apiPackage = JSON.parse(readFileSync(new URL('../apps/api/package.json', import.meta.url), 'utf8'));
const webPackage = JSON.parse(readFileSync(new URL('../apps/web/package.json', import.meta.url), 'utf8'));
const mobilePackage = JSON.parse(readFileSync(new URL('../apps/mobile/package.json', import.meta.url), 'utf8'));
const domainPackage = JSON.parse(readFileSync(new URL('../packages/chess-domain/package.json', import.meta.url), 'utf8'));
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

assert.equal(existsSync(new URL('../apps/mobile', import.meta.url)), true, 'apps/mobile must be a supported workspace');
assert.ok(rootPackage.workspaces.includes('apps/mobile'), 'root workspaces must include apps/mobile');
assert.ok(packageLock.packages['apps/mobile'], 'package-lock must contain the mobile workspace');
for (const script of ['dev:mobile', 'build:mobile', 'test:mobile', 'lint:mobile']) {
  assert.ok(rootPackage.scripts[script], `root package must expose ${script}`);
}

for (const [workspacePath, workspacePackage] of Object.entries(packageLock.packages)) {
  if (workspacePath !== '' && !workspacePath.startsWith('apps/') && !workspacePath.startsWith('packages/')) continue;
  const directDependencies = {
    ...workspacePackage.dependencies,
    ...workspacePackage.devDependencies,
    ...workspacePackage.optionalDependencies,
  };
  for (const mobileDependency of ['expo', 'expo-router', 'react-native']) {
    if (workspacePath === 'apps/mobile') {
      assert.ok(directDependencies[mobileDependency], `apps/mobile must directly depend on ${mobileDependency}`);
    } else {
      assert.equal(
        directDependencies[mobileDependency],
        undefined,
        `${workspacePath || 'root'} must not directly depend on ${mobileDependency}`,
      );
    }
  }
}

const forbiddenMobileDependencies = [
  '@angular/core',
  '@prisma/client',
  'fastify',
  'prisma',
  '@react-native-async-storage/async-storage',
];
const mobileDirectDependencies = {
  ...mobilePackage.dependencies,
  ...mobilePackage.devDependencies,
  ...mobilePackage.optionalDependencies,
};
for (const dependency of forbiddenMobileDependencies) {
  assert.equal(mobileDirectDependencies[dependency], undefined, `mobile must not depend on ${dependency}`);
}

assert.ok(domainPackage.exports?.['./training'], 'chess-domain must expose a mobile-safe training subpath');
assert.ok(domainPackage.exports?.['./sublines'], 'chess-domain must expose a mobile-safe sublines subpath');
assert.ok(domainPackage.exports?.['./position'], 'chess-domain must expose a mobile-safe position subpath');
assert.ok(contractsPackage.exports?.['./training'], 'contracts must expose training wire schemas');
assert.ok(contractsPackage.exports?.['./mobile-sync'], 'contracts must expose mobile-sync wire schemas');
for (const requiredFile of [
  '../packages/chess-domain/src/training/serializable-training.ts',
  '../apps/mobile/app/training-lab.tsx',
  '../apps/mobile/src/features/training/TrainingLabScreen.tsx',
  '../apps/mobile/src/shell/MobileErrorBoundary.tsx',
  '../apps/mobile/src/diagnostics/mobile-logger.ts',
]) {
  assert.equal(existsSync(new URL(requiredFile, import.meta.url)), true, `${requiredFile} must exist`);
}

for (const fileUrl of sourceFiles(new URL('../apps/mobile/', import.meta.url))) {
  const source = readFileSync(fileUrl, 'utf8');
  assert.doesNotMatch(source, /(?:from|import\s*)\s*['"][^'"]*(?:apps\/web|apps\/api)[^'"]*['"]/, `mobile cross-app import is forbidden: ${fileUrl.pathname}`);
  assert.doesNotMatch(source, /from\s*['"]chess-domain['"]/, `mobile must use explicit chess-domain subpath exports: ${fileUrl.pathname}`);
  assert.doesNotMatch(source, /AsyncStorage|boardHtml|WebViewChessBoard/, `retired mobile storage or board pattern is forbidden: ${fileUrl.pathname}`);
  if (source.includes('@lichess-org/chessground')) {
    assert.match(fileUrl.pathname, /\.dom\.tsx$/, `mobile Chessground runtime import must stay in a .dom.tsx file: ${fileUrl.pathname}`);
  }
}
for (const fileUrl of sourceFiles(new URL('../apps/web/src/', import.meta.url))) {
  const source = readFileSync(fileUrl, 'utf8');
  assert.doesNotMatch(source, /(?:from|import\s*)\s*['"][^'"]*apps\/mobile[^'"]*['"]/, `web must not import mobile: ${fileUrl.pathname}`);
}

assert.match(gitignore, /^backups\/courses\/$/m, 'generated course backups must be ignored');
assert.doesNotMatch(importedGameRepository, /findImportedGamesForSummary/);
assert.doesNotMatch(importedGameQueryService, /summarizeRows/);
for (const fileUrl of sourceFiles(apiSourceUrl)) {
  const path = fileUrl.pathname;
  if (!path.endsWith('.ts')) continue;
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
for (const script of ['prebuild', 'prestart', 'pretest', 'prelint']) {
  assert.match(mobilePackage.scripts[script] ?? '', /build:domain/, `mobile ${script} must prepare chess-domain`);
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
    return entry.isFile() && /\.(?:ts|tsx|js|mjs)$/.test(entry.name) ? [entryUrl] : [];
  });
}
