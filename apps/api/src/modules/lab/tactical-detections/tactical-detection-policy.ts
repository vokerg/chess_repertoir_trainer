import {
  TacticalDetectionThresholds,
  tacticalDetectionThresholds,
} from './tactical-detection.constants';

export interface UserBlunderEvaluation {
  evalBeforeUserCp: number | null;
  evalAfterTriggerUserCp: number | null;
}

export function isTrainableUserBlunder(
  evaluation: UserBlunderEvaluation,
  thresholds: TacticalDetectionThresholds = tacticalDetectionThresholds,
): boolean {
  const before = evaluation.evalBeforeUserCp;
  const after = evaluation.evalAfterTriggerUserCp;
  if (before === null || after === null) return false;

  return (
    before - after >= thresholds.userBlunderDropMinCp &&
    after <= thresholds.userBlunderMaxAfterEvalCp
  );
}
