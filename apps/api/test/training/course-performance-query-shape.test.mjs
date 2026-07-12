import assert from 'node:assert/strict';
import prismaModule from '../../dist/prisma.js';
import { ChapterService, CourseService, LineService, MoveNodeService } from '../../dist/modules/courses/courses.service.js';
import { getAvailableSublineRows } from '../../dist/modules/courses/sublines.service.js';
import { filterCandidatesByMode, resolveMarathonCandidates } from '../../dist/modules/training-marathons/training-marathon-candidates.service.js';
import { loadRecentScoredAttempts } from '../../dist/modules/training/recent-scored-attempts.js';
import { StatsService } from '../../dist/services/statsService.js';

const prisma = prismaModule.default;
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let userId;

try {
  const user = await prisma.appUser.create({ data: { authProvider: 'test', authSubject: `course-performance-${suffix}` } });
  userId = user.id;
  const course = await CourseService.create(userId, { name: 'Performance course' });
  const chapter = await ChapterService.create(userId, course.id, { name: 'Many lines' });
  const lines = [];
  for (const [name, moveUci] of [['King pawn', 'e2e4'], ['Queen pawn', 'd2d4']]) {
    const line = await LineService.create(userId, chapter.id, { name, sideToTrain: 'WHITE', startingFen: 'startpos' });
    await MoveNodeService.create(userId, line.id, { moveUci });
    lines.push(line);
  }

  const sublines = await getAvailableSublineRows(userId, { type: 'CHAPTER', id: chapter.id });
  assert.equal(sublines.length, 2);
  const first = sublines[0];
  for (let index = 0; index < 7; index += 1) {
    const startedAt = new Date(Date.UTC(2026, 0, 1, 0, index));
    await prisma.trainingSublineAttempt.create({
      data: {
        userId,
        lineId: first.lineId,
        sublineHash: first.hash,
        movesJson: [],
        trainingMode: 'TEST',
        result: index % 2 === 0 ? 'PASSED' : 'FAILED',
        passed: index % 2 === 0,
        startedAt,
        completedAt: startedAt,
      },
    });
  }

  const latest = await loadRecentScoredAttempts(userId, [{ lineId: first.lineId, sublineHash: first.hash }]);
  assert.equal(latest.length, 5);
  assert.deepEqual(latest.map((attempt) => attempt.startedAt.getUTCMinutes()), [6, 5, 4, 3, 2]);

  const originalQueryRaw = prisma.$queryRaw.bind(prisma);
  let attemptReads = 0;
  prisma.$queryRaw = (...args) => {
    attemptReads += 1;
    return originalQueryRaw(...args);
  };
  try {
    const stats = await StatsService.lineStatsForChapter(userId, chapter.id);
    assert.equal(attemptReads, 1);
    assert.equal(stats.size, 2);
    assert.deepEqual(stats.get(first.lineId), {
      totalAttempts: 5,
      passedCount: 3,
      failedCount: 2,
      passRate: 0.6,
      activeSublineCount: 1,
      trainedSublineCount: 1,
      untrainedSublineCount: 0,
      weakSublineCount: 0,
      status: 'REVIEW',
    });

    attemptReads = 0;
    const mixed = await filterCandidatesByMode(userId, sublines, 'MIXED_WEAK_UNTRAINED');
    assert.equal(attemptReads, 1);
    assert.equal(mixed.some((subline) => subline.lineId === lines[1].id), true);
  } finally {
    prisma.$queryRaw = originalQueryRaw;
  }

  const resolved = await resolveMarathonCandidates(userId, {
    mode: 'ALL', lineIds: lines.map((line) => line.id), sublineHashes: [], recentSublineHashes: [], recentLineIds: [],
  });
  assert.equal(resolved.preparedLines.size, 2);
  await assert.rejects(
    resolveMarathonCandidates(userId + 1, {
      mode: 'ALL', lineIds: [lines[0].id], sublineHashes: [], recentSublineHashes: [], recentLineIds: [],
    }),
    (error) => error.statusCode === 404 && error.message === 'No valid selected lines found.',
  );

  console.log('Course performance query-shape tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
