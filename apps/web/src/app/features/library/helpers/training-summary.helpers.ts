import { LibraryLine } from '../data-access/library.models';
import { coverageLabel, masteryLabel } from './library-line.helpers';

export interface LineGroupTrainingSummary {
  activeSublineCount: number;
  weakSublineCount: number;
  untrainedSublineCount: number;
  coverageLabel: string;
  masteryLabel: string;
}

export function lineGroupTrainingSummary(lines: readonly LibraryLine[]): LineGroupTrainingSummary {
  const activeSublineCount = lines.reduce((sum, line) => sum + line.trainingStats.activeSublineCount, 0);
  const trainedSublineCount = lines.reduce((sum, line) => sum + line.trainingStats.trainedSublineCount, 0);
  const weakSublineCount = lines.reduce((sum, line) => sum + line.trainingStats.weakSublineCount, 0);
  const untrainedSublineCount = lines.reduce((sum, line) => sum + line.trainingStats.untrainedSublineCount, 0);
  const weightedPassRate = lines.reduce(
    (sum, line) => sum + line.trainingStats.passRate * line.trainingStats.activeSublineCount,
    0,
  );

  return {
    activeSublineCount,
    weakSublineCount,
    untrainedSublineCount,
    coverageLabel: coverageLabel(trainedSublineCount, activeSublineCount),
    masteryLabel: activeSublineCount > 0 ? masteryLabel(weightedPassRate / activeSublineCount) : 'No attempts',
  };
}
