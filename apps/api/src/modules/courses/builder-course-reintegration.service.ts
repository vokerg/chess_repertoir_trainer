import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION,
  type BuilderCourseDraft,
  type BuilderCourseReintegrationApplyRequest,
  type BuilderCourseReintegrationApplyResponse,
  type BuilderCourseReintegrationPreviewRequest,
  type BuilderCourseReintegrationPreviewResponse,
} from '@chess-trainer/contracts/courses';
import {
  normalizeFenForPosition,
  previewChapterReintegration,
  previewMergeIntoLine,
  type LineMergeCandidate,
  type MergePreviewCounts,
  type RepertoireLineInput,
} from 'chess-domain';
import prisma from '../../prisma';
import {
  getChapterLinesWithMoves,
  getChapterWithCourse,
  getCourseLinesWithMoves,
  type DbClient,
} from './courses.repository.prisma';
import {
  AnalysisReintegrationError,
  applyAnalysisReintegrationInTransaction,
  toRepertoireLineInput,
} from './analysis-reintegration.service';

interface PreparedBuilderPreview {
  response: BuilderCourseReintegrationPreviewResponse;
  deterministic: Omit<BuilderCourseReintegrationPreviewResponse, 'previewToken' | 'previewedAt'>;
}

export const BuilderCourseReintegrationService = {
  previewChapter: async (
    userId: number,
    chapterId: number,
    input: BuilderCourseReintegrationPreviewRequest,
  ): Promise<BuilderCourseReintegrationPreviewResponse> => (
    await preparePreview(userId, chapterId, input.draft, input.newLineName, prisma)
  ).response,

  applyToChapter: async (
    userId: number,
    chapterId: number,
    input: BuilderCourseReintegrationApplyRequest,
  ): Promise<BuilderCourseReintegrationApplyResponse> => prisma.$transaction(async (tx) => {
    const prepared = await preparePreview(userId, chapterId, input.draft, input.newLineName, tx);
    if (prepared.response.previewToken !== input.previewToken) {
      throw new AnalysisReintegrationError(
        'Builder course preview is stale. Preview the current draft and course again before applying.',
        409,
      );
    }

    const target = input.target;
    if (target.kind === 'NEW_LINE') {
      if (target.name.trim() !== input.newLineName.trim()) {
        throw new AnalysisReintegrationError(
          'New-line details changed after preview. Preview again before applying.',
          409,
        );
      }
      const newLine = prepared.response.newLine;
      if (!newLine.allowed || newLine.counts.conflictingMoves > 0) {
        throw new AnalysisReintegrationError(
          'Builder draft has repertoire conflicts.',
          409,
          newLine.conflicts,
        );
      }
      if (newLine.status === 'REUSES_EXISTING_LINE' && newLine.equivalentLine) {
        return applyResponse({
          targetKind: 'NEW_LINE',
          courseId: prepared.response.course.id,
          chapterId,
          lineId: newLine.equivalentLine.lineId,
          lineName: newLine.equivalentLine.lineName,
          createdMoves: 0,
          reusedMoves: input.draft.materializedMoveCount,
          draft: input.draft,
          courseContentRevision: prepared.response.course.contentRevision,
          idempotent: true,
        });
      }

      const result = await applyAnalysisReintegrationInTransaction(tx, userId, chapterId, {
        analysisTree: input.draft.analysisTree,
        target: {
          kind: 'NEW_LINE',
          name: target.name.trim(),
          sideToTrain: input.draft.repertoireSide,
          allowConflicts: false,
        },
      });
      const revision = await currentCourseRevision(tx, prepared.response.course.id);
      return applyResponse({
        ...result,
        courseId: prepared.response.course.id,
        chapterId,
        draft: input.draft,
        courseContentRevision: revision,
        idempotent: result.createdMoves === 0,
      });
    }

    const candidate = prepared.response.candidates.find((item) => (
      item.lineId === target.lineId
      && item.anchor.kind === target.anchor.kind
      && item.anchor.nodeId === target.anchor.nodeId
      && item.anchor.normalizedFen === target.anchor.normalizedFen
    ));
    if (!candidate) {
      throw new AnalysisReintegrationError(
        'Selected builder reintegration target is stale or was not included in the preview.',
        409,
      );
    }
    if (candidate.counts.conflictingMoves > 0) {
      throw new AnalysisReintegrationError(
        'Builder draft has repertoire conflicts.',
        409,
        candidate.conflicts,
      );
    }

    const result = await applyAnalysisReintegrationInTransaction(tx, userId, chapterId, {
      analysisTree: input.draft.analysisTree,
      target: {
        kind: 'EXISTING_LINE',
        lineId: target.lineId,
        anchor: target.anchor,
        allowConflicts: false,
      },
    });
    const revision = await currentCourseRevision(tx, prepared.response.course.id);
    return applyResponse({
      ...result,
      courseId: prepared.response.course.id,
      chapterId,
      draft: input.draft,
      courseContentRevision: revision,
      idempotent: result.createdMoves === 0,
    });
  }),
};

async function preparePreview(
  userId: number,
  chapterId: number,
  draft: BuilderCourseDraft,
  newLineName: string,
  db: DbClient,
): Promise<PreparedBuilderPreview> {
  assertDraftOwner(userId, draft);
  const chapter = await getChapterWithCourse(userId, chapterId, db);
  if (!chapter) throw new AnalysisReintegrationError('Chapter not found', 404);
  const [chapterRows, courseRows] = await Promise.all([
    getChapterLinesWithMoves(userId, chapterId, db),
    getCourseLinesWithMoves(userId, chapter.courseId, db),
  ]);
  const chapterLines = chapterRows.map(toRepertoireLineInput);
  const courseLines = courseRows.map(toRepertoireLineInput);
  const preview = previewChapterReintegration({
    analysisTree: draft.analysisTree,
    chapterLines,
    courseLines,
    newLineName: newLineName.trim(),
    newLineSideToTrain: draft.repertoireSide,
  });
  const candidates = preview.candidates
    .filter((candidate) => candidate.sideToTrain === draft.repertoireSide)
    .map((candidate) => mapCandidate(candidate, draft));
  const equivalent = findEquivalentLine(
    draft,
    newLineName.trim(),
    chapterLines,
    courseLines,
  );
  const transpositionWarning = draft.transpositionLeafCount > 0
    ? [`${draft.transpositionLeafCount} transposition path${draft.transpositionLeafCount === 1 ? '' : 's'} end at an already represented builder position.`]
    : [];
  const newLine = equivalent
    ? {
        status: 'REUSES_EXISTING_LINE' as const,
        allowed: true,
        equivalentLine: { lineId: equivalent.lineId, lineName: equivalent.lineName },
        counts: withDraftCounts({
          reusedMoves: draft.materializedMoveCount,
          createdMoves: 0,
          conflictingMoves: 0,
          totalAnalysisMoves: draft.materializedMoveCount,
        }, draft),
        conflicts: [],
        warnings: [...equivalent.warnings, ...transpositionWarning],
        previewTree: equivalent.previewTree,
      }
    : {
        status: preview.newLine.counts.conflictingMoves > 0 ? 'CONFLICT' as const : 'CREATES' as const,
        allowed: preview.newLine.counts.conflictingMoves === 0,
        equivalentLine: null,
        counts: withDraftCounts(preview.newLine.counts, draft),
        conflicts: preview.newLine.conflicts,
        warnings: [...preview.newLine.warnings, ...transpositionWarning],
        previewTree: preview.newLine.previewTree,
      };
  const deterministic: PreparedBuilderPreview['deterministic'] = {
    contractVersion: BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION,
    course: {
      id: chapter.course.id,
      name: chapter.course.name,
      contentRevision: chapter.course.contentRevision,
    },
    chapter: { id: chapter.id, name: chapter.name },
    draft: {
      sessionId: draft.sessionId,
      sessionRevision: draft.sessionRevision,
      targetId: draft.targetId,
      targetRevision: draft.targetRevision,
      repertoireSide: draft.repertoireSide,
      materializedDecisionCount: draft.materializedDecisionCount,
      materializedMoveCount: draft.materializedMoveCount,
      transpositionLeafCount: draft.transpositionLeafCount,
      excludedBranches: draft.excludedBranches,
    },
    candidates,
    newLine,
  };
  const previewToken = hashPreview({
    userId,
    chapterId,
    newLineName: newLineName.trim(),
    draft,
    preview: deterministic,
  });
  return {
    deterministic,
    response: {
      ...deterministic,
      previewToken,
      previewedAt: new Date().toISOString(),
    },
  };
}

function assertDraftOwner(userId: number, draft: BuilderCourseDraft): void {
  if (draft.ownerId !== String(userId)) {
    throw new AnalysisReintegrationError('Builder draft does not belong to the current user.', 403);
  }
}

function mapCandidate(candidate: LineMergeCandidate, draft: BuilderCourseDraft) {
  return {
    ...candidate,
    counts: withDraftCounts(candidate.counts, draft),
  };
}

function withDraftCounts(counts: MergePreviewCounts, draft: BuilderCourseDraft) {
  return {
    reusedMoves: counts.reusedMoves,
    createdMoves: counts.createdMoves,
    conflictingMoves: counts.conflictingMoves,
    totalDraftMoves: draft.materializedMoveCount,
    skippedBranches: draft.excludedBranches.length,
  };
}

function findEquivalentLine(
  draft: BuilderCourseDraft,
  newLineName: string,
  chapterLines: RepertoireLineInput[],
  courseLines: RepertoireLineInput[],
): LineMergeCandidate | null {
  const normalizedRoot = normalizeFenForPosition(draft.startingFen);
  for (const line of chapterLines) {
    if (
      line.name !== newLineName
      || line.sideToTrain !== draft.repertoireSide
      || normalizeFenForPosition(line.startingFen) !== normalizedRoot
    ) continue;
    const candidate = previewMergeIntoLine({
      analysisTree: draft.analysisTree,
      line,
      anchor: {
        kind: 'LINE_START',
        lineId: line.id,
        lineName: line.name,
        nodeId: null,
        fen: line.startingFen,
        normalizedFen: normalizedRoot,
        moveSequenceSan: null,
      },
      courseLines,
    });
    if (
      candidate.counts.createdMoves === 0
      && candidate.counts.conflictingMoves === 0
      && candidate.counts.reusedMoves === draft.materializedMoveCount
    ) return candidate;
  }
  return null;
}

function hashPreview(value: unknown): string {
  const encoded = JSON.stringify(stableValue(value));
  return `sha256:${createHash('sha256').update(encoded).digest('hex')}`;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

async function currentCourseRevision(tx: Prisma.TransactionClient, courseId: number): Promise<number> {
  return (await tx.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { contentRevision: true },
  })).contentRevision;
}

function applyResponse(input: {
  targetKind: 'EXISTING_LINE' | 'NEW_LINE';
  courseId: number;
  chapterId: number;
  lineId: number;
  lineName: string;
  createdMoves: number;
  reusedMoves: number;
  draft: BuilderCourseDraft;
  courseContentRevision: number;
  idempotent: boolean;
}): BuilderCourseReintegrationApplyResponse {
  return {
    contractVersion: BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION,
    targetKind: input.targetKind,
    courseId: input.courseId,
    chapterId: input.chapterId,
    lineId: input.lineId,
    lineName: input.lineName,
    createdMoves: input.createdMoves,
    reusedMoves: input.reusedMoves,
    skippedBranches: input.draft.excludedBranches.length,
    conflictingMoves: 0,
    totalDraftMoves: input.draft.materializedMoveCount,
    courseContentRevision: input.courseContentRevision,
    idempotent: input.idempotent,
  };
}
