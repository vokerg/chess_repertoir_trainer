import type {
  RatingGrade,
  RatingNormalizationProfile,
  RatingPool,
  RatingRange,
} from '@chess-trainer/contracts/rating-normalization';
import { DEFAULT_RATING_NORMALIZATION_PROFILE } from './rating-normalization.config';

export function getDefaultRatingNormalizationProfile(): RatingNormalizationProfile {
  return DEFAULT_RATING_NORMALIZATION_PROFILE;
}

export function getRatingRange(
  profile: RatingNormalizationProfile,
  gradeId: string,
  pool: RatingPool,
): RatingRange | null {
  return profile.grades.find((grade) => grade.id === gradeId)?.ranges[pool] ?? null;
}

export function classifyRating(
  pool: RatingPool,
  rating: number,
  profile: RatingNormalizationProfile = DEFAULT_RATING_NORMALIZATION_PROFILE,
): RatingGrade | null {
  if (!Number.isFinite(rating) || rating < 0) return null;

  return profile.grades.find((grade) => {
    const range = grade.ranges[pool];
    return range !== null
      && rating >= range.minInclusive
      && (range.maxExclusive === null || rating < range.maxExclusive);
  }) ?? null;
}
