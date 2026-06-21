import { createHash } from 'crypto';
import { buildSublineCanonicalKey, extractAvailableSublines, SUBLINE_KEY_VERSION } from 'chess-domain';
import prisma from '../../prisma';
import { TRAINING_STATS_RECENT_ATTEMPTS, WEAK_SUBLINE_PERCENTAGE } from '../training/training.constants';
import { buildMoveTreeFromNodes } from '../../utils/move-tree-builder';
import {
  getChapterById,
  getChapterLinesWithMoves,
  getCourseById,
  getCourseLinesWithMoves,
  getLineWithMoves,
} from './courses.repository.prisma';

export type SublineScope =
  | { type: 'LINE'; id: number }
  | { type: 'CHAPTER'; id: number }
  | { type: 'COURSE'; id: number };

export interface AvailableSublineDto {
  hash: string;
  canonicalKeyVersion: number;
  lineId: number;
  lineName: string;
  lineSideToTrain: 'WHITE' | 'BLACK';
  lineStartingFen: string;
  chapterId: number;
  chapterName: string;
  courseId: number;
  leafNodeId: number;
  moves: {
    nodeId: number;
    moveUci: string;
    moveSan: string;
    plyNumber: number;
    sortOrder: number;
  }[];
  moveText: string;
}

export type HashedAvailableSublineDto = AvailableSublineDto;

export function hashSublineCanonicalKey(canonicalKey: string): string {
  return createHash('sha256').update(canonicalKey, 'utf8').digest('hex');
}

async function loadLines(userId: number, scope: SublineScope) {
  if (scope.type === 'LINE') {
    const line = await getLineWithMoves(userId, scope.id);
    return line ? [line] : null;
  }
  if (scope.type === 'CHAPTER') {
    if (!await getChapterById(userId, scope.id)) return null;
    return getChapterLinesWithMoves(userId, scope.id);
  }
  if (!await getCourseById(userId, scope.id)) return null;
  return getCourseLinesWithMoves(userId, scope.id);
}

export function getAvailableSublineRowsForLines(lines: any[]): HashedAvailableSublineDto[] {
  return lines.flatMap((line) => {
    const tree = buildMoveTreeFromNodes(line.moves, line);
    return extractAvailableSublines(tree).map((subline) => {
      const canonicalKey = buildSublineCanonicalKey({
        lineId: line.id,
        startingFen: line.startingFen,
        sideToTrain: line.sideToTrain,
        moves: subline.moves,
      });
      return {
        hash: hashSublineCanonicalKey(canonicalKey),
        canonicalKeyVersion: SUBLINE_KEY_VERSION,
        lineId: line.id,
        lineName: line.name,
        lineSideToTrain: line.sideToTrain,
        lineStartingFen: line.startingFen,
        chapterId: line.chapter.id,
        chapterName: line.chapter.name,
        courseId: line.chapter.courseId,
        leafNodeId: subline.leafNodeId,
        moves: subline.moves,
        moveText: subline.moves.map((move) => move.moveSan || move.moveUci).join(' '),
      };
    });
  });
}

export async function getAvailableSublineRows(
  userId: number,
  scope: SublineScope,
): Promise<HashedAvailableSublineDto[] | null> {
  const lines = await loadLines(userId, scope);
  if (!lines) return null;
  return getAvailableSublineRowsForLines(lines);
}

export function pickRandomSubline<T extends { hash: string }>(sublines: T[], recentHashes: string[] = []): T | null {
  if (sublines.length === 0) return null;
  const recent = new Set(recentHashes);
  const fresh = sublines.filter((subline) => !recent.has(subline.hash));
  const candidates = fresh.length > 0 ? fresh : sublines;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export async function pickWeakSubline(
  userId: number,
  sublines: HashedAvailableSublineDto[],
  recentHashes: string[] = [],
): Promise<HashedAvailableSublineDto | null> {
  const weak = await getWeakSublinePool(userId, sublines);
  return pickRandomSubline(weak, recentHashes);
}

export async function getWeakSublinePool(
  userId: number,
  sublines: HashedAvailableSublineDto[],
): Promise<HashedAvailableSublineDto[]> {
  if (sublines.length === 0) return [];

  const lineIds = [...new Set(sublines.map((subline) => subline.lineId))];
  const hashes = [...new Set(sublines.map((subline) => subline.hash))];
  const attempts = await prisma.trainingSublineAttempt.findMany({
    where: {
      userId,
      lineId: { in: lineIds },
      sublineHash: { in: hashes },
      result: { in: ['PASSED', 'FAILED'] },
    },
    orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
  });

  const bySubline = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    const key = `${attempt.lineId}:${attempt.sublineHash}`;
    const list = bySubline.get(key) ?? [];
    if (list.length < TRAINING_STATS_RECENT_ATTEMPTS) {
      list.push(attempt);
      bySubline.set(key, list);
    }
  }

  const ranked = sublines.map((subline) => {
    const recent = bySubline.get(`${subline.lineId}:${subline.hash}`) ?? [];
    const passed = recent.filter((attempt) => attempt.result === 'PASSED' || attempt.passed === true).length;
    return {
      subline,
      passRate: recent.length > 0 ? passed / recent.length : 0,
      recentAttempts: recent.length,
    };
  }).sort((a, b) => a.passRate - b.passRate || a.recentAttempts - b.recentAttempts);

  const take = Math.max(1, Math.ceil(sublines.length * WEAK_SUBLINE_PERCENTAGE));
  return ranked.slice(0, take).map((item) => item.subline);
}
