import {
  mobileCourseBundleSchema,
  mobileSyncManifestSchema,
  mobileTrainingAttemptBatchResponseSchema,
  type MobileCourseBundleDto,
  type MobileSyncManifestDto,
  type MobileTrainingAttemptBatchRequestDto,
  type MobileTrainingAttemptBatchResponseDto,
  type MobileTrainingAttemptDto,
} from '@chess-trainer/contracts/mobile-sync';
import {
  deriveSerializableTrainingCounters,
  restoreSerializableTrainingSession,
  type SerializableTrainingCounters,
  type SerializableTrainingMoveSnapshot,
  type SerializableTrainingSession,
  type SerializableTrainingSubline,
} from 'chess-domain/training';
import { deriveLineData } from '../courses/sublines.service';
import {
  findMobileAttemptByClientId,
  getAttemptLine,
  getCourseIdentity,
  getMobileCourseBundleRow,
  isMobileAttemptUniqueConflict,
  listMobileManifestCourses,
  persistMobileAttempt,
  type MobileCourseBundleRow,
} from './mobile-sync.repository.prisma';

const MANIFEST_SCHEMA_VERSION = 1 as const;
const BUNDLE_SCHEMA_VERSION = 1 as const;
const ATTEMPT_SCHEMA_VERSION = 1 as const;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type MobileAttemptRejectionCode =
  | 'INVALID_ATTEMPT'
  | 'INVALID_EVENT_SEQUENCE'
  | 'INVALID_SNAPSHOT'
  | 'COUNTERS_MISMATCH'
  | 'CONTENT_NOT_OWNED'
  | 'CONTENT_GONE'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'INVALID_TIMESTAMP';

class MobileAttemptRejection extends Error {
  constructor(readonly code: MobileAttemptRejectionCode, message: string) {
    super(message);
  }
}

export const MobileSyncService = {
  manifest: async (userId: number): Promise<MobileSyncManifestDto> => {
    const courses = await listMobileManifestCourses(userId);
    return mobileSyncManifestSchema.parse({
      manifestSchemaVersion: MANIFEST_SCHEMA_VERSION,
      bundleSchemaVersion: BUNDLE_SCHEMA_VERSION,
      minimumSupportedAppVersion: null,
      generatedAt: new Date().toISOString(),
      courses: courses.map((course) => ({
        courseId: course.id,
        name: course.name,
        description: course.description,
        contentRevision: course.contentRevision,
        contentChangedAt: course.contentChangedAt.toISOString(),
        estimatedBundleBytes: null,
      })),
    });
  },

  courseBundle: async (userId: number, courseId: number): Promise<MobileCourseBundleDto | null> => {
    const row = await getMobileCourseBundleRow(userId, courseId);
    if (!row) return null;
    return mobileCourseBundleSchema.parse(mapCourseBundle(row));
  },

  ingestTrainingAttempts: async (
    userId: number,
    batch: MobileTrainingAttemptBatchRequestDto,
  ): Promise<MobileTrainingAttemptBatchResponseDto> => {
    const results = [];
    for (const attempt of batch.attempts) {
      const receivedAt = new Date();
      try {
        const duplicate = await findMobileAttemptByClientId(userId, attempt.clientAttemptId);
        if (duplicate) {
          results.push(duplicateResult(attempt.clientAttemptId, duplicate.id, duplicate.receivedAt));
          continue;
        }

        const replayed = await validateAndReplayAttempt(userId, attempt, receivedAt);
        const persisted = await persistMobileAttempt({
          userId,
          deviceId: batch.deviceId,
          clientAttemptId: attempt.clientAttemptId,
          courseContentRevision: attempt.courseContentRevision,
          trainingMode: attempt.trainingMode,
          session: replayed,
          subline: attempt.subline,
          receivedAt,
        });
        results.push({
          clientAttemptId: attempt.clientAttemptId,
          status: 'ACCEPTED' as const,
          trainingSessionId: persisted.id,
          rejectionCode: null,
          message: null,
          receivedAt: persisted.receivedAt.toISOString(),
        });
      } catch (error) {
        if (isMobileAttemptUniqueConflict(error)) {
          const existing = await findMobileAttemptByClientId(userId, attempt.clientAttemptId);
          if (existing) {
            results.push(duplicateResult(attempt.clientAttemptId, existing.id, existing.receivedAt));
            continue;
          }
        }

        const rejection = rejectionForError(error);
        results.push({
          clientAttemptId: attempt.clientAttemptId,
          status: 'REJECTED' as const,
          trainingSessionId: null,
          rejectionCode: rejection.code,
          message: rejection.message,
          receivedAt: receivedAt.toISOString(),
        });
      }
    }

    return mobileTrainingAttemptBatchResponseSchema.parse({ results });
  },
};

function mapCourseBundle(row: MobileCourseBundleRow) {
  const chapters = row.chapters.map(({ lines: _lines, ...chapter }) => chapter);
  const lines = row.chapters.flatMap((chapter) => chapter.lines);
  const moveNodes = lines.flatMap((line) => line.moves);
  const sublines = row.chapters.flatMap((chapter) => chapter.lines.flatMap((line) => {
    const nodeById = new Map(line.moves.map((node) => [node.id, node]));
    const derived = deriveLineData({
      ...line,
      chapter: { id: chapter.id, name: chapter.name, courseId: chapter.courseId },
    });
    return derived.sublines.map((subline) => ({
      version: BUNDLE_SCHEMA_VERSION,
      lineId: line.id,
      startingFen: line.startingFen,
      sideToTrain: line.sideToTrain,
      sublineHash: subline.hash,
      sublineKeyVersion: subline.canonicalKeyVersion,
      leafNodeId: subline.leafNodeId,
      moves: subline.moves.map((move) => {
        const node = nodeById.get(move.nodeId);
        if (!node) throw new Error(`Move node ${move.nodeId} is missing from line ${line.id}.`);
        return toTrainingMoveSnapshot(node);
      }),
    }));
  }));

  return {
    bundleSchemaVersion: BUNDLE_SCHEMA_VERSION,
    courseId: row.id,
    contentRevision: row.contentRevision,
    generatedAt: new Date().toISOString(),
    course: { id: row.id, name: row.name, description: row.description },
    chapters,
    lines: lines.map((line) => ({
      id: line.id,
      chapterId: line.chapterId,
      name: line.name,
      sideToTrain: line.sideToTrain,
      startingFen: line.startingFen,
      notes: line.notes,
      tags: parseStoredTags(line.tags),
    })),
    moveNodes: moveNodes.map((node) => ({
      id: node.id,
      lineId: node.lineId,
      parentId: node.parentId,
      plyNumber: node.plyNumber,
      fenBefore: node.fenBefore,
      fenAfter: node.fenAfter,
      moveUci: node.moveUci,
      moveSan: node.moveSan,
      moveNumber: node.moveNumber,
      colorToMoveBefore: node.colorToMoveBefore,
      side: node.side,
      isUserMove: node.isUserMove,
      isCorrectUserMove: node.isCorrectUserMove,
      sortOrder: node.sortOrder,
      branchLabel: node.branchLabel,
      branchWeight: node.branchWeight,
      comment: node.comment,
      annotation: node.annotation,
    })),
    sublines,
  };
}

function parseStoredTags(stored: string | null): string[] {
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every((tag) => typeof tag === 'string')) return parsed;
  } catch {
    // Fall through for legacy comma-separated values.
  }
  return stored.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function toTrainingMoveSnapshot(node: {
  id: number;
  moveUci: string;
  moveSan: string;
  fenBefore: string;
  fenAfter: string;
  isUserMove: boolean;
  comment: string | null;
  annotation: string | null;
  branchLabel: string | null;
}): SerializableTrainingMoveSnapshot {
  return {
    nodeId: node.id,
    moveUci: node.moveUci,
    moveSan: node.moveSan,
    fenBefore: node.fenBefore,
    fenAfter: node.fenAfter,
    isUserMove: node.isUserMove,
    comment: node.comment,
    annotation: node.annotation,
    branchLabel: node.branchLabel,
  };
}

async function validateAndReplayAttempt(
  userId: number,
  attempt: MobileTrainingAttemptDto,
  receivedAt: Date,
): Promise<SerializableTrainingSession> {
  validateVersions(attempt);
  validateAttemptShape(attempt);
  validateTimestamps(attempt, receivedAt);

  const derivedCounters = deriveSerializableTrainingCounters(attempt.events);
  if (!sameCounters(derivedCounters, attempt.counters)
    || !sameCounters(derivedCounters, attempt.session.counters)) {
    throw new MobileAttemptRejection('COUNTERS_MISMATCH', 'Submitted counters do not match replayed events.');
  }

  const course = await getCourseIdentity(attempt.courseId);
  if (!course) throw new MobileAttemptRejection('CONTENT_GONE', 'Course no longer exists.');
  if (course.userId !== userId) {
    throw new MobileAttemptRejection('CONTENT_NOT_OWNED', 'Course is not owned by the authenticated user.');
  }
  if (attempt.courseContentRevision > course.contentRevision) {
    throw new MobileAttemptRejection('INVALID_SNAPSHOT', 'Course revision is newer than the server course.');
  }

  const line = await getAttemptLine(attempt.session.lineId);
  if (!line) throw new MobileAttemptRejection('CONTENT_GONE', 'Line no longer exists.');
  if (line.chapter.course.userId !== userId) {
    throw new MobileAttemptRejection('CONTENT_NOT_OWNED', 'Line is not owned by the authenticated user.');
  }
  if (line.chapter.courseId !== attempt.courseId) {
    throw new MobileAttemptRejection('INVALID_SNAPSHOT', 'Line does not belong to the submitted course.');
  }

  validateSublineAgainstCurrentLine(attempt.subline, line);

  try {
    return restoreSerializableTrainingSession(attempt.session, attempt.subline);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Training replay failed.';
    if (/version/i.test(message)) {
      throw new MobileAttemptRejection('UNSUPPORTED_SCHEMA_VERSION', message);
    }
    if (/event|sequence|playedMoveUci|deterministic replay/i.test(message)) {
      throw new MobileAttemptRejection('INVALID_EVENT_SEQUENCE', message);
    }
    throw new MobileAttemptRejection('INVALID_ATTEMPT', message);
  }
}

function validateVersions(attempt: MobileTrainingAttemptDto): void {
  const versions = [
    attempt.attemptSchemaVersion,
    attempt.session.version,
    attempt.subline.version,
    ...attempt.events.map((event) => event.version),
  ];
  if (versions.some((version) => version !== ATTEMPT_SCHEMA_VERSION)) {
    throw new MobileAttemptRejection('UNSUPPORTED_SCHEMA_VERSION', 'Attempt contains an unsupported schema version.');
  }
}

function validateAttemptShape(attempt: MobileTrainingAttemptDto): void {
  if (
    attempt.session.lineId !== attempt.subline.lineId
    || attempt.session.courseContentRevision !== attempt.courseContentRevision
    || attempt.session.sublineHash !== attempt.subline.sublineHash
    || attempt.session.sublineKeyVersion !== attempt.subline.sublineKeyVersion
    || attempt.session.sideToTrain !== attempt.subline.sideToTrain
    || attempt.session.startingFen !== attempt.subline.startingFen
  ) {
    throw new MobileAttemptRejection('INVALID_SNAPSHOT', 'Session and subline identities do not match.');
  }
  if (!attempt.session.completed || attempt.session.completedAt === null
    || attempt.session.status === 'IN_PROGRESS') {
    throw new MobileAttemptRejection('INVALID_ATTEMPT', 'Only completed offline attempts can be ingested.');
  }
  if (JSON.stringify(attempt.session.events) !== JSON.stringify(attempt.events)) {
    throw new MobileAttemptRejection('INVALID_EVENT_SEQUENCE', 'Session events do not match the submitted event stream.');
  }
  for (let index = 0; index < attempt.events.length; index += 1) {
    if (attempt.events[index]?.sequence !== index + 1) {
      throw new MobileAttemptRejection('INVALID_EVENT_SEQUENCE', 'Training event sequence is not contiguous.');
    }
  }
}

function validateTimestamps(attempt: MobileTrainingAttemptDto, receivedAt: Date): void {
  const futureLimit = receivedAt.getTime() + MAX_FUTURE_CLOCK_SKEW_MS;
  const startedAt = Date.parse(attempt.session.startedAt);
  const completedAt = Date.parse(attempt.session.completedAt!);
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt)
    || completedAt < startedAt || startedAt > futureLimit || completedAt > futureLimit) {
    throw new MobileAttemptRejection('INVALID_TIMESTAMP', 'Attempt timestamps are invalid or too far in the future.');
  }

  let previous = startedAt;
  for (const event of attempt.events) {
    const occurredAt = Date.parse(event.occurredAt);
    if (!Number.isFinite(occurredAt) || occurredAt < previous || occurredAt > completedAt
      || occurredAt > futureLimit) {
      throw new MobileAttemptRejection('INVALID_TIMESTAMP', 'Event timestamps are outside the attempt chronology.');
    }
    previous = occurredAt;
  }
}

function validateSublineAgainstCurrentLine(subline: SerializableTrainingSubline, line: Awaited<ReturnType<typeof getAttemptLine>>): void {
  if (!line) throw new MobileAttemptRejection('CONTENT_GONE', 'Line no longer exists.');
  const derived = deriveLineData(line);
  const active = derived.sublines.find((candidate) =>
    candidate.hash === subline.sublineHash
    && candidate.canonicalKeyVersion === subline.sublineKeyVersion
    && candidate.leafNodeId === subline.leafNodeId);
  if (!active) {
    const samePath = derived.sublines.find((candidate) =>
      candidate.canonicalKeyVersion === subline.sublineKeyVersion
      && candidate.leafNodeId === subline.leafNodeId
      && candidate.moves.length === subline.moves.length
      && candidate.moves.every((move, index) => move.nodeId === subline.moves[index]?.nodeId));
    if (samePath) {
      throw new MobileAttemptRejection('INVALID_SNAPSHOT', 'Submitted subline identity does not match its move path.');
    }
    throw new MobileAttemptRejection('CONTENT_GONE', 'Submitted subline is no longer active.');
  }
  if (active.moves.length !== subline.moves.length
    || active.moves.some((move, index) => move.nodeId !== subline.moves[index]?.nodeId)) {
    throw new MobileAttemptRejection('INVALID_SNAPSHOT', 'Submitted subline path does not match the active line.');
  }

  const nodeById = new Map(line.moves.map((node) => [node.id, node]));
  for (const snapshot of subline.moves) {
    const node = nodeById.get(snapshot.nodeId);
    if (!node) throw new MobileAttemptRejection('CONTENT_GONE', `Move node ${snapshot.nodeId} no longer exists.`);
    const expected = toTrainingMoveSnapshot(node);
    if (!sameMoveSnapshot(expected, snapshot)) {
      throw new MobileAttemptRejection('INVALID_SNAPSHOT', `Move node ${snapshot.nodeId} does not match server content.`);
    }
  }
}

function sameMoveSnapshot(left: SerializableTrainingMoveSnapshot, right: SerializableTrainingMoveSnapshot): boolean {
  return left.nodeId === right.nodeId
    && left.moveUci === right.moveUci
    && left.moveSan === right.moveSan
    && left.fenBefore === right.fenBefore
    && left.fenAfter === right.fenAfter
    && left.isUserMove === right.isUserMove
    && (left.comment ?? null) === (right.comment ?? null)
    && (left.annotation ?? null) === (right.annotation ?? null)
    && (left.branchLabel ?? null) === (right.branchLabel ?? null);
}

function sameCounters(left: SerializableTrainingCounters, right: SerializableTrainingCounters): boolean {
  return left.mistakesCount === right.mistakesCount
    && left.totalExpectedMoves === right.totalExpectedMoves
    && left.correctMoves === right.correctMoves
    && (left.accuracy === right.accuracy
      || (left.accuracy !== null && right.accuracy !== null
        && Math.abs(left.accuracy - right.accuracy) < 1e-12));
}

function duplicateResult(clientAttemptId: string, trainingSessionId: number, receivedAt: Date) {
  return {
    clientAttemptId,
    status: 'DUPLICATE' as const,
    trainingSessionId,
    rejectionCode: null,
    message: null,
    receivedAt: receivedAt.toISOString(),
  };
}

function rejectionForError(error: unknown): MobileAttemptRejection {
  if (error instanceof MobileAttemptRejection) return error;
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003') {
    return new MobileAttemptRejection('CONTENT_GONE', 'Referenced course content no longer exists.');
  }
  return new MobileAttemptRejection(
    'INVALID_ATTEMPT',
    error instanceof Error ? error.message : 'Attempt could not be ingested.',
  );
}
