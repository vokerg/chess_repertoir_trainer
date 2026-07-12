import prisma from '../prisma';
import { getAvailableSublineRows, HashedAvailableSublineDto, SublineScope } from '../modules/courses/sublines.service';
import { TRAINING_STATS_RECENT_ATTEMPTS } from '../modules/training/training.constants';
import { groupRecentAttempts, loadRecentScoredAttempts, sublineIdentityKey, summarizeRecentAttempts } from '../modules/training/recent-scored-attempts';
import { performanceDebug } from '../utils/performance-debug';

export interface ActiveSublineStats {
  scopeType: 'LINE' | 'CHAPTER' | 'COURSE';
  scopeId: number;
  activeSublineCount: number;
  trainedSublineCount: number;
  untrainedSublineCount: number;
  weakSublineCount: number;
  statsWindowSize: number;
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  failureRate: number;
  attemptPassRate: number | null;
  status: SublineTrainingStatusValue;
  weakestSublines?: WeakSublineStats[];
}

export interface WeakSublineStats {
  hash: string;
  lineId: number;
  lineName: string;
  chapterId: number;
  chapterName: string;
  moveText: string;
  recentAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
}

export interface LineTrainingStats {
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  activeSublineCount: number;
  trainedSublineCount: number;
  untrainedSublineCount: number;
  weakSublineCount: number;
  status: SublineTrainingStatusValue;
}

export type SublineTrainingStatusValue = 'NEW' | 'WEAK' | 'REVIEW' | 'STABLE' | 'STRONG';

export interface SublineTrainingStatus {
  hash: string;
  canonicalKeyVersion: number;
  lineId: number;
  lineName: string;
  chapterId: number;
  chapterName: string;
  moveText: string;
  leafNodeId: number;
  recentAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number | null;
  status: SublineTrainingStatusValue;
}

async function computeStats(userId: number, scope: SublineScope): Promise<ActiveSublineStats | null> {
  const sublines = await getAvailableSublineRows(userId, scope);
  if (sublines === null) return null;
  return statsFromSublines(userId, scope.type, scope.id, sublines);
}

async function statsFromSublines(
  userId: number,
  scopeType: 'LINE' | 'CHAPTER' | 'COURSE',
  scopeId: number,
  sublines: HashedAvailableSublineDto[],
): Promise<ActiveSublineStats> {
  const attemptsBySubline = groupRecentAttempts(await loadRecentScoredAttempts(
    userId,
    sublines.map(({ lineId, hash }) => ({ lineId, sublineHash: hash })),
  ));
  return statsFromLoadedAttempts(scopeType, scopeId, sublines, attemptsBySubline);
}

function statsFromLoadedAttempts(
  scopeType: 'LINE' | 'CHAPTER' | 'COURSE',
  scopeId: number,
  sublines: HashedAvailableSublineDto[],
  attemptsBySubline: ReturnType<typeof groupRecentAttempts>,
): ActiveSublineStats {
  const aggregateStartedAt = performance.now();

  let passedCount = 0;
  let failedCount = 0;
  let passRateSum = 0;
  let trainedSublineCount = 0;
  let weakSublineCount = 0;

  const weakestSublines: WeakSublineStats[] = sublines.map((subline) => {
    const recent = attemptsBySubline.get(sublineIdentityKey({ lineId: subline.lineId, sublineHash: subline.hash })) ?? [];
    const { passedCount: passed, failedCount: failed, passRate } = summarizeRecentAttempts(recent);
    const status = statusForSubline(recent.length, passRate);

    passedCount += passed;
    failedCount += failed;
    passRateSum += passRate;
    if (recent.length > 0) trainedSublineCount += 1;
    if (status === 'WEAK') weakSublineCount += 1;

    return {
      hash: subline.hash,
      lineId: subline.lineId,
      lineName: subline.lineName,
      chapterId: subline.chapterId,
      chapterName: subline.chapterName,
      moveText: subline.moveText,
      recentAttempts: recent.length,
      passedCount: passed,
      failedCount: failed,
      passRate,
    };
  }).sort((a, b) => a.passRate - b.passRate || a.recentAttempts - b.recentAttempts);

  const activeSublineCount = sublines.length;
  const totalAttempts = passedCount + failedCount;
  const passRate = activeSublineCount > 0 ? passRateSum / activeSublineCount : 0;
  const aggregateStatus = statusForSubline(totalAttempts, passRate);

  const result = {
    scopeType,
    scopeId,
    activeSublineCount,
    trainedSublineCount,
    untrainedSublineCount: activeSublineCount - trainedSublineCount,
    weakSublineCount,
    statsWindowSize: TRAINING_STATS_RECENT_ATTEMPTS,
    totalAttempts,
    passedCount,
    failedCount,
    passRate,
    failureRate: activeSublineCount > 0 ? 1 - passRate : 0,
    attemptPassRate: totalAttempts > 0 ? passedCount / totalAttempts : null,
    status: aggregateStatus,
    weakestSublines: weakestSublines.slice(0, 5),
  };
  performanceDebug('training-stats-aggregate', aggregateStartedAt, { sublines: sublines.length, attemptRows: totalAttempts });
  return result;
}

function statusForSubline(recentAttempts: number, passRate: number): SublineTrainingStatusValue {
  if (recentAttempts === 0) return 'NEW';
  if (passRate < 0.4) return 'WEAK';
  if (passRate < 0.7) return 'REVIEW';
  if (passRate < 0.9) return 'STABLE';
  return 'STRONG';
}

function statusSeverity(status: SublineTrainingStatusValue): number {
  return { NEW: 0, WEAK: 1, REVIEW: 2, STABLE: 3, STRONG: 4 }[status];
}

export const StatsService = {
  summary: async (userId: number) => {
    const [courses, lines, sessions, courseRows] = await Promise.all([
      prisma.course.count({ where: { userId } }),
      prisma.line.count({ where: { chapter: { course: { userId } } } }),
      prisma.trainingSession.count({ where: { userId, line: { chapter: { course: { userId } } } } }),
      prisma.course.findMany({ where: { userId }, select: { id: true } }),
    ]);

    const courseStats = (await Promise.all(
      courseRows.map((course) => computeStats(userId, { type: 'COURSE', id: course.id })),
    )).filter((stats): stats is ActiveSublineStats => Boolean(stats));
    const weakestSublines = courseStats.flatMap((stats) => stats.weakestSublines ?? [])
      .sort((a, b) => a.passRate - b.passRate || a.recentAttempts - b.recentAttempts)
      .slice(0, 5);

    return {
      totalCourses: courses,
      totalLines: lines,
      totalTrainingSessions: sessions,
      weakestSublines,
      weakestLines: weakestSublines.map((subline) => ({
        id: subline.lineId,
        name: subline.lineName,
        failureRate: 1 - subline.passRate,
      })),
    };
  },

  lineStats: async (userId: number, lineId: number) => computeStats(userId, { type: 'LINE', id: lineId }),
  chapterStats: async (userId: number, chapterId: number) => computeStats(userId, { type: 'CHAPTER', id: chapterId }),
  courseStats: async (userId: number, courseId: number) => computeStats(userId, { type: 'COURSE', id: courseId }),

  lineSublineStatus: async (userId: number, lineId: number): Promise<SublineTrainingStatus[] | null> => {
    const sublines = await getAvailableSublineRows(userId, { type: 'LINE', id: lineId });
    if (sublines === null) return null;
    const attemptsBySubline = groupRecentAttempts(await loadRecentScoredAttempts(userId, sublines.map(({ lineId, hash }) => ({ lineId, sublineHash: hash }))));
    return sublines.map((subline) => {
      const recent = attemptsBySubline.get(sublineIdentityKey({ lineId: subline.lineId, sublineHash: subline.hash })) ?? [];
      const passedCount = recent.filter((attempt) => attempt.result === 'PASSED' || attempt.passed === true).length;
      const failedCount = recent.filter((attempt) => attempt.result === 'FAILED' || attempt.passed === false).length;
      const passRate = recent.length > 0 ? passedCount / recent.length : null;
      return {
        hash: subline.hash,
        canonicalKeyVersion: subline.canonicalKeyVersion,
        lineId: subline.lineId,
        lineName: subline.lineName,
        chapterId: subline.chapterId,
        chapterName: subline.chapterName,
        moveText: subline.moveText,
        leafNodeId: subline.leafNodeId,
        recentAttempts: recent.length,
        passedCount,
        failedCount,
        passRate,
        status: statusForSubline(recent.length, passRate ?? 0),
      };
    }).sort((a, b) =>
      statusSeverity(a.status) - statusSeverity(b.status)
      || (a.passRate ?? -1) - (b.passRate ?? -1)
      || a.recentAttempts - b.recentAttempts
      || a.moveText.localeCompare(b.moveText),
    );
  },

  lineStatsForChapter: async (userId: number, chapterId: number): Promise<Map<number, LineTrainingStats> | null> => {
    const sublines = await getAvailableSublineRows(userId, { type: 'CHAPTER', id: chapterId });
    if (sublines === null) return null;
    const grouped = new Map<number, HashedAvailableSublineDto[]>();
    for (const subline of sublines) {
      grouped.set(subline.lineId, [...(grouped.get(subline.lineId) ?? []), subline]);
    }

    const attemptsBySubline = groupRecentAttempts(await loadRecentScoredAttempts(userId, sublines.map(({ lineId, hash }) => ({ lineId, sublineHash: hash }))));
    const statsByLine = new Map<number, LineTrainingStats>();
    for (const [lineId, lineSublines] of grouped.entries()) {
      const stats = statsFromLoadedAttempts('LINE', lineId, lineSublines, attemptsBySubline);
      statsByLine.set(lineId, {
        totalAttempts: stats.totalAttempts,
        passedCount: stats.passedCount,
        failedCount: stats.failedCount,
        passRate: stats.passRate,
        activeSublineCount: stats.activeSublineCount,
        trainedSublineCount: stats.trainedSublineCount,
        untrainedSublineCount: stats.untrainedSublineCount,
        weakSublineCount: stats.weakSublineCount,
        status: stats.status,
      });
    }
    return statsByLine;
  },
};
