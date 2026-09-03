import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const apiSourceRoot = new URL('../apps/api/src/', import.meta.url);

// Keep this map empty now that all route responses use concrete schemas.
// Any future legacyOpaqueResponseSchema consumer fails this guard immediately.
const expectedLegacyOpaqueResponseOccurrences = new Map();

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
    'legacyOpaqueResponseSchema is retired: no API source file may consume it.',
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
