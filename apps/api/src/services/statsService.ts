import prisma from '../prisma';

export const StatsService = {
  /**
   * Returns a summary of overall counts and some weak line indicators.
   */
  summary: async (userId: number) => {
    const [courses, lines, sessions] = await Promise.all([
      prisma.course.count({ where: { userId } }),
      prisma.line.count({ where: { chapter: { course: { userId } } } }),
      prisma.trainingSession.count({ where: { userId, line: { chapter: { course: { userId } } } } }),
    ]);
    // Weakest lines: highest failure rate or lines not trained recently
    const weakestLines = await prisma.line.findMany({
      where: { chapter: { course: { userId } } },
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
    const weakest = weakestLines.map((line: any) => {
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
  lineStats: async (userId: number, lineId: number) => {
    const line = await prisma.line.findFirst({ where: { id: lineId, chapter: { course: { userId } } } });
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
  courseStats: async (userId: number, courseId: number) => {
    const course = await prisma.course.findFirst({ where: { id: courseId, userId }, select: { id: true } });
    if (!course) return null;
    const lines = await prisma.line.findMany({ where: { chapter: { courseId, course: { userId } } } });
    const totalAttempts = lines.reduce((sum: number, l: any) => sum + l.totalAttempts, 0);
    const passed = lines.reduce((sum: number, l: any) => sum + l.passedCount, 0);
    const failed = lines.reduce((sum: number, l: any) => sum + l.failedCount, 0);
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
