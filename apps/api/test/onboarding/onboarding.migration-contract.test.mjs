import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const migration = await readFile(path.join(
  here,
  '../../prisma/migrations/20260820080000_onboarding_disposition_readiness/migration.sql',
), 'utf8');

assert.match(migration, /^BEGIN;/m);
assert.match(migration, /LOCK TABLE "AppUser" IN SHARE ROW EXCLUSIVE MODE;/);
assert.match(migration, /"onboardingDisposition" VARCHAR\(16\) NOT NULL DEFAULT 'PENDING'/);
assert.match(migration, /SET "onboardingDisposition" = 'COMPLETED'/);
assert.match(migration, /"onboardingDispositionReason" = 'LEGACY_ADOPTION'/);
assert.match(migration, /CHECK \("onboardingDisposition" IN \('PENDING', 'COMPLETED', 'SKIPPED'\)\)/);
assert.match(migration, /WITH RECURSIVE lineage AS/);
assert.match(migration, /parent\."id" = child\."retryOfRunId"/);
assert.match(migration, /parent\."userId" = NEW\."userId"/);
assert.match(migration, /WHERE "purpose" = 'ONBOARDING'/);
assert.match(migration, /NEW\."coreReadyAt" IS NOT NULL/);
assert.match(migration, /"onboardingDispositionReason" = 'CORE_READY'/);
assert.match(migration, /COMMIT;\s*$/);

console.log('Onboarding migration contract tests passed.');
