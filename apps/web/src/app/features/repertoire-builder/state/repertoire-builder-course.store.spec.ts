import { TestBed } from '@angular/core/testing';
import type {
  BuilderCourseReintegrationApplyResponse,
  BuilderCourseReintegrationPreviewResponse,
} from '@chess-trainer/contracts/courses';
import type { RepertoireTarget } from '@chess-trainer/contracts/repertoire-target';
import {
  acceptBuilderDecision,
  completeBuilderBranch,
  completeBuilderSession,
  createBuilderSession,
  normalizeFenForPosition,
  type BuilderSession,
} from 'chess-domain';
import { Chess } from 'chess.js';
import { of } from 'rxjs';
import { RepertoireBuilderApiService } from '../data-access/repertoire-builder-api.service';
import type { RepertoireBuilderCourseEndingLaunch } from '../helpers/repertoire-builder-launch';
import {
  buildRepertoireBuilderTarget,
  defaultRepertoireBuilderSetup,
} from '../helpers/repertoire-builder-target';
import { RepertoireBuilderCourseStore } from './repertoire-builder-course.store';

const STARTING_FEN = new Chess().fen();
const NORMALIZED_STARTING_FEN = normalizeFenForPosition(STARTING_FEN);

const courseEndingLaunch: RepertoireBuilderCourseEndingLaunch = {
  source: 'COURSE_ENDING',
  intent: 'EXTEND_EXISTING_LINE',
  courseId: 1,
  courseName: 'Course',
  chapterId: 2,
  lineId: 13,
  lineName: 'Source line',
  nodeId: 17,
  startingFen: STARTING_FEN,
  side: 'WHITE',
  observedMoveUci: 'e2e4',
  observedMoveSan: 'e4',
  observedGameCount: 8,
  minGames: 4,
  sourceKey: 'start:e2e4',
  sequence: null,
  results: { win: 4, draw: 2, loss: 2, unknown: 0 },
  filterSummary: 'Last 1 month · White games',
  sourceFilters: 'userColor=WHITE',
};

function completedSession(): BuilderSession<RepertoireTarget> {
  const now = '2026-07-29T12:00:00.000Z';
  const target = buildRepertoireBuilderTarget({
    ...defaultRepertoireBuilderSetup(),
    ratingTarget: 'ALL',
  }, null, now, '00000000-0000-4000-8000-000000000099');
  const chess = new Chess();
  const played = chess.move({ from: 'e2', to: 'e4' });
  if (!played) throw new Error('Could not create builder fixture.');
  let session = createBuilderSession({
    sessionId: 'course-store-session',
    ownerId: '42',
    targetSnapshot: {
      contractVersion: target.contractVersion,
      targetId: target.targetId,
      capturedAt: now,
      value: target,
    },
    repertoireSide: 'WHITE',
    startingFen: STARTING_FEN,
    createdAt: now,
  });
  session = acceptBuilderDecision(session, {
    ownerId: '42',
    expectedRevision: 0,
    at: '2026-07-29T12:01:00.000Z',
    branchId: 'root',
    evidence: {
      candidateContractVersion: '2026-07-v1',
      rankingPolicyVersion: '2026-07-deterministic-v1',
      generatedAt: '2026-07-29T12:01:00.000Z',
      normalizedFen: normalizeFenForPosition(session.startingFen),
      sourceVersions: { population: 'test-v1' },
    },
    selectedMoves: [{
      moveUci: 'e2e4',
      moveSan: 'e4',
      resultingFen: chess.fen(),
    }],
  });
  session = completeBuilderBranch(session, {
    ownerId: '42',
    expectedRevision: 1,
    at: '2026-07-29T12:02:00.000Z',
    branchId: 'root/e2e4',
    reason: 'USER_STOP',
  });
  return completeBuilderSession(session, {
    ownerId: '42',
    expectedRevision: 2,
    at: '2026-07-29T12:03:00.000Z',
  });
}

function previewFixture(
  candidates: BuilderCourseReintegrationPreviewResponse['candidates'] = [],
): BuilderCourseReintegrationPreviewResponse {
  return {
    contractVersion: '2026-07-v1',
    previewToken: `sha256:${'a'.repeat(64)}`,
    previewedAt: '2026-07-29T12:04:00.000Z',
    course: { id: 1, name: 'Course', contentRevision: 3 },
    chapter: { id: 2, name: 'Chapter' },
    draft: {
      sessionId: 'course-store-session',
      sessionRevision: 3,
      targetId: '00000000-0000-4000-8000-000000000099',
      targetRevision: 1,
      repertoireSide: 'WHITE',
      materializedDecisionCount: 1,
      materializedMoveCount: 1,
      transpositionLeafCount: 0,
      excludedBranches: [],
    },
    candidates,
    newLine: {
      status: 'CREATES',
      allowed: true,
      equivalentLine: null,
      counts: {
        reusedMoves: 0,
        createdMoves: 1,
        conflictingMoves: 0,
        totalDraftMoves: 1,
        skippedBranches: 0,
      },
      conflicts: [],
      warnings: [],
      previewTree: [],
    },
  };
}

const exactCandidate: BuilderCourseReintegrationPreviewResponse['candidates'][number] = {
  lineId: 13,
  lineName: 'Source line',
  sideToTrain: 'WHITE',
  anchor: {
    kind: 'NODE',
    lineId: 13,
    lineName: 'Source line',
    nodeId: 17,
    fen: STARTING_FEN,
    normalizedFen: NORMALIZED_STARTING_FEN,
    moveSequenceSan: null,
  },
  counts: {
    reusedMoves: 0,
    createdMoves: 1,
    conflictingMoves: 0,
    totalDraftMoves: 1,
    skippedBranches: 0,
  },
  conflicts: [],
  warnings: [],
  previewTree: [],
};

const applyFixture: BuilderCourseReintegrationApplyResponse = {
  contractVersion: '2026-07-v1',
  targetKind: 'NEW_LINE',
  courseId: 1,
  chapterId: 2,
  lineId: 3,
  lineName: 'Reviewed line',
  createdMoves: 1,
  reusedMoves: 0,
  skippedBranches: 0,
  conflictingMoves: 0,
  totalDraftMoves: 1,
  courseContentRevision: 4,
  idempotent: false,
};

const exactApplyFixture: BuilderCourseReintegrationApplyResponse = {
  ...applyFixture,
  targetKind: 'EXISTING_LINE',
  lineId: 13,
  lineName: 'Source line',
};

describe('RepertoireBuilderCourseStore', () => {
  let api: jasmine.SpyObj<RepertoireBuilderApiService>;
  let store: RepertoireBuilderCourseStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<RepertoireBuilderApiService>('RepertoireBuilderApiService', [
      'listCourses',
      'listChapters',
      'previewCourseOutput',
      'applyCourseOutput',
    ]);
    api.listCourses.and.returnValue(of([{ id: 1, name: 'Course' }]));
    api.listChapters.and.returnValue(of([{ id: 2, courseId: 1, name: 'Chapter', sortOrder: 0 }]));
    api.previewCourseOutput.and.returnValue(of(previewFixture()));
    api.applyCourseOutput.and.returnValue(of(applyFixture));
    TestBed.configureTestingModule({
      providers: [
        RepertoireBuilderCourseStore,
        { provide: RepertoireBuilderApiService, useValue: api },
      ],
    });
    store = TestBed.inject(RepertoireBuilderCourseStore);
  });

  it('requires an explicit destination and preview before applying', async () => {
    await store.openFor(completedSession());
    expect(store.open()).toBeTrue();
    expect(store.draft()?.materializedMoveCount).toBe(1);
    expect(store.canPreview()).toBeFalse();

    await store.selectCourse(1);
    store.selectChapter(2);
    store.setNewLineName('Reviewed line');
    expect(store.canPreview()).toBeTrue();

    await store.previewCourseOutput();
    expect(api.previewCourseOutput).toHaveBeenCalledWith(2, jasmine.objectContaining({
      newLineName: 'Reviewed line',
    }));
    expect(store.selectedTarget()).toEqual({ kind: 'NEW_LINE', name: 'Reviewed line' });
    expect(store.canApply()).toBeTrue();

    await store.applyCourseOutput();
    expect(api.applyCourseOutput).toHaveBeenCalledWith(2, jasmine.objectContaining({
      previewToken: `sha256:${'a'.repeat(64)}`,
      target: { kind: 'NEW_LINE', name: 'Reviewed line' },
    }));
    expect(store.result()).toEqual(applyFixture);
  });

  it('locks a Course ending draft to its exact source endpoint', async () => {
    api.previewCourseOutput.and.returnValue(of(previewFixture([exactCandidate])));
    api.applyCourseOutput.and.returnValue(of(exactApplyFixture));

    await store.openFor(completedSession(), courseEndingLaunch);

    expect(store.destinationLocked()).toBeTrue();
    expect(store.selectedCourseId()).toBe(1);
    expect(store.selectedChapterId()).toBe(2);
    expect(store.newLineName()).toBe('Source line');
    expect(store.requiredTarget()).toEqual({
      kind: 'EXISTING_LINE',
      lineId: 13,
      anchor: {
        kind: 'NODE',
        nodeId: 17,
        normalizedFen: NORMALIZED_STARTING_FEN,
      },
    });

    await store.previewCourseOutput();

    expect(store.selectedTarget()).toEqual(store.requiredTarget());
    expect(store.canApply()).toBeTrue();
    store.selectTarget({ kind: 'NEW_LINE', name: 'Another line' });
    expect(store.selectedTarget()).toEqual(store.requiredTarget());

    await store.applyCourseOutput();
    expect(api.applyCourseOutput).toHaveBeenCalledWith(2, jasmine.objectContaining({
      target: store.requiredTarget(),
    }));
    expect(store.result()).toEqual(exactApplyFixture);
  });

  it('fails safely when the exact source endpoint is absent from preview', async () => {
    await store.openFor(completedSession(), courseEndingLaunch);
    await store.previewCourseOutput();

    expect(store.selectedTarget()).toBeNull();
    expect(store.canApply()).toBeFalse();
    expect(store.error()).toContain('no longer matches');
  });

  it('invalidates a preview when destination details change', async () => {
    await store.openFor(completedSession());
    await store.selectCourse(1);
    store.selectChapter(2);
    store.setNewLineName('First name');
    await store.previewCourseOutput();
    expect(store.preview()).not.toBeNull();

    store.setNewLineName('Second name');

    expect(store.preview()).toBeNull();
    expect(store.selectedTarget()).toBeNull();
    expect(store.result()).toBeNull();
  });
});
