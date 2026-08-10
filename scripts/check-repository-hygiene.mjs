import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const apiSourceRoot = new URL('../apps/api/src/', import.meta.url);

const allowedLegacyOpaqueResponseConsumers = new Set([
  'apps/api/src/modules/analysis/analysis.routes.ts',
  'apps/api/src/modules/courses/courses.routes.ts',
  'apps/api/src/modules/imported-games/imported-games.routes.ts',
  'apps/api/src/modules/lab/lab.routes.ts',
  'apps/api/src/modules/repertoire-coverage/repertoire-coverage.routes.ts',
  'apps/api/src/modules/scenario-training/scenario-training.routes.ts',
  'apps/api/src/modules/stats/stats.routes.ts',
  'apps/api/src/modules/training-marathons/training-marathons.routes.ts',
  'apps/api/src/modules/training/training.routes.ts',
  'apps/api/src/routes/externalAccounts.ts',
  'apps/api/src/routes/lichessAuth.ts',
]);

const legacyOpaqueResponseConsumers = sourceFiles(apiSourceRoot)
  .filter((fileUrl) => fileUrl.pathname.endsWith('.ts'))
  .filter((fileUrl) => !fileUrl.pathname.endsWith('/routes/legacy-route.schemas.ts'))
  .filter((fileUrl) => readFileSync(fileUrl, 'utf8').includes('legacyOpaqueResponseSchema'))
  .map((fileUrl) => relative(repositoryRoot, fileURLToPath(fileUrl)).replaceAll('\\', '/'))
  .sort();

const unexpectedLegacyConsumers = legacyOpaqueResponseConsumers.filter(
  (path) => !allowedLegacyOpaqueResponseConsumers.has(path),
);

assert.deepEqual(
  unexpectedLegacyConsumers,
  [],
  [
    'legacyOpaqueResponseSchema is transitional debt and must not gain new consumers.',
    'Define a concrete response schema, preferably in packages/contracts when the payload crosses workspace boundaries.',
    `Unexpected consumers: ${unexpectedLegacyConsumers.join(', ')}`,
  ].join(' '),
);

console.log(
  `Repository hygiene guardrails passed. ${legacyOpaqueResponseConsumers.length} legacy opaque response consumer(s) remain.`,
);

function sourceFiles(directoryUrl) {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const entryUrl = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directoryUrl);
    if (entry.isDirectory()) return sourceFiles(entryUrl);
    return entry.isFile() ? [entryUrl] : [];
  });
}
