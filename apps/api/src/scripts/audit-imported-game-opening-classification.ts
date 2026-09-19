import prisma from '../prisma';
import {
  buildUnknownOpeningFamilyBacklogFromFrequencies,
  type OpeningNameFrequency,
} from '../services/opening-book/openingClassificationAudit';
import {
  buildOpeningClassificationCoverageAudit,
  type OpeningClassificationCoverageObservation,
} from '../services/opening-book/openingClassificationCoverageAudit';
import { OPENING_BOOK } from '../services/opening-book/openingBook.generated';
import type { OpeningBookEntry } from '../services/opening-book/openingBook.types';
import { OpeningClassificationService } from '../services/opening-book/openingClassificationService';

function pct(value: number, total: number): number {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

function entryKey(name: string, eco: string | null): string {
  return `${eco ?? ''}\u0000${name}`;
}

const entriesByNameAndEco = new Map<string, OpeningBookEntry>();
const entriesByName = new Map<string, OpeningBookEntry>();

for (const entry of OPENING_BOOK) {
  entriesByNameAndEco.set(entryKey(entry.name, entry.eco), entry);
  if (!entriesByName.has(entry.name)) entriesByName.set(entry.name, entry);
}

function classificationEntry(name: string, eco: string | null): OpeningBookEntry {
  return entriesByNameAndEco.get(entryKey(name, eco))
    ?? entriesByName.get(name)
    ?? {
      eco: eco ?? '',
      name,
      pgn: '',
      uci: '',
      epd: '',
      ply: 0,
    };
}

async function main() {
  const [totalImportedGames, gamesWithOpeningName, groupedOpenings] = await Promise.all([
    prisma.importedGame.count(),
    prisma.importedGame.count({ where: { openingName: { not: null } } }),
    prisma.importedGame.groupBy({
      by: ['openingName', 'openingEco'],
      where: { openingName: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const uniqueOpeningNames = new Set<string>();
  const unknownFrequencies: OpeningNameFrequency[] = [];
  const coverageObservations: OpeningClassificationCoverageObservation[] = [];
  let matchedGames = 0;
  let bothSidesKnownGames = 0;

  for (const row of groupedOpenings) {
    if (!row.openingName) continue;
    const games = row._count._all;
    uniqueOpeningNames.add(row.openingName);

    const result = OpeningClassificationService.classify(
      classificationEntry(row.openingName, row.openingEco),
    );
    coverageObservations.push({
      name: row.openingName,
      weight: games,
      classification: result,
    });
    const whiteKnown = result.white.soundness !== 'UNKNOWN' || result.white.character.length > 0;
    const blackKnown = result.black.soundness !== 'UNKNOWN' || result.black.character.length > 0;

    if (result.matchedRuleIds.length > 0) {
      matchedGames += games;
    } else {
      unknownFrequencies.push({ name: row.openingName, count: games });
    }
    if (whiteKnown && blackKnown) bothSidesKnownGames += games;
  }

  const unknownGames = gamesWithOpeningName - matchedGames;

  console.log(JSON.stringify({
    version: OpeningClassificationService.classify(OPENING_BOOK[0]).version,
    totals: {
      totalImportedGames,
      gamesWithOpeningName,
      gamesMissingOpeningName: totalImportedGames - gamesWithOpeningName,
      uniqueOpeningNames: uniqueOpeningNames.size,
    },
    coverage: {
      matchedGames,
      matchedGamesPct: pct(matchedGames, gamesWithOpeningName),
      unknownGames,
      unknownGamesPct: pct(unknownGames, gamesWithOpeningName),
      bothSidesKnownGames,
      bothSidesKnownGamesPct: pct(bothSidesKnownGames, gamesWithOpeningName),
    },
    dimensionCoverage: buildOpeningClassificationCoverageAudit(
      coverageObservations,
      gamesWithOpeningName,
    ),
    unknownFamilyBacklog: buildUnknownOpeningFamilyBacklogFromFrequencies(
      unknownFrequencies,
      gamesWithOpeningName,
    ),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
