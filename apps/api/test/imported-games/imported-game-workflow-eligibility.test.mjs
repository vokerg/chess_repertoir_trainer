import assert from 'node:assert/strict';
import {
  isStandardImportedGameVariant,
  normalizeImportedGameVariant,
} from '../../dist/modules/imported-games/imported-game-workflow-eligibility.js';
import { buildAccountRatingHistoryData } from '../../dist/services/accountRatingHistoryService.js';

assert.equal(normalizeImportedGameVariant(' Standard '), 'standard');
assert.equal(isStandardImportedGameVariant('standard'), true);
assert.equal(isStandardImportedGameVariant('chess'), true);
assert.equal(isStandardImportedGameVariant(null), true);
assert.equal(isStandardImportedGameVariant('chess960'), false);
assert.equal(isStandardImportedGameVariant('Chess960'), false);
assert.equal(isStandardImportedGameVariant('fromPosition'), false);
assert.equal(isStandardImportedGameVariant('crazyhouse'), false);

const ratingHistory = buildAccountRatingHistoryData([
  {
    endedAt: new Date('2026-07-01T10:00:00.000Z'),
    speedCategory: 'blitz',
    variant: 'chess',
    userColor: 'WHITE',
    whiteRating: 1500,
    blackRating: 1400,
  },
  {
    endedAt: new Date('2026-07-02T10:00:00.000Z'),
    speedCategory: 'blitz',
    variant: 'chess960',
    userColor: 'WHITE',
    whiteRating: 2500,
    blackRating: 2400,
  },
], ['blitz']);

assert.deepEqual(ratingHistory.series[0].points.map((point) => point.rating), [1500]);

console.log('Imported game workflow eligibility tests passed.');
