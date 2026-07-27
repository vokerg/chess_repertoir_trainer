import assert from 'node:assert/strict';
import { buildUnknownOpeningFamilyBacklog, openingRootFamily } from '../../dist/services/opening-book/openingClassificationAudit.js';
import { OPENING_BOOK } from '../../dist/services/opening-book/openingBook.generated.js';
import {
  OPENING_CLASSIFICATION_VERSION,
  OpeningClassificationService,
  validateOpeningClassificationRules,
} from '../../dist/services/opening-book/openingClassificationService.js';

function entry(name, options = {}) {
  return {
    eco: options.eco ?? 'A00',
    name,
    pgn: options.pgn ?? '1. e4',
    uci: options.uci ?? 'e2e4',
    epd: options.epd ?? 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
    ply: options.ply ?? 1,
  };
}

validateOpeningClassificationRules();

{
  assert.equal(openingRootFamily('Sicilian Defense: Najdorf Variation'), 'Sicilian Defense');
  assert.equal(openingRootFamily('Polish Opening, with d5'), 'Polish Opening');

  const backlog = buildUnknownOpeningFamilyBacklog([
    'Sicilian Defense: Najdorf Variation',
    'Sicilian Defense: Najdorf Variation',
    'Sicilian Defense: Dragon Variation',
    'Polish Opening, with d5',
  ], 4, 2);

  assert.deepEqual(backlog, [
    {
      family: 'Sicilian Defense',
      entries: 3,
      entriesPct: 75,
      uniqueNames: 2,
      examples: [
        'Sicilian Defense: Dragon Variation',
        'Sicilian Defense: Najdorf Variation',
      ],
    },
    {
      family: 'Polish Opening',
      entries: 1,
      entriesPct: 25,
      uniqueNames: 1,
      examples: ['Polish Opening, with d5'],
    },
  ]);
}

{
  const result = OpeningClassificationService.classify(
    entry('Italian Game: Evans Gambit Accepted'),
  );

  assert.equal(result.version, OPENING_CLASSIFICATION_VERSION);
  assert.equal(result.white.soundness, 'PLAYABLE');
  assert.equal(result.black.soundness, 'SOUND');
  assert.ok(result.white.roles.includes('GAMBIT_OFFERER'));
  assert.ok(result.black.roles.includes('GAMBIT_ACCEPTOR'));
  assert.equal(result.black.theoreticalStatus, 'PRINCIPAL');
  assert.ok(result.white.character.includes('SHARP'));
  assert.ok(result.black.character.includes('TACTICAL'));
}

{
  const result = OpeningClassificationService.classify(
    entry('Queen\'s Gambit Accepted'),
  );

  assert.equal(result.white.soundness, 'SOUND');
  assert.equal(result.black.soundness, 'SOUND');
  assert.ok(result.white.roles.includes('GAMBIT_OFFERER'));
  assert.ok(result.black.roles.includes('GAMBIT_ACCEPTOR'));
  assert.equal(result.black.theoreticalStatus, 'PRINCIPAL');
}

{
  const result = OpeningClassificationService.classify(
    entry('Benko Gambit Accepted'),
  );

  assert.ok(result.black.roles.includes('GAMBIT_OFFERER'));
  assert.ok(result.white.roles.includes('GAMBIT_ACCEPTOR'));
  assert.equal(result.black.soundness, 'PLAYABLE');
  assert.equal(result.white.soundness, 'SOUND');
}

{
  const result = OpeningClassificationService.classify(
    entry('Invented Opening: Example Gambit'),
  );

  assert.equal(result.white.soundness, 'UNKNOWN');
  assert.equal(result.black.soundness, 'UNKNOWN');
  assert.ok(result.white.character.includes('SHARP'));
  assert.ok(result.black.character.includes('TACTICAL'));
  assert.deepEqual(result.matchedRuleIds, [
    'modifier-named-gambit-is-sharp-not-automatically-dubious',
  ]);
}

{
  const first = OpeningClassificationService.classify(
    entry('English Opening: Mikenas-Carls Variation'),
  );
  const second = OpeningClassificationService.classify(
    entry('English Opening: Anglo-Indian Defense, Flohr-Mikenas-Carls Variation'),
  );

  for (const result of [first, second]) {
    assert.equal(result.white.soundness, 'PLAYABLE');
    assert.ok(result.white.character.includes('SHARP'));
    assert.ok(result.matchedRuleIds.includes('family-english-opening'));
    assert.ok(result.matchedRuleIds.includes('subfamily-english-mikenas-carls'));
  }
}

{
  const result = OpeningClassificationService.classify(
    entry('English Opening: Anglo-Indian Defense, Flohr-Mikenas-Carls Variation, Nei Gambit'),
  );

  assert.equal(result.white.soundness, 'RISKY');
  assert.equal(result.white.theoreticalStatus, 'SURPRISE');
  assert.ok(result.white.roles.includes('GAMBIT_OFFERER'));
  assert.equal(result.black.soundness, 'SOUND');
  assert.ok(result.matchedRuleIds.includes('line-english-mikenas-nei-gambit'));
}

{
  const result = OpeningClassificationService.classify(
    entry('Englund Gambit: Main Line'),
  );

  assert.equal(result.white.soundness, 'SOUND');
  assert.equal(result.black.soundness, 'DUBIOUS');
  assert.ok(result.black.roles.includes('GAMBIT_OFFERER'));
  assert.equal(result.black.theoreticalStatus, 'MAINLINE');
}

{
  const result = OpeningClassificationService.classify(
    entry('Zukertort Opening: Kingside Fianchetto'),
  );

  assert.equal(result.white.soundness, 'SOUND');
  assert.equal(result.black.soundness, 'SOUND');
  assert.ok(result.white.character.includes('POSITIONAL'));
  assert.ok(result.matchedRuleIds.includes('family-zukertort-opening'));
}

{
  const result = OpeningClassificationService.classify(
    entry('Pterodactyl Defense: Central, Benoni Pterodactyl'),
  );

  assert.equal(result.white.soundness, 'SOUND');
  assert.equal(result.black.soundness, 'PLAYABLE');
  assert.ok(result.black.roles.includes('INITIATOR'));
  assert.ok(result.black.character.includes('SURPRISE'));
}

{
  const result = OpeningClassificationService.classify(
    entry('Indian Defense: Anti-Grünfeld, Advance Variation'),
  );

  assert.equal(result.white.soundness, 'SOUND');
  assert.equal(result.black.soundness, 'SOUND');
  assert.ok(result.matchedRuleIds.includes('family-indian-defense-generic'));
}

{
  const result = OpeningClassificationService.classify(
    entry('King\'s Pawn Game: Damiano Defense'),
  );

  assert.equal(result.white.soundness, 'SOUND');
  assert.equal(result.black.soundness, 'DUBIOUS');
  assert.ok(result.black.character.includes('TACTICAL'));
  assert.ok(result.matchedRuleIds.includes('line-kings-pawn-damiano-defense'));
}

{
  const result = OpeningClassificationService.classify(
    entry('Nimzowitsch Defense: Colorado Countergambit Accepted'),
  );

  assert.equal(result.black.soundness, 'RISKY');
  assert.ok(result.black.roles.includes('GAMBIT_OFFERER'));
  assert.ok(result.white.roles.includes('GAMBIT_ACCEPTOR'));
  assert.ok(result.matchedRuleIds.includes('line-nimzowitsch-colorado-accepted'));
}

{
  const result = OpeningClassificationService.classify(
    entry('Ponziani Opening: Ponziani Countergambit, Schmidt Attack'),
  );

  assert.equal(result.white.soundness, 'SOUND');
  assert.equal(result.black.soundness, 'RISKY');
  assert.ok(result.black.roles.includes('GAMBIT_OFFERER'));
  assert.ok(result.matchedRuleIds.includes('line-ponziani-countergambit'));
}

{
  const result = OpeningClassificationService.classify(
    entry('Blumenfeld Countergambit Accepted'),
  );

  assert.equal(result.black.soundness, 'PLAYABLE');
  assert.ok(result.black.roles.includes('GAMBIT_OFFERER'));
  assert.ok(result.white.roles.includes('GAMBIT_ACCEPTOR'));
  assert.ok(result.matchedRuleIds.includes('line-blumenfeld-countergambit-accepted'));
}

{
  const result = OpeningClassificationService.classify(
    entry('Owen Defense: Unicorn Variation'),
  );

  assert.equal(result.black.soundness, 'PLAYABLE');
  assert.ok(result.matchedRuleIds.includes('family-owens-defense'));
}

{
  const result = OpeningClassificationService.classify(
    entry('Unclassified Test Opening'),
  );

  assert.equal(result.white.soundness, 'UNKNOWN');
  assert.equal(result.black.soundness, 'UNKNOWN');
  assert.deepEqual(result.white.character, []);
  assert.deepEqual(result.black.character, []);
  assert.deepEqual(result.matchedRuleIds, []);
}

{
  assert.ok(OPENING_BOOK.length > 3000);
  let matched = 0;
  let asymmetricSoundness = 0;
  let asymmetricRoles = 0;

  for (const opening of OPENING_BOOK) {
    const result = OpeningClassificationService.classify(opening);
    assert.equal(result.version, OPENING_CLASSIFICATION_VERSION);
    assert.equal(result.entry, opening);
    if (result.matchedRuleIds.length > 0) matched += 1;
    if (result.white.soundness !== result.black.soundness) asymmetricSoundness += 1;
    if (result.white.roles.join('|') !== result.black.roles.join('|')) asymmetricRoles += 1;
  }

  assert.ok(matched / OPENING_BOOK.length >= 0.99);
  assert.ok(asymmetricSoundness > 0);
  assert.ok(asymmetricRoles > 0);
  console.log(JSON.stringify({
    openingClassificationCoverage: {
      entries: OPENING_BOOK.length,
      matched,
      matchedPct: Math.round((matched / OPENING_BOOK.length) * 1000) / 10,
      asymmetricSoundness,
      asymmetricRoles,
    },
  }));
}
