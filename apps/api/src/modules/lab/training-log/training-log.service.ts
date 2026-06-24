import prisma from '../../../prisma';
import { getAvailableSublineRows } from '../../courses/sublines.service';
import { TrainingLogQuery } from './training-log.schema';

export interface TrainingLogItem {
  id: number;
  startedAt: Date;
  completedAt: Date | null;
  result: string;
  courseId: number;
  courseName: string;
  chapterId: number;
  chapterName: string;
  lineId: number;
  lineName: string;
  sequence: string | null;
  isActiveSubline: boolean;
  accuracy: number | null;
  mistakesCount: number;
}

export interface TrainingLogResponse {
  items: TrainingLogItem[];
}

export async function getTrainingLog(userId: number, query: TrainingLogQuery): Promise<TrainingLogResponse> {
  const attempts = await prisma.trainingSublineAttempt.findMany({
    where: {
      userId,
      result: query.result,
      lineId: query.lineId,
      line: {
        chapter: {
          id: query.chapterId,
          course: {
            id: query.courseId,
            userId,
          },
        },
      },
    },
    include: {
      line: {
        include: {
          chapter: {
            include: {
              course: true,
            },
          },
        },
      },
    },
    orderBy: [
      { completedAt: { sort: 'desc', nulls: 'last' } },
      { startedAt: 'desc' },
    ],
    take: query.limit,
  });

  const courseIds = [...new Set(attempts.map((attempt) => attempt.line.chapter.course.id))];
  const activeSublineKeys = new Set<string>();

  await Promise.all(courseIds.map(async (courseId) => {
    const sublines = await getAvailableSublineRows(userId, { type: 'COURSE', id: courseId });
    for (const subline of sublines ?? []) {
      activeSublineKeys.add(`${subline.lineId}:${subline.hash}`);
    }
  }));

  return {
    items: attempts.map((attempt) => ({
      id: attempt.id,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      result: attempt.result,
      courseId: attempt.line.chapter.course.id,
      courseName: attempt.line.chapter.course.name,
      chapterId: attempt.line.chapter.id,
      chapterName: attempt.line.chapter.name,
      lineId: attempt.line.id,
      lineName: attempt.line.name,
      sequence: attempt.moveText,
      isActiveSubline: activeSublineKeys.has(`${attempt.lineId}:${attempt.sublineHash}`),
      accuracy: attempt.accuracy,
      mistakesCount: attempt.mistakesCount,
    })),
  };
}
