import 'dotenv/config';
import { Prisma } from '@prisma/client';
import prisma from '../prisma';

const UCI_MOVE_SQL = '^[a-h][1-8][a-h][1-8][qrbn]?$';

interface PositionAnalysisCounts {
  totalRows: number;
  oneLineRows: number;
  multiLineRows: number;
  nullLineRows: number;
  pollutedBestMoveRows: number;
  invalidBestMoveRows: number;
}

const apply = process.argv.includes('--apply');
const allDepths = process.argv.includes('--all-depths');

async function counts(): Promise<PositionAnalysisCounts> {
  const rows = await prisma.$queryRaw<PositionAnalysisCounts[]>`
    SELECT
      COUNT(*)::int AS "totalRows",
      COUNT(*) FILTER (
        WHERE jsonb_typeof("lines"::jsonb) = 'array' AND jsonb_array_length("lines"::jsonb) = 1
      )::int AS "oneLineRows",
      COUNT(*) FILTER (
        WHERE jsonb_typeof("lines"::jsonb) = 'array' AND jsonb_array_length("lines"::jsonb) > 1
      )::int AS "multiLineRows",
      COUNT(*) FILTER (WHERE "lines" IS NULL)::int AS "nullLineRows",
      COUNT(*) FILTER (WHERE "bestMoveUci" ~ '\\s')::int AS "pollutedBestMoveRows",
      COUNT(*) FILTER (
        WHERE "bestMoveUci" IS NOT NULL AND "bestMoveUci" !~* ${UCI_MOVE_SQL}
      )::int AS "invalidBestMoveRows"
    FROM "PositionAnalysis"
  `;
  return rows[0] ?? {
    totalRows: 0,
    oneLineRows: 0,
    multiLineRows: 0,
    nullLineRows: 0,
    pollutedBestMoveRows: 0,
    invalidBestMoveRows: 0,
  };
}

function printCounts(label: string, value: PositionAnalysisCounts): void {
  console.log(label);
  console.log(`  total PositionAnalysis rows: ${value.totalRows}`);
  console.log(`  rows with lines array length = 1: ${value.oneLineRows}`);
  console.log(`  rows with lines array length > 1: ${value.multiLineRows}`);
  console.log(`  rows with lines IS NULL: ${value.nullLineRows}`);
  console.log(`  rows with polluted bestMoveUci containing whitespace: ${value.pollutedBestMoveRows}`);
  console.log(`  rows with invalid bestMoveUci: ${value.invalidBestMoveRows}`);
}

async function cleanup(): Promise<void> {
  const lineRemovalPredicate = allDepths
    ? Prisma.sql`true`
    : Prisma.sql`(("lines"::jsonb->0->>'depth') IS NULL OR ("lines"::jsonb->0->>'depth')::int <= 12)`;

  await prisma.$executeRaw`
    UPDATE "PositionAnalysis"
    SET
      "bestMoveUci" = CASE
        WHEN "bestMoveUci" IS NOT NULL
          AND lower(split_part(trim("bestMoveUci"), ' ', 1)) ~* ${UCI_MOVE_SQL}
          THEN lower(split_part(trim("bestMoveUci"), ' ', 1))
        WHEN jsonb_typeof("lines"::jsonb) = 'array'
          AND jsonb_array_length("lines"::jsonb) > 0
          AND lower(split_part(trim(COALESCE("lines"::jsonb->0->>'moveUci', '')), ' ', 1)) ~* ${UCI_MOVE_SQL}
          THEN lower(split_part(trim("lines"::jsonb->0->>'moveUci'), ' ', 1))
        WHEN jsonb_typeof("lines"::jsonb) = 'array'
          AND jsonb_array_length("lines"::jsonb) > 0
          AND lower(split_part(trim(COALESCE("lines"::jsonb->0->'pvUci'->>0, '')), ' ', 1)) ~* ${UCI_MOVE_SQL}
          THEN lower(split_part(trim("lines"::jsonb->0->'pvUci'->>0), ' ', 1))
        WHEN "bestMoveUci" IS NOT NULL AND "bestMoveUci" !~* ${UCI_MOVE_SQL}
          THEN NULL
        ELSE "bestMoveUci"
      END,
      "bestScoreCpWhite" = COALESCE(
        "bestScoreCpWhite",
        CASE
          WHEN jsonb_typeof("lines"::jsonb) = 'array'
            AND jsonb_array_length("lines"::jsonb) > 0
            AND ("lines"::jsonb->0->>'scoreCpWhite') ~ '^-?\\d+$'
            THEN ("lines"::jsonb->0->>'scoreCpWhite')::int
          ELSE NULL
        END
      ),
      "bestMateWhite" = COALESCE(
        "bestMateWhite",
        CASE
          WHEN jsonb_typeof("lines"::jsonb) = 'array'
            AND jsonb_array_length("lines"::jsonb) > 0
            AND ("lines"::jsonb->0->>'mateWhite') ~ '^-?\\d+$'
            THEN ("lines"::jsonb->0->>'mateWhite')::int
          ELSE NULL
        END
      ),
      "lines" = CASE
        WHEN jsonb_typeof("lines"::jsonb) = 'array'
          AND jsonb_array_length("lines"::jsonb) = 1
          AND ${lineRemovalPredicate}
          THEN NULL
        ELSE "lines"
      END
  `;
}

async function main() {
  printCounts('Before cleanup:', await counts());

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to write changes.');
    if (allDepths) console.log('--all-depths was provided, but no rows were changed in dry-run mode.');
    return;
  }

  await cleanup();
  printCounts('After cleanup:', await counts());
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
