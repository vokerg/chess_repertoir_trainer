import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { decodeNormalizedFenCompact, encodeNormalizedFenCompact } from 'chess-domain';
import prisma from '../prisma';
import { compactIndexStatus } from './index-compact-position-data';

type Row = { id: number; normalizedFen: string; positionKey: Uint8Array; positionDataCompact: Uint8Array };
type Identity = Pick<Row, 'id' | 'normalizedFen'>;
type Plan = { 'Node Type': string; 'Actual Rows': number; 'Index Name'?: string; Plans?: Plan[] };
type Explain = { Plan: Plan; 'Execution Time': number; 'Planning Time': number };

function planIndexes(plan: Plan): string[] {
  return [...new Set([...(plan['Index Name'] ? [plan['Index Name']] : []), ...(plan.Plans ?? []).flatMap(planIndexes)])];
}

/** Four cases only (at most three single rows and one 100-row IN batch), with no load-test loop. */
export async function benchmarkPositionLookups(database: PrismaClient = prisma, log: (message: string) => void = console.log) {
  const [index] = await compactIndexStatus(database);
  if (!index?.valid || !index.ready || !index.unique || !index.ordinary || index.columns.join(',') !== 'positionDataCompact') throw new Error('Benchmark requires the validated compact UNIQUE index');
  return database.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const sample = await tx.$queryRaw<Row[]>`
      SELECT id, "normalizedFen", "positionKey", "positionDataCompact" FROM "ImportedGamePosition"
      WHERE "positionDataCompact" IS NOT NULL ORDER BY id ASC LIMIT 100
    `;
    for (const row of sample) {
      const expected = encodeNormalizedFenCompact(row.normalizedFen);
      if (decodeNormalizedFenCompact(row.positionDataCompact) !== row.normalizedFen || expected.length !== row.positionDataCompact.length || !expected.every((byte, i) => byte === row.positionDataCompact[i])) throw new Error(`Sample compact mismatch: id=${row.id} FEN=${row.normalizedFen}`);
    }
    const results: Array<{ pattern: string; ids: number[]; methods: Array<{
      representation: string; executionTimeMs: number; planningTimeMs: number; rows: number; nodeType: string; indexes: string[]; explain: Explain;
    }> }> = [];
    const singles = [...new Set([0, Math.floor(sample.length / 2), sample.length - 1])].filter((i) => i >= 0 && sample[i]);
    const cases = [...singles.map((i) => ({ pattern: 'single equality', rows: [sample[i]] })), ...(sample.length ? [{ pattern: 'batch IN', rows: sample }] : [])];
    for (const [caseIndex, test] of cases.entries()) {
      const methods = [];
      // Alternate order to expose, rather than disguise, warm-cache effects.
      const columns = caseIndex & 1 ? ['positionDataCompact', 'positionKey'] as const : ['positionKey', 'positionDataCompact'] as const;
      for (const column of columns) {
        const predicate = test.pattern === 'single equality'
          ? Prisma.sql`${Prisma.raw(`"${column}"`)} = ${test.rows[0][column]}::bytea`
          : Prisma.sql`${Prisma.raw(`"${column}"`)} IN (${Prisma.join(test.rows.map((row) => Prisma.sql`${row[column]}::bytea`))})`;
        const query = Prisma.sql`SELECT id, "normalizedFen" FROM "ImportedGamePosition" WHERE ${predicate} ORDER BY id ASC`;
        const [{ 'QUERY PLAN': [explain] }] = await tx.$queryRaw<Array<{ 'QUERY PLAN': Explain[] }>>(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
        const found = await tx.$queryRaw<Identity[]>(query);
        const expected = test.rows.map(({ id, normalizedFen }) => ({ id, normalizedFen })).sort((a, b) => a.id - b.id);
        if (JSON.stringify(found) !== JSON.stringify(expected)) throw new Error(`Lookup identity mismatch: pattern=${test.pattern} representation=${column} expected=${JSON.stringify(expected)} actual=${JSON.stringify(found)}`);
        methods.push({ representation: column, executionTimeMs: explain['Execution Time'], planningTimeMs: explain['Planning Time'],
          rows: found.length, nodeType: explain.Plan['Node Type'], indexes: planIndexes(explain.Plan), explain });
      }
      results.push({ pattern: test.pattern, ids: test.rows.map((row) => row.id), methods });
    }
    const report = { sampledPositions: sample.length, mismatches: 0, explainQueries: results.length * 2, results,
      caveat: 'One bounded pass with alternating representation order; warm-cache, not load-testing or statistically robust latency measurement.' };
    log(`Position lookup comparison (read only): ${JSON.stringify(report, null, 2)}`);
    return report;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 10000, timeout: 120000 });
}

if (require.main === module) {
  Promise.resolve().then(() => {
    if (process.argv.length > 2) throw new Error('Usage: benchmark-position-lookups.ts (no arguments; at most 8 EXPLAIN queries)');
    return benchmarkPositionLookups();
  }).catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
}
