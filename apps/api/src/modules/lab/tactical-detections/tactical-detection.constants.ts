export const tacticalDetectionThresholds = {
  detectionVersion: 6,
  opponentGiftMinCp: 150,
  missedShotDropMinCp: 120,
  minShotEvalCp: 100,
  recoveryToleranceCp: 80,
  userBlunderDropMinCp: 180,
  userBlunderMaxAfterEvalCp: 150,
  decisiveEvalCp: 400,
  mateAsCp: 1000,
  defaultLimit: 100,
  maxLimit: 500,
} as const;

export type TacticalDetectionThresholds = typeof tacticalDetectionThresholds;
