import { Prisma } from '@prisma/client';
import type { SerializableTrainingSession, SerializableTrainingSubline } from 'chess-domain/training';
import prisma from '../../prisma';

const courseBundleSelect = {
  id: true,
  userId: true,
  name: true,
  description: true,
  contentRevision: true,
  contentChangedAt: true,
  chapters: {
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      courseId: true,
      name: true,
      description: true,
      sortOrder: true,
      lines: {
        orderBy: [{ id: 'asc' }],
        select: {
          id: true,
          chapterId: true,
          name: true,
          sideToTrain: true,
          startingFen: true,
          tags: true,
          notes: true,
          updatedAt: true,
          moves: {
            orderBy: [{ plyNumber: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      },
    },
  },
} satisfies Prisma.CourseSelect;

export type MobileCourseBundleRow = Prisma.CourseGetPayload<{ select: typeof courseBundleSelect }>;

export async function listMobileManifestCourses(userId: number) {
  return prisma.course.findMany({
    where: { userId },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      contentRevision: true,
      contentChangedAt: true,
    },
  });
}

export async function getMobileCourseBundleRow(
  userId: number,
  courseId: number,
): Promise<MobileCourseBundleRow | null> {
  return prisma.course.findFirst({
    where: { id: courseId, userId },
    select: courseBundleSelect,
  });
}

export async function getCourseIdentity(courseId: number) {
  return prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, userId: true, contentRevision: true },
  });
}

export async function getAttemptLine(lineId: number) {
  return prisma.line.findUnique({
    where: { id: lineId },
    include: {
      chapter: {
        include: { course: true },
      },
      moves: {
        orderBy: [{ plyNumber: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
  });
}

export async function findMobileAttemptByClientId(userId: number, clientAttemptId: string) {
  return prisma.trainingSession.findFirst({
    where: { userId, clientAttemptId },
    select: { id: true, receivedAt: true },
  });
}

export interface PersistMobileAttemptInput {
  userId: number;
  deviceId: string;
  clientAttemptId: string;
  courseContentRevision: number;
  trainingMode: string;
  session: SerializableTrainingSession;
  subline: SerializableTrainingSubline;
  receivedAt: Date;
}

export async function persistMobileAttempt(input: PersistMobileAttemptInput) {
  return prisma.$transaction(async (tx) => {
    const counters = input.session.counters;
    const session = await tx.trainingSession.create({
      data: {
        userId: input.userId,
        lineId: input.session.lineId,
        clientAttemptId: input.clientAttemptId,
        source: 'MOBILE_OFFLINE',
        sourceDeviceId: input.deviceId,
        courseContentRevision: input.courseContentRevision,
        receivedAt: input.receivedAt,
        startedAt: new Date(input.session.startedAt),
        completedAt: input.session.completedAt ? new Date(input.session.completedAt) : null,
        result: input.session.status,
        mistakesCount: counters.mistakesCount,
        totalExpectedMoves: counters.totalExpectedMoves,
        correctMoves: counters.correctMoves,
        accuracy: counters.accuracy,
      },
    });

    await tx.trainingSublineAttempt.create({
      data: {
        userId: input.userId,
        lineId: input.session.lineId,
        trainingSessionId: session.id,
        sublineHash: input.subline.sublineHash,
        sublineKeyVersion: input.subline.sublineKeyVersion,
        movesJson: input.subline as unknown as Prisma.InputJsonValue,
        moveText: input.subline.moves.map((move) => move.moveSan || move.moveUci).join(' '),
        trainingMode: input.trainingMode,
        result: input.session.status,
        passed: input.session.status === 'PASSED',
        mistakesCount: counters.mistakesCount,
        totalExpectedMoves: counters.totalExpectedMoves,
        correctMoves: counters.correctMoves,
        accuracy: counters.accuracy,
        startedAt: new Date(input.session.startedAt),
        completedAt: input.session.completedAt ? new Date(input.session.completedAt) : null,
      },
    });

    if (input.session.events.length > 0) {
      await tx.trainingAttemptMove.createMany({
        data: input.session.events.map((event) => ({
          sessionId: session.id,
          moveNodeId: event.expectedNodeId,
          fenBefore: event.fenBefore,
          expectedMoveUci: event.expectedMoveUci,
          playedMoveUci: event.kind === 'MISSED_ON_EARLY_FINISH' ? null : event.playedMoveUci,
          wasCorrect: event.wasCorrect,
          createdAt: new Date(event.occurredAt),
        })),
      });
    }

    return { id: session.id, receivedAt: session.receivedAt };
  });
}

export function isMobileAttemptUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
