import { ratingNormalizationProfileSchema } from '@chess-trainer/contracts/rating-normalization';

function bounded(minInclusive: number, maxExclusive: number) {
  return { minInclusive, maxExclusive };
}

function openEnded(minInclusive: number) {
  return { minInclusive, maxExclusive: null };
}

export const LEGACY_RATING_NORMALIZATION_PROFILE = ratingNormalizationProfileSchema.parse({
  id: 'universal-online-strength',
  version: '2026-07-product-v1',
  description: 'Cross-pool online rating grades with FIDE Standard included as an OTB reference only.',
  baseline: 'CHESS_COM_BLITZ',
  sources: [
    {
      id: 'chessgoals-2026-07',
      label: 'ChessGoals rating comparison, July 2026',
      role: 'EMPIRICAL',
      note: 'Chess.com blitz is the baseline for the published cross-pool comparison.',
    },
    {
      id: 'lichess-blitz-low-end-product-adjustment-v1',
      label: 'Lichess blitz low-end product adjustment',
      role: 'PRODUCT_ADJUSTMENT',
      note: 'The first Lichess blitz boundary is rounded down from the empirical estimate to 1000, with the next two ranges smoothed accordingly.',
    },
  ],
  pools: {
    CHESS_COM_BLITZ: { label: 'Chess.com Blitz', referenceOnly: false, confidence: 'HIGH', softPadding: 0 },
    CHESS_COM_BULLET: { label: 'Chess.com Bullet', referenceOnly: false, confidence: 'LOW', softPadding: 135 },
    CHESS_COM_RAPID: { label: 'Chess.com Rapid', referenceOnly: false, confidence: 'MEDIUM', softPadding: 115 },
    LICHESS_BLITZ: { label: 'Lichess Blitz', referenceOnly: false, confidence: 'MEDIUM', softPadding: 70 },
    LICHESS_BULLET: { label: 'Lichess Bullet', referenceOnly: false, confidence: 'LOW', softPadding: 115 },
    LICHESS_RAPID: { label: 'Lichess Rapid', referenceOnly: false, confidence: 'MEDIUM', softPadding: 90 },
    FIDE_STANDARD: { label: 'FIDE Standard (OTB reference)', referenceOnly: true, confidence: 'LOW', softPadding: 75 },
  },
  grades: [
    {
      id: 'foundational', label: 'Foundational', order: 0,
      ranges: {
        CHESS_COM_BLITZ: bounded(0, 500), CHESS_COM_BULLET: bounded(0, 550), CHESS_COM_RAPID: bounded(0, 815),
        LICHESS_BLITZ: bounded(0, 1000), LICHESS_BULLET: bounded(0, 1060), LICHESS_RAPID: bounded(0, 1290), FIDE_STANDARD: null,
      },
    },
    {
      id: 'novice', label: 'Novice', order: 1,
      ranges: {
        CHESS_COM_BLITZ: bounded(500, 700), CHESS_COM_BULLET: bounded(550, 685), CHESS_COM_RAPID: bounded(815, 995),
        LICHESS_BLITZ: bounded(1000, 1200), LICHESS_BULLET: bounded(1060, 1180), LICHESS_RAPID: bounded(1290, 1425), FIDE_STANDARD: null,
      },
    },
    {
      id: 'lower_beginner', label: 'Lower beginner', order: 2,
      ranges: {
        CHESS_COM_BLITZ: bounded(700, 900), CHESS_COM_BULLET: bounded(685, 840), CHESS_COM_RAPID: bounded(995, 1170),
        LICHESS_BLITZ: bounded(1200, 1360), LICHESS_BULLET: bounded(1180, 1305), LICHESS_RAPID: bounded(1425, 1555), FIDE_STANDARD: null,
      },
    },
    {
      id: 'upper_beginner', label: 'Upper beginner', order: 3,
      ranges: {
        CHESS_COM_BLITZ: bounded(900, 1100), CHESS_COM_BULLET: bounded(840, 1010), CHESS_COM_RAPID: bounded(1170, 1340),
        LICHESS_BLITZ: bounded(1360, 1490), LICHESS_BULLET: bounded(1305, 1445), LICHESS_RAPID: bounded(1555, 1680), FIDE_STANDARD: null,
      },
    },
    {
      id: 'lower_intermediate', label: 'Lower intermediate', order: 4,
      ranges: {
        CHESS_COM_BLITZ: bounded(1100, 1300), CHESS_COM_BULLET: bounded(1010, 1195), CHESS_COM_RAPID: bounded(1340, 1500),
        LICHESS_BLITZ: bounded(1490, 1620), LICHESS_BULLET: bounded(1445, 1585), LICHESS_RAPID: bounded(1680, 1795), FIDE_STANDARD: bounded(1660, 1685),
      },
    },
    {
      id: 'intermediate', label: 'Intermediate', order: 5,
      ranges: {
        CHESS_COM_BLITZ: bounded(1300, 1500), CHESS_COM_BULLET: bounded(1195, 1385), CHESS_COM_RAPID: bounded(1500, 1655),
        LICHESS_BLITZ: bounded(1620, 1755), LICHESS_BULLET: bounded(1585, 1735), LICHESS_RAPID: bounded(1795, 1905), FIDE_STANDARD: bounded(1685, 1740),
      },
    },
    {
      id: 'upper_intermediate', label: 'Upper intermediate', order: 6,
      ranges: {
        CHESS_COM_BLITZ: bounded(1500, 1700), CHESS_COM_BULLET: bounded(1385, 1590), CHESS_COM_RAPID: bounded(1655, 1800),
        LICHESS_BLITZ: bounded(1755, 1885), LICHESS_BULLET: bounded(1735, 1890), LICHESS_RAPID: bounded(1905, 2015), FIDE_STANDARD: bounded(1740, 1820),
      },
    },
    {
      id: 'advanced_club', label: 'Advanced club', order: 7,
      ranges: {
        CHESS_COM_BLITZ: bounded(1700, 1900), CHESS_COM_BULLET: bounded(1590, 1795), CHESS_COM_RAPID: bounded(1800, 1935),
        LICHESS_BLITZ: bounded(1885, 2015), LICHESS_BULLET: bounded(1890, 2050), LICHESS_RAPID: bounded(2015, 2115), FIDE_STANDARD: bounded(1820, 1915),
      },
    },
    {
      id: 'strong_club', label: 'Strong club', order: 8,
      ranges: {
        CHESS_COM_BLITZ: bounded(1900, 2100), CHESS_COM_BULLET: bounded(1795, 2005), CHESS_COM_RAPID: bounded(1935, 2055),
        LICHESS_BLITZ: bounded(2015, 2145), LICHESS_BULLET: bounded(2050, 2215), LICHESS_RAPID: bounded(2115, 2215), FIDE_STANDARD: bounded(1915, 2020),
      },
    },
    {
      id: 'expert', label: 'Expert', order: 9,
      ranges: {
        CHESS_COM_BLITZ: bounded(2100, 2300), CHESS_COM_BULLET: bounded(2005, 2215), CHESS_COM_RAPID: bounded(2055, 2165),
        LICHESS_BLITZ: bounded(2145, 2275), LICHESS_BULLET: bounded(2215, 2380), LICHESS_RAPID: bounded(2215, 2310), FIDE_STANDARD: bounded(2020, 2135),
      },
    },
    {
      id: 'master_track', label: 'Master-track', order: 10,
      ranges: {
        CHESS_COM_BLITZ: bounded(2300, 2500), CHESS_COM_BULLET: bounded(2215, 2425), CHESS_COM_RAPID: bounded(2165, 2260),
        LICHESS_BLITZ: bounded(2275, 2410), LICHESS_BULLET: bounded(2380, 2550), LICHESS_RAPID: bounded(2310, 2400), FIDE_STANDARD: bounded(2135, 2245),
      },
    },
    {
      id: 'master_level', label: 'Master-level', order: 11,
      ranges: {
        CHESS_COM_BLITZ: bounded(2500, 2700), CHESS_COM_BULLET: bounded(2425, 2630), CHESS_COM_RAPID: bounded(2260, 2340),
        LICHESS_BLITZ: bounded(2410, 2540), LICHESS_BULLET: bounded(2550, 2715), LICHESS_RAPID: bounded(2400, 2490), FIDE_STANDARD: bounded(2245, 2350),
      },
    },
    {
      id: 'elite', label: 'Elite', order: 12,
      ranges: {
        CHESS_COM_BLITZ: openEnded(2700), CHESS_COM_BULLET: openEnded(2630), CHESS_COM_RAPID: openEnded(2340),
        LICHESS_BLITZ: openEnded(2540), LICHESS_BULLET: openEnded(2715), LICHESS_RAPID: openEnded(2490), FIDE_STANDARD: openEnded(2350),
      },
    },
  ],
});

export const DEFAULT_RATING_NORMALIZATION_PROFILE = ratingNormalizationProfileSchema.parse({
  id: 'universal-online-strength',
  version: '2026-07-lichess-bands-v1',
  description: 'Lichess Explorer benchmark bands with approximate provider-aware Chess.com mappings and FIDE Standard retained as an OTB reference only.',
  baseline: 'LICHESS_BLITZ',
  sources: [
    {
      id: 'chessgoals-2026-07',
      label: 'ChessGoals rating comparison, July 2026',
      role: 'EMPIRICAL',
      note: 'Provides the cross-pool calibration anchors inherited from the previous profile.',
    },
    {
      id: 'lichess-explorer-benchmark-bands-v1',
      label: 'Lichess Explorer benchmark bands',
      role: 'PRODUCT_ADJUSTMENT',
      note: 'Uses the discrete Lichess Explorer groups as canonical product bands and linearly interpolates the previous same-speed Chess.com calibration anchors, rounded to practical ten-point boundaries.',
    },
  ],
  pools: {
    CHESS_COM_BLITZ: { label: 'Chess.com Blitz', referenceOnly: false, confidence: 'MEDIUM', softPadding: 70 },
    CHESS_COM_BULLET: { label: 'Chess.com Bullet', referenceOnly: false, confidence: 'LOW', softPadding: 115 },
    CHESS_COM_RAPID: { label: 'Chess.com Rapid', referenceOnly: false, confidence: 'MEDIUM', softPadding: 90 },
    LICHESS_BLITZ: { label: 'Lichess Blitz', referenceOnly: false, confidence: 'HIGH', softPadding: 0 },
    LICHESS_BULLET: { label: 'Lichess Bullet', referenceOnly: false, confidence: 'LOW', softPadding: 0 },
    LICHESS_RAPID: { label: 'Lichess Rapid', referenceOnly: false, confidence: 'MEDIUM', softPadding: 0 },
    FIDE_STANDARD: { label: 'FIDE Standard (OTB reference)', referenceOnly: true, confidence: 'LOW', softPadding: 75 },
  },
  grades: [
    {
      id: 'under_1000', label: '<1000', order: 0,
      ranges: {
        CHESS_COM_BLITZ: bounded(0, 500), CHESS_COM_BULLET: bounded(0, 520), CHESS_COM_RAPID: bounded(0, 630),
        LICHESS_BLITZ: bounded(0, 1000), LICHESS_BULLET: bounded(0, 1000), LICHESS_RAPID: bounded(0, 1000), FIDE_STANDARD: null,
      },
    },
    {
      id: 'rating_1000_1199', label: '1000–1199', order: 1,
      ranges: {
        CHESS_COM_BLITZ: bounded(500, 700), CHESS_COM_BULLET: bounded(520, 710), CHESS_COM_RAPID: bounded(630, 760),
        LICHESS_BLITZ: bounded(1000, 1200), LICHESS_BULLET: bounded(1000, 1200), LICHESS_RAPID: bounded(1000, 1200), FIDE_STANDARD: null,
      },
    },
    {
      id: 'rating_1200_1399', label: '1200–1399', order: 2,
      ranges: {
        CHESS_COM_BLITZ: bounded(700, 960), CHESS_COM_BULLET: bounded(710, 960), CHESS_COM_RAPID: bounded(760, 960),
        LICHESS_BLITZ: bounded(1200, 1400), LICHESS_BULLET: bounded(1200, 1400), LICHESS_RAPID: bounded(1200, 1400), FIDE_STANDARD: null,
      },
    },
    {
      id: 'rating_1400_1599', label: '1400–1599', order: 3,
      ranges: {
        CHESS_COM_BLITZ: bounded(960, 1270), CHESS_COM_BULLET: bounded(960, 1210), CHESS_COM_RAPID: bounded(960, 1230),
        LICHESS_BLITZ: bounded(1400, 1600), LICHESS_BULLET: bounded(1400, 1600), LICHESS_RAPID: bounded(1400, 1600), FIDE_STANDARD: bounded(1660, 1680),
      },
    },
    {
      id: 'rating_1600_1799', label: '1600–1799', order: 4,
      ranges: {
        CHESS_COM_BLITZ: bounded(1270, 1570), CHESS_COM_BULLET: bounded(1210, 1470), CHESS_COM_RAPID: bounded(1230, 1510),
        LICHESS_BLITZ: bounded(1600, 1800), LICHESS_BULLET: bounded(1600, 1800), LICHESS_RAPID: bounded(1600, 1800), FIDE_STANDARD: bounded(1680, 1770),
      },
    },
    {
      id: 'rating_1800_1999', label: '1800–1999', order: 5,
      ranges: {
        CHESS_COM_BLITZ: bounded(1570, 1880), CHESS_COM_BULLET: bounded(1470, 1730), CHESS_COM_RAPID: bounded(1510, 1780),
        LICHESS_BLITZ: bounded(1800, 2000), LICHESS_BULLET: bounded(1800, 2000), LICHESS_RAPID: bounded(1800, 2000), FIDE_STANDARD: bounded(1770, 1905),
      },
    },
    {
      id: 'rating_2000_2199', label: '2000–2199', order: 6,
      ranges: {
        CHESS_COM_BLITZ: bounded(1880, 2180), CHESS_COM_BULLET: bounded(1730, 1990), CHESS_COM_RAPID: bounded(1780, 2040),
        LICHESS_BLITZ: bounded(2000, 2200), LICHESS_BULLET: bounded(2000, 2200), LICHESS_RAPID: bounded(2000, 2200), FIDE_STANDARD: bounded(1905, 2070),
      },
    },
    {
      id: 'rating_2200_2499', label: '2200–2499', order: 7,
      ranges: {
        CHESS_COM_BLITZ: bounded(2180, 2640), CHESS_COM_BULLET: bounded(1990, 2360), CHESS_COM_RAPID: bounded(2040, 2340),
        LICHESS_BLITZ: bounded(2200, 2500), LICHESS_BULLET: bounded(2200, 2500), LICHESS_RAPID: bounded(2200, 2500), FIDE_STANDARD: bounded(2070, 2320),
      },
    },
    {
      id: 'rating_2500_plus', label: '2500+', order: 8,
      ranges: {
        CHESS_COM_BLITZ: openEnded(2640), CHESS_COM_BULLET: openEnded(2360), CHESS_COM_RAPID: openEnded(2340),
        LICHESS_BLITZ: openEnded(2500), LICHESS_BULLET: openEnded(2500), LICHESS_RAPID: openEnded(2500), FIDE_STANDARD: openEnded(2320),
      },
    },
  ],
});