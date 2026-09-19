import prisma from '../prisma';
import {
  buildUnknownOpeningFamilyBacklogFromFrequencies,
  type OpeningNameFrequency,
} from '../services/opening-book/openingClassificationAudit';
import { OPENING_BOOK } from '../services/opening-book/openingBook.generated';
import type { OpeningBookEntry } from '../services/opening-book/openingBook.types';
import { OpeningClassificationService } from '../services/opening-book/openingClassificationService';
import {
  buildOpeningKnowledgeCoverageAudit,
  type OpeningKnowledgeCoverageObservation,
} from '../services/opening-book/openingKnowledgeCoverageAudit';
import { OpeningKnowledgeService } from '../services/opening-book/openingKnowledgeService';

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

function knowledgeEntry(name: string, eco: string | null): OpeningBookEntry {
  return entriesByNameAndEco.get(entryKey(name, eco))
    ?? entriesByName.get(name)
    ?? { eco: eco ?? '', name, pgn: '', uci: '', epd: '', ply: 0 };
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

  const statusCounts = { AVAILABLE: 0, PARTIAL: 0, UNAVAILABLE: 0 };
  const unavailableFrequencies: OpeningNameFrequency[] = [];
  const coverageObservations: OpeningKnowledgeCoverageObservation[] = [];
  const uniqueOpeningNames = new Set<string>();

  for (const row of groupedOpenings) {
    if (!row.openingName) continue;
    const games = row._count._all;
    uniqueOpeningNames.add(row.openingName);
    const entry = knowledgeEntry(row.openingName, row.openingEco);
    const classification = OpeningClassificationService.classify(entry);
    const result = OpeningKnowledgeService.resolve(entry, classification);
    coverageObservations.push({
      name: row.openingName,
      weight: games,
      classification,
      knowledge: result,
    });
    statusCounts[result.status] += games;
    if (result.status === 'UNAVAILABLE') {
      unavailableFrequencies.push({ name: row.openingName, count: games });
    }
  }

  console.log(JSON.stringify({
    knowledgeVersion: OpeningKnowledgeService.resolve(
      OPENING_BOOK[0],
      OpeningClassificationService.classify(OPENING_BOOK[0]),
    ).knowledgeVersion,
    classificationVersion: OpeningClassificationService.classify(OPENING_BOOK[0]).version,
    totals: {
      totalImportedGames,
      gamesWithOpeningName,
      gamesMissingOpeningName: totalImportedGames - gamesWithOpeningName,
      uniqueOpeningNames: uniqueOpeningNames.size,
    },
    gameWeightedCoverage: {
      ...statusCounts,
      availablePct: pct(statusCounts.AVAILABLE, gamesWithOpeningName),
      partialPct: pct(statusCounts.PARTIAL, gamesWithOpeningName),
      unavailablePct: pct(statusCounts.UNAVAILABLE, gamesWithOpeningName),
    },
    coverageModel: buildOpeningKnowledgeCoverageAudit(
      coverageObservations,
      gamesWithOpeningName,
    ),
    unavailableFamilyBacklog: buildUnknownOpeningFamilyBacklogFromFrequencies(
      unavailableFrequencies,
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
