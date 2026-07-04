export interface TacticalDetectionThresholds extends Record<string, number> {
  detectionVersion: number;
  opponentGiftMinCp: number;
  missedShotDropMinCp: number;
  minShotEvalCp: number;
  recoveryToleranceCp: number;
  userBlunderDropMinCp: number;
  mateAsCp: number;
  defaultLimit: number;
  maxLimit: number;
}

export const tacticalDetectionThresholds: TacticalDetectionThresholds = {
  detectionVersion: 2,
  opponentGiftMinCp: 150,
  missedShotDropMinCp: 120,
  minShotEvalCp: 100,
  recoveryToleranceCp: 80,
  userBlunderDropMinCp: 180,
  mateAsCp: 1000,
  defaultLimit: 100,
  maxLimit: 500,
};
