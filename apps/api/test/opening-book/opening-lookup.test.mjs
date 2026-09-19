import assert from 'node:assert/strict';
import { OpeningLookupService } from '../../dist/services/opening-book/openingLookupService.js';

{
  const match = OpeningLookupService.lookupByEco('E21');
  assert.ok(match);
  assert.equal(match.eco, 'E21');
  assert.equal(match.source, 'ECO');
}

{
  const match = OpeningLookupService.lookupByEco(' e21 ');
  assert.ok(match);
  assert.equal(match.eco, 'E21');
}

{
  const sicilian = OpeningLookupService.lookupByMoves('e2e4 c7c5');
  assert.ok(sicilian);
  assert.equal(sicilian.source, 'MOVES');
  assert.match(sicilian.name, /Sicilian/i);

  const byFen = OpeningLookupService.lookupByFen(sicilian.epd);
  assert.ok(byFen);
  assert.equal(byFen.epd, sicilian.epd);
  assert.equal(byFen.source, 'FEN');
}

{
  const shallow = OpeningLookupService.lookupByMoves('e2e4');
  const deep = OpeningLookupService.lookupByMoves('e2e4 c7c5 g1f3 d7d6');
  assert.ok(shallow);
  assert.ok(deep);
  assert.ok(deep.ply > shallow.ply);
}

{
  assert.equal(OpeningLookupService.lookupByFen('not a fen'), null);
  assert.equal(OpeningLookupService.lookupByMoves('e2e5'), null);
}

