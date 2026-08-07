import { OPENING_BOOK } from './openingBook.generated';
import {
  type OpeningKnowledgeBatchManifest,
  validateOpeningKnowledgeBatchManifest,
} from './openingKnowledgeBatchManifest';

const COMMON_SOURCES = [
  'project-editorial-rb-022',
  'project-rb-021-foundation',
  'lichess-chess-openings',
] as const;

function rule(
  id: string,
  selectorSummary: string,
  knowledgeIntent: string,
  regressionFixtures: readonly string[],
): OpeningKnowledgeBatchManifest['plannedRules'][number] {
  return {
    id,
    selectorSummary,
    knowledgeIntent,
    sides: ['WHITE', 'BLACK'],
    sourceIds: COMMON_SOURCES,
    regressionFixtures,
  };
}

export const OPENING_KNOWLEDGE_BATCH_MANIFESTS: readonly OpeningKnowledgeBatchManifest[] = [
  {
    schemaVersion: 1,
    id: 'rb-025-generated-priority-batch-001',
    revision: 1,
    lifecycle: 'DRAFT',
    title: 'Major uncovered families and inheritance exceptions',
    rationale: 'Use the generated-book priority backlog to add broad two-sided knowledge for six high-impact families, then protect structurally distinct branches with bounded narrow overrides.',
    priorityPolicyVersion: '2026-08-rb-025-v1',
    createdAt: '2026-08-06',
    selectedFamilies: [
      'Ruy Lopez',
      'Italian Game',
      'Dutch Defense',
      'Semi-Slav Defense',
      'Benoni Defense',
      'Alekhine Defense',
    ],
    baseline: {
      knowledgeVersion: '2026-08-knowledge-v1',
      classificationVersion: '2026-07-rules-v2',
      generatedEntries: {
        total: 3733,
        available: 1352,
        partial: 299,
        unavailable: 2082,
      },
      uniqueNames: {
        total: 3167,
        available: 1109,
        partial: 223,
        unavailable: 1835,
      },
    },
    expectedGain: {
      generatedAvailableEntries: 671,
      uniqueAvailableNames: 561,
    },
    plannedRules: [
      rule(
        'knowledge-family-ruy-lopez',
        'classification rule family-ruy-lopez',
        'Add principal-family orientation around central pressure, development, the e-file and long-term queenside structure for both sides.',
        ['Ruy Lopez', 'Ruy Lopez: Alapin Defense', 'Ruy Lopez: Open'],
      ),
      rule(
        'knowledge-subfamily-ruy-lopez-berlin',
        'Ruy Lopez names beginning with Berlin Defense',
        'Override broad attacking expectations with Berlin-specific queen-trade, king-placement and endgame caveats.',
        ['Ruy Lopez: Berlin Defense', 'Ruy Lopez: Berlin Defense, Rio Gambit Accepted'],
      ),
      rule(
        'knowledge-line-ruy-lopez-exchange',
        'Ruy Lopez names containing Exchange Variation',
        'Replace closed-centre assumptions with structural majority, bishop-pair and endgame guidance.',
        ['Ruy Lopez: Exchange Variation', 'Ruy Lopez: Exchange Variation, Alekhine Variation'],
      ),
      rule(
        'knowledge-line-ruy-lopez-marshall',
        'Ruy Lopez names containing Marshall Attack',
        'Add the concrete pawn-sacrifice and initiative boundary without presenting generic moves as forced recommendations.',
        ['Ruy Lopez: Marshall Attack', 'Ruy Lopez: Marshall Attack, Modern Variation'],
      ),
      rule(
        'knowledge-family-italian-game',
        'classification rule family-italian-game',
        'Provide the broad Italian development, central-break and kingside-pressure framework while completing inherited Evans knowledge.',
        ['Italian Game', 'Italian Game: Giuoco Pianissimo', 'Italian Game: Evans Gambit Accepted'],
      ),
      rule(
        'knowledge-subfamily-italian-two-knights',
        'Italian Game names containing Two Knights Defense',
        'Add the sharper central and tactical conditions that do not safely inherit from quiet Italian structures.',
        ['Italian Game: Two Knights Defense', 'Italian Game: Two Knights Defense, Fried Liver Attack'],
      ),
      rule(
        'knowledge-family-dutch-defense',
        'classification rule family-dutch-defense',
        'Explain Black’s kingside-space ambition and e5 break versus White’s central/queenside counterplay and king-safety targets.',
        ['Dutch Defense', 'Dutch Defense: Classical Variation'],
      ),
      rule(
        'knowledge-subfamily-dutch-stonewall',
        'Dutch Defense names containing Stonewall',
        'Add Stonewall pawn-chain, dark-square and bad-bishop conditions.',
        ['Dutch Defense: Stonewall Variation', 'Dutch Defense: Stonewall Variation, Botvinnik Variation'],
      ),
      rule(
        'knowledge-subfamily-dutch-leningrad',
        'Dutch Defense names containing Leningrad',
        'Add fianchetto, e5-break and king-exposure guidance distinct from Stonewall structures.',
        ['Dutch Defense: Leningrad Variation', 'Dutch Defense: Leningrad, Main Variation'],
      ),
      rule(
        'knowledge-family-semi-slav-defense',
        'classification rule family-semi-slav-defense',
        'Describe the sound but high-theory tension between structural solidity, the light-squared bishop and central breaks.',
        ['Semi-Slav Defense', 'Semi-Slav Defense: Accelerated Move Order'],
      ),
      rule(
        'knowledge-subfamily-semi-slav-meran',
        'Semi-Slav Defense names containing Meran',
        'Add Meran-specific queenside expansion and central-break guidance.',
        ['Semi-Slav Defense: Meran Variation', 'Semi-Slav Defense: Accelerated Meran Variation'],
      ),
      rule(
        'knowledge-line-semi-slav-botvinnik',
        'Semi-Slav Defense names containing Botvinnik Variation',
        'Replace generic solidity with the concrete pawn-sacrifice, king-safety and calculation caveat.',
        ['Semi-Slav Defense: Botvinnik Variation', 'Semi-Slav Defense: Botvinnik Variation, Alatortsev System'],
      ),
      rule(
        'knowledge-family-benoni-defense',
        'classification rule family-benoni-defense',
        'Describe White’s space and central majority versus Black’s queenside play, dark-square activity and timed pawn breaks.',
        ['Benoni Defense', 'Benoni Defense: Classical Variation'],
      ),
      rule(
        'knowledge-subfamily-benoni-czech',
        'Benoni Defense names containing Czech Benoni',
        'Add the closed-centre manoeuvring and delayed-break boundary rather than inheriting open Modern Benoni assumptions.',
        ['Benoni Defense: Czech Benoni Defense'],
      ),
      rule(
        'knowledge-family-alekhine-defense',
        'classification rule family-alekhine-defense',
        'Explain Black’s provocation-and-undermining concept and White’s responsibility to convert space without overextension.',
        ['Alekhine Defense', 'Alekhine Defense: Exchange Variation'],
      ),
      rule(
        'knowledge-subfamily-alekhine-four-pawns',
        'Alekhine Defense names containing Four Pawns Attack',
        'Add the maximal-space, development and central-target caveat for both sides.',
        ['Alekhine Defense: Four Pawns Attack', 'Alekhine Defense: Four Pawns Attack, Main Line'],
      ),
    ],
    acceptance: {
      minimumGeneratedAvailableGain: 600,
      minimumUniqueNameAvailableGain: 500,
      requireAllRulesExercised: true,
      requireNoRankingContractChange: true,
    },
  },
];

const openingNames = new Set(OPENING_BOOK.map((entry) => entry.name));
for (const manifest of OPENING_KNOWLEDGE_BATCH_MANIFESTS) {
  validateOpeningKnowledgeBatchManifest(manifest);
  for (const plannedRule of manifest.plannedRules) {
    for (const fixture of plannedRule.regressionFixtures) {
      if (!openingNames.has(fixture)) {
        throw new Error(`Opening knowledge batch rule ${plannedRule.id} has missing fixture: ${fixture}`);
      }
    }
  }
}
