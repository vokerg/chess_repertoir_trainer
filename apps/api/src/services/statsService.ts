import prisma from '../prisma';

export const StatsService = {
  /**
   * Returns a summary of overall counts and some weak line indicators.
   */
  summary: async () => {
    const [courses, lines, sessions] = await Promise.all([
      prisma.course.count(),
      prisma.line.count(),
      prisma.trainingSession.count(),
    ]);
    // Weakest lines: highest failure rate or lines not trained recently
    const weakestLines = await prisma.line.findMany({
      orderBy: [
        {
          // order by failure rate descending
          // failure rate = failedCount / max(totalAttempts,1)
          // Prisma cannot compute ratio easily; compute in JS after fetch
          failedCount: 'desc',
        },
        {
          totalAttempts: 'asc',
        },
      ],
      take: 5,
    });
    const weakest = weakestLines.map((line) => {
      const failureRate = line.totalAttempts > 0 ? line.failedCount / line.totalAttempts : 0;
      return { id: line.id, name: line.name, failureRate };
    });
    return {
      totalCourses: courses,
      totalLines: lines,
      totalTrainingSessions: sessions,
      weakestLines: weakest,
    };
  },
  /**
   * Returns statistics for a specific line including pass/fail counts and recent performance.
   */
  lineStats: async (lineId: number) => {
    const line = await prisma.line.findUnique({ where: { id: lineId } });
    if (!line) return null;
    const passRate = line.totalAttempts > 0 ? line.passedCount / line.totalAttempts : 0;
    const failureRate = line.totalAttempts > 0 ? line.failedCount / line.totalAttempts : 0;
    return {
      id: line.id,
      name: line.name,
      totalAttempts: line.totalAttempts,
      passedCount: line.passedCount,
      failedCount: line.failedCount,
      passRate,
      failureRate,
      lastTrainedAt: line.lastTrainedAt,
    };
  },
  /**
   * Aggregate stats for a course: sum across all lines in the course.
   */
  courseStats: async (courseId: number) => {
    const lines = await prisma.line.findMany({ where: { chapter: { courseId } } });
    const totalAttempts = lines.reduce((sum, l) => sum + l.totalAttempts, 0);
    const passed = lines.reduce((sum, l) => sum + l.passedCount, 0);
    const failed = lines.reduce((sum, l) => sum + l.failedCount, 0);
    const passRate = totalAttempts > 0 ? passed / totalAttempts : 0;
    const failureRate = totalAttempts > 0 ? failed / totalAttempts : 0;
    return {
      courseId,
      totalLines: lines.length,
      totalAttempts,
      passedCount: passed,
      failedCount: failed,
      passRate,
      failureRate,
    };
  },
};