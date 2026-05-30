import { LineDto } from '@/api/dto';

export type LineStatus = 'NEW' | 'WEAK' | 'CLEAN' | 'REVIEW';

export function lineStatus(line: Pick<LineDto, 'totalAttempts' | 'passedCount' | 'failedCount'>): LineStatus {
  const total = line.totalAttempts ?? 0;
  const passed = line.passedCount ?? 0;
  const failed = line.failedCount ?? 0;
  if (total === 0) return 'NEW';
  if (failed > passed) return 'WEAK';
  if (passed > 0 && failed === 0) return 'CLEAN';
  return 'REVIEW';
}
