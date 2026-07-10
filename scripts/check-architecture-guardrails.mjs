import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const rootPackage = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const importedGameRepository = readFileSync(
  new URL('../apps/api/src/modules/imported-games/imported-games.repository.prisma.ts', import.meta.url),
  'utf8',
);
const importedGameQueryService = readFileSync(
  new URL('../apps/api/src/modules/imported-games/imported-game-query.service.ts', import.meta.url),
  'utf8',
);
const apiSourceUrl = new URL('../apps/api/src/', import.meta.url);

assert.equal(existsSync(new URL('../apps/mobile', import.meta.url)), false, 'apps/mobile must remain retired');
assert.doesNotMatch(rootPackage, /apps\/mobile|(?:dev|ios|build|test|lint):mobile/);
assert.doesNotMatch(importedGameRepository, /findImportedGamesForSummary/);
assert.doesNotMatch(importedGameQueryService, /summarizeRows/);
for (const fileUrl of sourceFiles(apiSourceUrl)) {
  const path = fileUrl.pathname;
  assert.doesNotMatch(path, /\.openapi\.ts$/, `Hand-maintained OpenAPI file is forbidden: ${path}`);
  const source = readFileSync(fileUrl, 'utf8');
  assert.doesNotMatch(source, /registerOpenApiRoute|registerOpenApiSchemas|legacyOpenApiDocument|getGeneratedOpenApiPaths|getGeneratedOpenApiSchemas/,
    `Legacy OpenAPI symbol is forbidden: ${path}`);
}

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
