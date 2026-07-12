import { createHash } from 'crypto';
import { buildSublineCanonicalKey, extractAvailableSublines, SUBLINE_KEY_VERSION } from 'chess-domain';
import { TRAINING_STATS_RECENT_ATTEMPTS, WEAK_SUBLINE_PERCENTAGE } from '../training/training.constants';
import { groupRecentAttempts, loadRecentScoredAttempts, sublineIdentityKey, summarizeRecentAttempts } from '../training/recent-scored-attempts';
import { buildMoveTreeFromNodes } from '../../utils/move-tree-builder';
import { performanceDebug } from '../../utils/performance-debug';
import {
  getChapterById,
  getChapterLinesWithMoves,
  getCourseById,
  getCourseLinesWithMoves,
  getLineWithMoves,
  getLinesWithMoves,
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

export interface DerivedLineData {
  line: {
    id: number;
    name: string;
    sideToTrain: 'WHITE' | 'BLACK';
    startingFen: string;
    chapterId: number;
    chapterName: string;
    courseId: number;
  };
  tree: ReturnType<typeof buildMoveTreeFromNodes>;
  sublines: HashedAvailableSublineDto[];
}

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

export async function getDerivedLineData(
  userId: number,
  scope: SublineScope,
): Promise<DerivedLineData[] | null> {
  const queryStartedAt = performance.now();
  const lines = await loadLines(userId, scope);
  performanceDebug('line-database-query', queryStartedAt, { scope: scope.type, lines: lines?.length ?? 0, moveNodes: lines?.reduce((sum, line) => sum + line.moves.length, 0) ?? 0 });
  if (!lines) return null;
  const derivationStartedAt = performance.now();
  const derived = lines.map(deriveLineData);
  performanceDebug('move-tree-and-subline-derivation', derivationStartedAt, { lines: derived.length, sublines: derived.reduce((sum, line) => sum + line.sublines.length, 0) });
  return derived;
}

export async function getDerivedSelectedLines(userId: number, lineIds: number[]): Promise<DerivedLineData[]> {
  const queryStartedAt = performance.now();
  const lines = await getLinesWithMoves(userId, lineIds);
  performanceDebug('selected-line-database-query', queryStartedAt, { requestedLines: lineIds.length, lines: lines.length, moveNodes: lines.reduce((sum, line) => sum + line.moves.length, 0) });
  const derivationStartedAt = performance.now();
  const derived = lines.map(deriveLineData);
  performanceDebug('selected-move-tree-and-subline-derivation', derivationStartedAt, { lines: derived.length, sublines: derived.reduce((sum, line) => sum + line.sublines.length, 0) });
  return derived;
}

export function getAvailableSublineRowsForLines(lines: any[]): HashedAvailableSublineDto[] {
  return lines.flatMap((line) => {
    const tree = buildMoveTreeFromNodes(line.moves, line);
    return sublinesForTree(line, tree);
  });
}

function sublinesForTree(line: any, tree: ReturnType<typeof buildMoveTreeFromNodes>): HashedAvailableSublineDto[] {
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
}

export function deriveLineData(line: any): DerivedLineData {
  const tree = buildMoveTreeFromNodes(line.moves, line);
  const sublines = sublinesForTree(line, tree);
  return {
    line: {
      id: line.id,
      name: line.name,
      sideToTrain: line.sideToTrain,
      startingFen: line.startingFen,
      chapterId: line.chapter.id,
      chapterName: line.chapter.name,
      courseId: line.chapter.courseId,
    },
    tree,
    sublines,
  };
}

export async function getAvailableSublineRows(
  userId: number,
  scope: SublineScope,
): Promise<HashedAvailableSublineDto[] | null> {
  const lines = await getDerivedLineData(userId, scope);
  return lines ? lines.flatMap((line) => line.sublines) : null;
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

  const bySubline = groupRecentAttempts(await loadRecentScoredAttempts(userId, sublines.map(({ lineId, hash }) => ({ lineId, sublineHash: hash }))));
  return getWeakSublinePoolFromAttempts(sublines, bySubline);
}

export function getWeakSublinePoolFromAttempts(
  sublines: HashedAvailableSublineDto[],
  bySubline: ReturnType<typeof groupRecentAttempts>,
): HashedAvailableSublineDto[] {
  const ranked = sublines.map((subline) => {
    const recent = bySubline.get(sublineIdentityKey({ lineId: subline.lineId, sublineHash: subline.hash })) ?? [];
    const { passRate } = summarizeRecentAttempts(recent);
    return {
      subline,
      passRate,
      recentAttempts: recent.length,
    };
  }).sort((a, b) => a.passRate - b.passRate || a.recentAttempts - b.recentAttempts);

  const take = Math.max(1, Math.ceil(sublines.length * WEAK_SUBLINE_PERCENTAGE));
  return ranked.slice(0, take).map((item) => item.subline);
}
