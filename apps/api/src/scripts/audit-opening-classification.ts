import { OPENING_BOOK } from '../services/opening-book/openingBook.generated';
import { OpeningClassificationService } from '../services/opening-book/openingClassificationService';

function pct(value: number, total: number): number {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

const usage = new Map(OpeningClassificationService.rules().map((rule) => [rule.id, 0]));
const names = new Set<string>();
const matchedNames = new Set<string>();
const unknownNames = new Set<string>();
let matched = 0;
let bothSidesKnown = 0;
let asymmetricSoundness = 0;
let asymmetricRoles = 0;
let namedGambits = 0;
let asymmetricGambitSoundness = 0;

for (const entry of OPENING_BOOK) {
  names.add(entry.name);
  const result = OpeningClassificationService.classify(entry);
  const whiteKnown = result.white.soundness !== 'UNKNOWN' || result.white.character.length > 0;
  const blackKnown = result.black.soundness !== 'UNKNOWN' || result.black.character.length > 0;

  if (result.matchedRuleIds.length) {
    matched += 1;
    matchedNames.add(entry.name);
  } else {
    unknownNames.add(entry.name);
  }
  if (whiteKnown && blackKnown) bothSidesKnown += 1;
  if (result.white.soundness !== result.black.soundness) asymmetricSoundness += 1;
  if (result.white.roles.join('|') !== result.black.roles.join('|')) asymmetricRoles += 1;
  if (entry.name.includes('Gambit')) {
    namedGambits += 1;
    if (result.white.soundness !== result.black.soundness) asymmetricGambitSoundness += 1;
  }
  for (const id of result.matchedRuleIds) usage.set(id, (usage.get(id) ?? 0) + 1);
}

const ruleUsage = Object.fromEntries(
  Array.from(usage.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);
const unusedRuleIds = Array.from(usage.entries())
  .filter(([, count]) => count === 0)
  .map(([id]) => id)
  .sort();

console.log(JSON.stringify({
  version: OpeningClassificationService.classify(OPENING_BOOK[0]).version,
  totals: { entries: OPENING_BOOK.length, uniqueNames: names.size, rules: usage.size, namedGambits },
  coverage: {
    matchedEntries: matched,
    matchedEntriesPct: pct(matched, OPENING_BOOK.length),
    matchedUniqueNames: matchedNames.size,
    matchedUniqueNamesPct: pct(matchedNames.size, names.size),
    bothSidesKnown,
    bothSidesKnownPct: pct(bothSidesKnown, OPENING_BOOK.length),
  },
  sideAwareness: { asymmetricSoundness, asymmetricRoles, asymmetricGambitSoundness },
  unknownNameExamples: Array.from(unknownNames).sort().slice(0, 50),
  ruleUsage,
  unusedRuleIds,
}, null, 2));
