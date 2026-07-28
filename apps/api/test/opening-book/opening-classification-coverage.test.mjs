import assert from 'node:assert/strict';
import {
  buildUnknownOpeningFamilyBacklogFromFrequencies,
} from '../../dist/services/opening-book/openingClassificationAudit.js';
import { OPENING_BOOK } from '../../dist/services/opening-book/openingBook.generated.js';
import { OpeningClassificationService } from '../../dist/services/opening-book/openingClassificationService.js';

function entry(name) {
  return {
    eco: 'A00',
    name,
    pgn: '1. e4',
    uci: 'e2e4',
    epd: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
    ply: 1,
  };
}

{
  const queenPawn = OpeningClassificationService.classify(
    entry("Queen's Pawn Game: Chigorin Variation"),
  );

  assert.ok(queenPawn.matchedRuleIds.includes('family-queens-pawn-game'));
  assert.ok(!queenPawn.matchedRuleIds.includes('family-rare-white-opening-systems'));
  assert.equal(queenPawn.white.theoreticalStatus, 'MAINLINE');
  assert.equal(queenPawn.white.confidence, 'MEDIUM');
}

{
  const formation = OpeningClassificationService.classify(
    entry('Formation: Hippopotamus Attack'),
  );

  assert.ok(formation.matchedRuleIds.includes('family-formation-attacks'));
  assert.ok(formation.white.character.includes('SURPRISE'));
  assert.equal(formation.white.soundness, 'UNKNOWN');
}

{
  const rareOpening = OpeningClassificationService.classify(
    entry("Anderssen's Opening"),
  );

  assert.ok(rareOpening.matchedRuleIds.includes('family-rare-white-opening-systems'));
  assert.equal(rareOpening.white.soundness, 'UNKNOWN');
  assert.ok(rareOpening.white.character.includes('SURPRISE'));
  assert.equal(rareOpening.white.confidence, 'LOW');
}

{
  const backlog = buildUnknownOpeningFamilyBacklogFromFrequencies([
    { name: 'Example Defense: First', count: 12 },
    { name: 'Example Defense: Second', count: 3 },
    { name: 'Other Opening', count: 5 },
  ], 20, 1);

  assert.deepEqual(backlog, [
    {
      family: 'Example Defense',
      entries: 15,
      entriesPct: 75,
      uniqueNames: 2,
      examples: ['Example Defense: First'],
    },
    {
      family: 'Other Opening',
      entries: 5,
      entriesPct: 25,
      uniqueNames: 1,
      examples: ['Other Opening'],
    },
  ]);
}

{
  const unmatched = OPENING_BOOK.filter(
    (opening) => OpeningClassificationService.classify(opening).matchedRuleIds.length === 0,
  );

  assert.deepEqual(unmatched.map((opening) => opening.name), []);
}
