import assert from 'node:assert/strict';
import {
  classifyRating,
  getDefaultRatingNormalizationProfile,
} from '../../dist/modules/rating-normalization/rating-normalization.service.js';

const profile = getDefaultRatingNormalizationProfile();

assert.equal(profile.id, 'universal-online-strength');
assert.equal(profile.version, '2026-07-product-v1');
assert.equal(profile.grades.length, 13);
assert.equal(profile.pools.FIDE_STANDARD.referenceOnly, true);
assert.equal(profile.grades[0].ranges.LICHESS_BLITZ.maxExclusive, 1000);
assert.equal(profile.grades[0].ranges.FIDE_STANDARD, null);

assert.equal(classifyRating('LICHESS_BLITZ', 999)?.id, 'foundational');
assert.equal(classifyRating('LICHESS_BLITZ', 1000)?.id, 'novice');
assert.equal(classifyRating('LICHESS_BLITZ', 1199)?.id, 'novice');
assert.equal(classifyRating('LICHESS_BLITZ', 1200)?.id, 'lower_beginner');
assert.equal(classifyRating('LICHESS_BLITZ', 1360)?.id, 'upper_beginner');
assert.equal(classifyRating('LICHESS_BLITZ', 2540)?.id, 'elite');

assert.equal(classifyRating('FIDE_STANDARD', 1659), null);
assert.equal(classifyRating('FIDE_STANDARD', 1660)?.id, 'lower_intermediate');
assert.equal(classifyRating('FIDE_STANDARD', 2350)?.id, 'elite');

console.log('Rating normalization tests passed.');
