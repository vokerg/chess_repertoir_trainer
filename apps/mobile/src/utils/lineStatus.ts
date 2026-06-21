import { LineDto } from '@/api/dto';

export type LineStatus = 'NEW' | 'WEAK' | 'CLEAN' | 'REVIEW';

export function lineStatus(line: Pick<LineDto, 'trainingStats'>): LineStatus {
  const total = line.trainingStats?.totalAttempts ?? 0;
  const passed = line.trainingStats?.passedCount ?? 0;
  const failed = line.trainingStats?.failedCount ?? 0;
  if (total === 0) return 'NEW';
  if (failed > passed) return 'WEAK';
  if (passed > 0 && failed === 0) return 'CLEAN';
  return 'REVIEW';
}
