import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const apiSourceRoot = new URL('../apps/api/src/', import.meta.url);

// Counts include the import reference plus every route response reference in the file.
// Keep this map exact: contract migrations must reduce the relevant count in the same change.
// This is a debt-count ratchet, not an identity-level allowlist for individual route usages.
const expectedLegacyOpaqueResponseOccurrences = new Map([
  ['apps/api/src/modules/courses/courses.routes.ts', 19],
  ['apps/api/src/modules/scenario-training/scenario-training.routes.ts', 8],
  ['apps/api/src/routes/externalAccounts.ts', 13],
]);

const actualLegacyOccurrences = new Map(
  sourceFiles(apiSourceRoot)
    .filter((fileUrl) => fileUrl.pathname.endsWith('.ts'))
    .filter((fileUrl) => !fileUrl.pathname.endsWith('/routes/legacy-route.schemas.ts'))
    .map((fileUrl) => {
      const source = readFileSync(fileUrl, 'utf8');
      const count = source.match(/legacyOpaqueResponseSchema/g)?.length ?? 0;
      const path = relative(repositoryRoot, fileURLToPath(fileUrl)).replaceAll('\\', '/');
      return [path, count];
    })
    .filter(([, count]) => count > 0),
);

assert.deepEqual(
  [...actualLegacyOccurrences.entries()].sort(([left], [right]) => left.localeCompare(right)),
  [...expectedLegacyOpaqueResponseOccurrences.entries()].sort(([left], [right]) => left.localeCompare(right)),
  [
    'legacyOpaqueResponseSchema is transitional debt: exact per-file usage counts must match the reviewed baseline.',
    'New consumer files and net usage growth fail this check; migrated/deleted usages must reduce the baseline in the same change.',
    'Define a concrete response schema, preferably in packages/contracts when the payload crosses workspace boundaries.',
  ].join(' '),
);

const totalLegacyOccurrences = [...actualLegacyOccurrences.values()].reduce((sum, count) => sum + count, 0);
const routeResponseOccurrences = totalLegacyOccurrences - actualLegacyOccurrences.size;
console.log(
  `Repository hygiene guardrails passed. ${routeResponseOccurrences} legacy opaque route response reference(s) remain across ${actualLegacyOccurrences.size} file(s).`,
);

function sourceFiles(directoryUrl) {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const entryUrl = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directoryUrl);
    if (entry.isDirectory()) return sourceFiles(entryUrl);
    return entry.isFile() ? [entryUrl] : [];
  });
}
