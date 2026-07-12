import prisma from '../../prisma';
import { Prisma } from '@prisma/client';
import { groupRecentAttempts, loadRecentScoredAttempts } from '../training/recent-scored-attempts';
import { statsFromLoadedAttempts } from '../../services/statsService';
import { deriveLineData, DerivedLineData } from './sublines.service';
import { performanceDebug } from '../../utils/performance-debug';

const derivedCourseSelect = {
  id: true, name: true, description: true,
  chapters: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: {
    id: true, courseId: true, name: true, description: true, sortOrder: true,
    lines: { orderBy: { id: 'asc' }, select: {
      id: true, chapterId: true, name: true, sideToTrain: true, startingFen: true,
      moves: { select: { id: true, lineId: true, parentId: true, plyNumber: true, moveUci: true, moveSan: true, sortOrder: true } },
    } },
  } },
} satisfies Prisma.CourseSelect;

function lineForDerivation(line: any, chapter: any) { return { ...line, chapter: { id: chapter.id, name: chapter.name, courseId: chapter.courseId } }; }

export const CourseDerivedDataService = {
  allCourses: async (userId: number) => {
    const courses = await prisma.course.findMany({ where: { userId }, orderBy: { id: 'asc' }, select: derivedCourseSelect });
    const derivedById = new Map<number, DerivedLineData>();
    for (const course of courses) for (const chapter of course.chapters) for (const line of chapter.lines) derivedById.set(line.id, deriveLineData(lineForDerivation(line, chapter)));
    const sublines = [...derivedById.values()].flatMap((line) => line.sublines);
    const attempts = groupRecentAttempts(await loadRecentScoredAttempts(userId, sublines.map(({ lineId, hash }) => ({ lineId, sublineHash: hash }))));
    return { courses, derivedById, sublines, attempts };
  },

  catalog: async (userId: number) => {
    const startedAt = performance.now();
    const data = await CourseDerivedDataService.allCourses(userId);
    const result = { courses: data.courses.map((course) => {
      const courseSublines = course.chapters.flatMap((chapter) => chapter.lines.flatMap((line) => data.derivedById.get(line.id)?.sublines ?? []));
      return {
        id: course.id, name: course.name, description: course.description,
        stats: statsFromLoadedAttempts('COURSE', course.id, courseSublines, data.attempts),
        chapters: course.chapters.map((chapter) => ({
          id: chapter.id, courseId: chapter.courseId, name: chapter.name, description: chapter.description, sortOrder: chapter.sortOrder,
          lines: chapter.lines.map((line) => {
            const lineSublines = data.derivedById.get(line.id)?.sublines ?? [];
            const stats = statsFromLoadedAttempts('LINE', line.id, lineSublines, data.attempts);
            return { id: line.id, chapterId: line.chapterId, name: line.name, sideToTrain: line.sideToTrain as 'WHITE' | 'BLACK', startingFen: line.startingFen,
              trainingStats: { totalAttempts: stats.totalAttempts, passedCount: stats.passedCount, failedCount: stats.failedCount, passRate: stats.passRate, activeSublineCount: stats.activeSublineCount, trainedSublineCount: stats.trainedSublineCount, untrainedSublineCount: stats.untrainedSublineCount, weakSublineCount: stats.weakSublineCount, status: stats.status } };
          }),
        })),
      };
    }) };
    performanceDebug('library-catalog-complete', startedAt, { courses: result.courses.length, lines: data.derivedById.size, sublines: data.sublines.length });
    return result;
  },

  overview: async (userId: number, courseId: number) => {
    const startedAt = performance.now();
    const course = await prisma.course.findFirst({ where: { id: courseId, userId }, select: derivedCourseSelect });
    if (!course) return null;
    const derived = course.chapters.flatMap((chapter) => chapter.lines.map((line) => deriveLineData(lineForDerivation(line, chapter))));
    const sublines = derived.flatMap((line) => line.sublines);
    const attempts = groupRecentAttempts(await loadRecentScoredAttempts(userId, sublines.map(({ lineId, hash }) => ({ lineId, sublineHash: hash }))));
    const stats = statsFromLoadedAttempts('COURSE', course.id, sublines, attempts);
    const result = {
      course: { id: course.id, name: course.name, description: course.description },
      chapters: course.chapters.map(({ lines: _lines, ...chapter }) => chapter),
      stats,
      sublines,
      weakestSublines: stats.weakestSublines ?? [],
    };
    performanceDebug('course-overview-complete', startedAt, { courseId, lines: derived.length, sublines: sublines.length });
    return result;
  },
};
