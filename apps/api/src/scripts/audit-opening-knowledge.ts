import { buildUnknownOpeningFamilyBacklog } from '../services/opening-book/openingClassificationAudit';
import { OPENING_BOOK } from '../services/opening-book/openingBook.generated';
import { OpeningClassificationService } from '../services/opening-book/openingClassificationService';
import {
  buildOpeningKnowledgeCoverageAudit,
  type OpeningKnowledgeCoverageObservation,
} from '../services/opening-book/openingKnowledgeCoverageAudit';
import { OpeningKnowledgeService } from '../services/opening-book/openingKnowledgeService';

function pct(value: number, total: number): number {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

const ruleUsage = new Map(OpeningKnowledgeService.rules().map((rule) => [rule.id, 0]));
const sourceUsage = new Map(OpeningKnowledgeService.sources().map((source) => [source.id, 0]));
const uniqueNames = new Map<string, 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE'>();
const unavailableEntryNames: string[] = [];
const coverageObservations: OpeningKnowledgeCoverageObservation[] = [];
const statusCounts = { AVAILABLE: 0, PARTIAL: 0, UNAVAILABLE: 0 };

for (const entry of OPENING_BOOK) {
  const classification = OpeningClassificationService.classify(entry);
  const result = OpeningKnowledgeService.resolve(entry, classification);
  coverageObservations.push({
    name: entry.name,
    weight: 1,
    classification,
    knowledge: result,
  });
  statusCounts[result.status] += 1;
  if (result.status === 'UNAVAILABLE') unavailableEntryNames.push(entry.name);

  const previous = uniqueNames.get(entry.name);
  if (!previous || previous === 'UNAVAILABLE' || (previous === 'PARTIAL' && result.status === 'AVAILABLE')) {
    uniqueNames.set(entry.name, result.status);
  }
  for (const ruleId of result.matchedKnowledgeRuleIds) {
    ruleUsage.set(ruleId, (ruleUsage.get(ruleId) ?? 0) + 1);
  }
  for (const source of result.sources) {
    sourceUsage.set(source.id, (sourceUsage.get(source.id) ?? 0) + 1);
  }
}

const uniqueStatusCounts = { AVAILABLE: 0, PARTIAL: 0, UNAVAILABLE: 0 };
for (const status of uniqueNames.values()) uniqueStatusCounts[status] += 1;

console.log(JSON.stringify({
  knowledgeVersion: OpeningKnowledgeService.resolve(
    OPENING_BOOK[0],
    OpeningClassificationService.classify(OPENING_BOOK[0]),
  ).knowledgeVersion,
  classificationVersion: OpeningClassificationService.classify(OPENING_BOOK[0]).version,
  totals: {
    entries: OPENING_BOOK.length,
    uniqueNames: uniqueNames.size,
    knowledgeRules: ruleUsage.size,
    knowledgeSources: sourceUsage.size,
  },
  entryCoverage: {
    ...statusCounts,
    availablePct: pct(statusCounts.AVAILABLE, OPENING_BOOK.length),
    partialPct: pct(statusCounts.PARTIAL, OPENING_BOOK.length),
    unavailablePct: pct(statusCounts.UNAVAILABLE, OPENING_BOOK.length),
  },
  uniqueNameCoverage: {
    ...uniqueStatusCounts,
    availablePct: pct(uniqueStatusCounts.AVAILABLE, uniqueNames.size),
    partialPct: pct(uniqueStatusCounts.PARTIAL, uniqueNames.size),
    unavailablePct: pct(uniqueStatusCounts.UNAVAILABLE, uniqueNames.size),
  },
  coverageModel: buildOpeningKnowledgeCoverageAudit(
    coverageObservations,
    OPENING_BOOK.length,
  ),
  unavailableFamilyBacklog: buildUnknownOpeningFamilyBacklog(
    unavailableEntryNames,
    OPENING_BOOK.length,
  ),
  ruleUsage: Object.fromEntries(
    Array.from(ruleUsage.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  ),
  unusedRuleIds: Array.from(ruleUsage.entries())
    .filter(([, count]) => count === 0)
    .map(([id]) => id)
    .sort(),
  sourceUsage: Object.fromEntries(
    Array.from(sourceUsage.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  ),
}, null, 2));
