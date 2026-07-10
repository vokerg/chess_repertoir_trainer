import assert from 'node:assert/strict';
import {
  analysisMergeTreeSchema,
} from '../../dist/modules/courses/analysis-reintegration.schemas.js';
import {
  importedGameSearchQuerySchema,
} from '../../dist/modules/imported-games/imported-games.schemas.js';
import {
  courseReviewQuerySchema,
} from '../../dist/modules/repertoire-coverage/course-review.schema.js';

const importedGames = importedGameSearchQuerySchema.parse({
  accountIds: '1, 2',
  providers: 'LICHESS,CHESS_COM',
  rated: 'false',
  from: '2026-01-02T00:00:00.000Z',
  limit: '25',
});
assert.deepEqual(importedGames.accountIds, [1, 2]);
assert.deepEqual(importedGames.providers, ['LICHESS', 'CHESS_COM']);
assert.equal(importedGames.rated, false);
assert.equal(importedGames.from.toISOString(), '2026-01-02T00:00:00.000Z');
assert.equal(importedGames.limit, 25);
assert.equal(importedGames.sort, 'endedAtDesc');

assert.deepEqual(analysisMergeTreeSchema.parse({
  rootFen: 'startpos',
  children: [{ moveUci: 'e2e4', children: [{ moveUci: 'e7e5' }] }],
}), {
  rootFen: 'startpos',
  children: [{ moveUci: 'e2e4', children: [{ moveUci: 'e7e5', children: [] }] }],
});

assert.equal(courseReviewQuerySchema.safeParse({
  from: '2026-02-02T00:00:00.000Z',
  to: '2026-02-01T00:00:00.000Z',
}).success, false);

console.log('Zod 4 compatibility tests passed.');
