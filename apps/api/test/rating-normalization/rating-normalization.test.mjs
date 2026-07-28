import assert from 'node:assert/strict';
import {
  LEGACY_RATING_NORMALIZATION_PROFILE,
} from '../../dist/modules/rating-normalization/rating-normalization.config.js';
import {
  classifyRating,
  getDefaultRatingNormalizationProfile,
} from '../../dist/modules/rating-normalization/rating-normalization.service.js';

const profile = getDefaultRatingNormalizationProfile();

assert.equal(profile.id, 'universal-online-strength');
assert.equal(profile.version, '2026-07-lichess-bands-v1');
assert.equal(profile.baseline, 'LICHESS_BLITZ');
assert.equal(profile.grades.length, 9);
assert.equal(profile.pools.FIDE_STANDARD.referenceOnly, true);
assert.equal(profile.grades[0].ranges.LICHESS_BLITZ.maxExclusive, 1000);
assert.equal(profile.grades[0].ranges.FIDE_STANDARD, null);

assert.equal(LEGACY_RATING_NORMALIZATION_PROFILE.version, '2026-07-product-v1');
assert.equal(LEGACY_RATING_NORMALIZATION_PROFILE.grades.length, 13);

const lichessBoundaries = [
  [999, 'under_1000'],
  [1000, 'rating_1000_1199'],
  [1199, 'rating_1000_1199'],
  [1200, 'rating_1200_1399'],
  [1399, 'rating_1200_1399'],
  [1400, 'rating_1400_1599'],
  [1599, 'rating_1400_1599'],
  [1600, 'rating_1600_1799'],
  [1799, 'rating_1600_1799'],
  [1800, 'rating_1800_1999'],
  [1999, 'rating_1800_1999'],
  [2000, 'rating_2000_2199'],
  [2199, 'rating_2000_2199'],
  [2200, 'rating_2200_2499'],
  [2499, 'rating_2200_2499'],
  [2500, 'rating_2500_plus'],
];

for (const pool of ['LICHESS_BLITZ', 'LICHESS_BULLET', 'LICHESS_RAPID']) {
  for (const [rating, expectedGrade] of lichessBoundaries) {
    assert.equal(classifyRating(pool, rating)?.id, expectedGrade, `${pool} ${rating}`);
  }
}

assert.equal(classifyRating('CHESS_COM_BLITZ', 499)?.id, 'under_1000');
assert.equal(classifyRating('CHESS_COM_BLITZ', 500)?.id, 'rating_1000_1199');
assert.equal(classifyRating('CHESS_COM_BLITZ', 960)?.id, 'rating_1400_1599');
assert.equal(classifyRating('CHESS_COM_BLITZ', 2640)?.id, 'rating_2500_plus');

assert.equal(classifyRating('CHESS_COM_BULLET', 519)?.id, 'under_1000');
assert.equal(classifyRating('CHESS_COM_BULLET', 520)?.id, 'rating_1000_1199');
assert.equal(classifyRating('CHESS_COM_BULLET', 2360)?.id, 'rating_2500_plus');

assert.equal(classifyRating('CHESS_COM_RAPID', 629)?.id, 'under_1000');
assert.equal(classifyRating('CHESS_COM_RAPID', 630)?.id, 'rating_1000_1199');
assert.equal(classifyRating('CHESS_COM_RAPID', 2340)?.id, 'rating_2500_plus');

assert.equal(classifyRating('FIDE_STANDARD', 1659), null);
assert.equal(classifyRating('FIDE_STANDARD', 1660)?.id, 'rating_1400_1599');
assert.equal(classifyRating('FIDE_STANDARD', 2320)?.id, 'rating_2500_plus');

console.log('Rating normalization tests passed.');