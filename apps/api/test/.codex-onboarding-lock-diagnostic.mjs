import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';

const root = new URL('./', import.meta.url);
const testDirectory = fileURLToPath(root);

async function collectTestFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await collectTestFiles(path));
    else if (entry.name.endsWith('.test.mjs')) files.push(path);
  }
  return files;
}

const allTestFiles = (await collectTestFiles(testDirectory))
  .map((path) => path.replaceAll('\\', '/'))
  .sort();
const targetMarker = '/onboarding/onboarding.import-attention-commands.test.mjs';
const targetIndex = allTestFiles.findIndex((path) => path.endsWith(targetMarker));
if (targetIndex < 0) throw new Error('Could not locate onboarding import-attention test.');
const sequence = allTestFiles.slice(0, targetIndex);

const monitor = new PrismaClient();
let sampling = false;

function compactQuery(value) {
  return String(value ?? '').replace(/\s+/g, ' ').slice(0, 260);
}

function printJson(value) {
  return JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? Number(item) : item);
}

async function sample() {
  if (sampling) return;
  sampling = true;
  try {
    const activities = await monitor.$queryRawUnsafe(`
      SELECT
        pid,
        state,
        wait_event_type,
        wait_event,
        EXTRACT(EPOCH FROM (clock_timestamp() - xact_start)) AS xact_age_seconds,
        EXTRACT(EPOCH FROM (clock_timestamp() - query_start)) AS query_age_seconds,
        pg_blocking_pids(pid)::text AS blocking_pids,
        query
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND (state <> 'idle' OR xact_start IS NOT NULL)
      ORDER BY pid
    `);
    const locks = await monitor.$queryRawUnsafe(`
      SELECT
        l.pid,
        l.granted,
        l.mode,
        l.classid,
        l.objid,
        a.state,
        a.wait_event_type,
        a.wait_event,
        EXTRACT(EPOCH FROM (clock_timestamp() - a.xact_start)) AS xact_age_seconds,
        pg_blocking_pids(l.pid)::text AS blocking_pids,
        a.query
      FROM pg_locks l
      JOIN pg_stat_activity a ON a.pid = l.pid
      WHERE a.datname = current_database()
        AND l.locktype = 'advisory'
        AND l.pid <> pg_backend_pid()
      ORDER BY l.granted, l.pid
    `);
    const interestingActivities = activities.filter((row) =>
      row.wait_event_type === 'Lock' || Number(row.xact_age_seconds ?? 0) > 3,
    );
    const interestingLocks = locks.filter((row) =>
      !row.granted || Number(row.xact_age_seconds ?? 0) > 3,
    );
    if (interestingActivities.length || interestingLocks.length) {
      console.log(`[lock-monitor ${new Date().toISOString()}] activities`);
      for (const row of interestingActivities) {
        console.log(printJson({
          pid: row.pid,
          state: row.state,
          waitEvent: row.wait_event_type ? `${row.wait_event_type}:${row.wait_event}` : null,
          xactAgeSeconds: row.xact_age_seconds,
          queryAgeSeconds: row.query_age_seconds,
          blockingPids: row.blocking_pids,
          query: compactQuery(row.query),
        }));
      }
      console.log(`[lock-monitor ${new Date().toISOString()}] advisory locks`);
      for (const row of interestingLocks) {
        console.log(printJson({
          pid: row.pid,
          granted: row.granted,
          mode: row.mode,
          classid: row.classid,
          objid: row.objid,
          state: row.state,
          waitEvent: row.wait_event_type ? `${row.wait_event_type}:${row.wait_event}` : null,
          xactAgeSeconds: row.xact_age_seconds,
          blockingPids: row.blocking_pids,
          query: compactQuery(row.query),
        }));
      }
    }
  } catch (error) {
    console.log(`[lock-monitor-error] ${error.message}`);
  } finally {
    sampling = false;
  }
}

async function reportOpenTransactions(label) {
  const rows = await monitor.$queryRawUnsafe(`
    SELECT
      pid,
      state,
      wait_event_type,
      wait_event,
      EXTRACT(EPOCH FROM (clock_timestamp() - xact_start)) AS xact_age_seconds,
      pg_blocking_pids(pid)::text AS blocking_pids,
      query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND xact_start IS NOT NULL
    ORDER BY pid
  `);
  const locks = await monitor.$queryRawUnsafe(`
    SELECT l.pid, l.granted, l.mode, l.classid, l.objid
    FROM pg_locks l
    JOIN pg_stat_activity a ON a.pid = l.pid
    WHERE a.datname = current_database()
      AND l.locktype = 'advisory'
      AND l.pid <> pg_backend_pid()
  `);
  if (rows.length || locks.length) {
    console.log(`[diagnostic] open work after ${label}`);
    for (const row of rows) console.log(printJson({
      pid: row.pid,
      state: row.state,
      waitEvent: row.wait_event_type ? `${row.wait_event_type}:${row.wait_event}` : null,
      xactAgeSeconds: row.xact_age_seconds,
      blockingPids: row.blocking_pids,
      query: compactQuery(row.query),
    }));
    for (const row of locks) console.log(printJson({
      pid: row.pid,
      granted: row.granted,
      mode: row.mode,
      classid: row.classid,
      objid: row.objid,
    }));
  }
}

const interval = setInterval(() => { void sample(); }, 250);

try {
  for (const path of sequence) {
    const label = path.slice(testDirectory.length + 1);
    if (label === 'data-lifecycle/data-lifecycle.indirect-scope-hardening.test.mjs') {
      console.log(`[diagnostic] skipped local-incompatible ${label}`);
      continue;
    }
    console.log(`[diagnostic] importing ${label}`);
    try {
      await import(pathToFileURL(path).href);
      console.log(`[diagnostic] passed ${label}`);
    } catch (error) {
      console.log(`[diagnostic] failed ${label}: ${error?.name ?? 'Error'}: ${error?.message ?? error}`);
    }
    await reportOpenTransactions(label);
  }
  console.log('[diagnostic] sequence passed');
} finally {
  clearInterval(interval);
  await monitor.$disconnect();
}
