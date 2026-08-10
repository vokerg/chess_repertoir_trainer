import { TestBed } from '@angular/core/testing';
import {
  CANDIDATE_DECISION_CONTRACT_VERSION,
  CANDIDATE_RANKING_POLICY_VERSION,
  type CandidateDecisionCandidate,
  type CandidateDecisionResponse,
  type CandidateDecisionRole,
} from '@chess-trainer/contracts/candidate-decision';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PositionAnalysisCacheService } from '../../../shared/chess/engine/position-analysis-cache.service';
import type { EngineAnalysis } from '../../../shared/chess/engine/stockfish-analysis.service';
import { RepertoireBuilderApiService } from '../data-access/repertoire-builder-api.service';
import type { RepertoireBuilderCourseEndingLaunch } from '../helpers/repertoire-builder-launch';
import { defaultRepertoireBuilderSetup } from '../helpers/repertoire-builder-target';
import { RepertoireBuilderStore } from './repertoire-builder.store';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const AFTER_D4 = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1';
const AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

const courseEndingLaunch: RepertoireBuilderCourseEndingLaunch = {
  source: 'COURSE_ENDING',
  intent: 'EXTEND_EXISTING_LINE',
  courseId: 7,
  courseName: 'White repertoire',
  chapterId: 11,
  lineId: 13,
  lineName: 'Open game',
  nodeId: 17,
  startingFen: AFTER_E4,
  side: 'WHITE',
  observedMoveUci: 'e7e5',
  observedMoveSan: 'e5',
  observedGameCount: 8,
  minGames: 4,
  sourceKey: 'after-e4:e7e5',
  sequence: '1. e4',
  results: { win: 3, draw: 2, loss: 3, unknown: 0 },
  filterSummary: 'Last 1 month · White games',
  sourceFilters: 'userColor=WHITE',
};

function explicitSetup() {
  return {
    ...defaultRepertoireBuilderSetup(),
    ratingTarget: 'GROUP' as const,
    ratingGroup: 1400 as const,
  };
}

function responseFixture(
  role: CandidateDecisionRole,
  candidates: CandidateDecisionCandidate[],
  generatedAt = '2026-07-29T08:00:00.000Z',
): CandidateDecisionResponse {
  return {
    contractVersion: CANDIDATE_DECISION_CONTRACT_VERSION,
    rankingPolicyVersion: CANDIDATE_RANKING_POLICY_VERSION,
    generatedAt,
    targetId: '00000000-0000-4000-8000-000000000010',
    decisionRole: role,
    fen: role === 'USER_MOVE' ? START_FEN : AFTER_E4,
    normalizedFen:
      role === 'USER_MOVE'
        ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -'
        : 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKQkq -',
    sideToMove: role === 'USER_MOVE' ? 'WHITE' : 'BLACK',
    legalMoveCount: 20,
    returnedCandidateCount: candidates.length,
    omittedLegalMoveCount: 20 - candidates.length,
    requestedMoveIncluded: candidates.some((candidate) => candidate.manuallyRequested),
    sourceSummary: {
      engine: 'AVAILABLE',
      masters: 'AVAILABLE',
      population: 'AVAILABLE',
      personal: 'INSUFFICIENT',
      opening: 'AVAILABLE',
      courses: 'AVAILABLE',
      playerProfile: 'INSUFFICIENT',
    },
    candidates,
  };
}

function candidateFixture(input: {
  moveUci: string;
  moveSan: string;
  resultingFen: string;
  rank?: number;
  contributionPercent?: number | null;
  manuallyRequested?: boolean;
  knowledgePlanId?: string;
}): CandidateDecisionCandidate {
  const knowledgePlanId = input.knowledgePlanId ?? `${input.moveUci}-plan`;
  return {
    rank: input.rank ?? 1,
    moveUci: input.moveUci,
    moveSan: input.moveSan,
    resultingFen: input.resultingFen,
    previewUci: [input.moveUci],
    manuallyRequested: input.manuallyRequested ?? false,
    eligibility: { status: 'ELIGIBLE', reasonCodes: [], warningCodes: [] },
    targetFit: { status: 'ALIGNED', reasonCodes: ['TARGET_CHARACTER_MATCH'] },
    profileFit: { status: 'NEUTRAL', reasonCodes: [] },
    components: {
      objective: 10,
      population: 10,
      masters: 5,
      personal: 0,
      targetFit: 10,
      profileFit: 0,
      course: 0,
    },
    reasonCodes: ['TARGET_CHARACTER_MATCH'],
    warningCodes: [],
    coverage:
      input.contributionPercent === undefined
        ? null
        : {
            contributionPercent: input.contributionPercent,
            cumulativePercent: input.contributionPercent,
          },
    evidence: {
      engine: {
        status: 'AVAILABLE',
        depth: 16,
        multipv: 1,
        scoreCpForTarget: 25,
        mateForTarget: null,
        objectiveDeltaCp: 0,
        pvUci: [input.moveUci],
      },
      masters: {
        status: 'AVAILABLE',
        games: 100,
        frequencyPercent: 40,
        scorePercentForTarget: 52,
        averageRating: 2300,
        datasetVersion: 'masters-v1',
        fetchedAt: '2026-07-29T08:00:00.000Z',
        representativeGameId: 'masters-1',
      },
      population: {
        status: 'AVAILABLE',
        games: 1000,
        frequencyPercent: 45,
        scorePercentForTarget: 51,
        averageRating: 1500,
        datasetVersion: 'population-v1',
        fetchedAt: '2026-07-29T08:00:00.000Z',
        representativeGameId: 'population-1',
      },
      personal: { status: 'INSUFFICIENT', occurrences: 0, games: 0, scorePercent: null },
      opening: {
        status: 'AVAILABLE',
        opening: { eco: 'B00', name: 'King Pawn Opening' },
        classificationVersion: 'opening-v1',
        side: 'WHITE',
        soundness: 'SOUND',
        character: ['BALANCED'],
        theoreticalStatus: 'MAINLINE',
        theoryBurden: 'MEDIUM',
        roles: [],
        confidence: 'HIGH',
        matchedRuleIds: ['test'],
        knowledge: {
          status: 'AVAILABLE',
          version: '2026-08-knowledge-v1',
          shortDescription: { text: `${input.moveSan} opening description`, confidence: 'HIGH' },
          strategicSummary: { text: `${input.moveSan} strategic summary`, confidence: 'MEDIUM' },
          plans: [
            {
              id: knowledgePlanId,
              title: `${input.moveSan} plan`,
              summary: `Plan for ${input.moveSan}`,
              conditions: [],
              caveats: [],
              confidence: 'MEDIUM',
            },
          ],
          matchedRuleIds: [`knowledge-${input.moveUci}`],
          sourceIds: ['project-editorial-rb-022'],
        },
      },
      course: {
        status: 'AVAILABLE',
        covered: false,
        conflict: false,
        transposesToCoveredPosition: false,
        references: [],
      },
      playerProfile: { status: 'INSUFFICIENT', generatedAt: null, matches: [] },
    },
  };
}

describe('RepertoireBuilderStore', () => {
  let api: jasmine.SpyObj<RepertoireBuilderApiService>;
  let positionAnalysis: {
    state$: BehaviorSubject<EngineAnalysis>;
    getOrAnalyzeRichPosition: jasmine.Spy;
    getOrAnalyzeCompactGamePosition: jasmine.Spy;
    flushPendingPositionAnalysisSaves: jasmine.Spy;
    stop: jasmine.Spy;
  };
  let store: RepertoireBuilderStore;

  const e4 = candidateFixture({
    moveUci: 'e2e4',
    moveSan: 'e4',
    resultingFen: AFTER_E4,
    knowledgePlanId: 'e4-plan',
  });
  const e5 = candidateFixture({
    moveUci: 'e7e5',
    moveSan: 'e5',
    resultingFen: AFTER_E4_E5,
    contributionPercent: 42,
    manuallyRequested: true,
    knowledgePlanId: 'e5-plan',
  });

  beforeEach(() => {
    api = jasmine.createSpyObj<RepertoireBuilderApiService>('RepertoireBuilderApiService', [
      'getCandidates',
      'getPopulation',
    ]);
    positionAnalysis = {
      getOrAnalyzeRichPosition: jasmine.createSpy('getOrAnalyzeRichPosition'),
      getOrAnalyzeCompactGamePosition: jasmine.createSpy('getOrAnalyzeCompactGamePosition'),
      flushPendingPositionAnalysisSaves: jasmine.createSpy('flushPendingPositionAnalysisSaves'),
      stop: jasmine.createSpy('stop'),
      state$: new BehaviorSubject<EngineAnalysis>({
        fen: '',
        running: false,
        ready: false,
        error: null,
        bestMove: null,
        lines: [],
      }),
    };
    positionAnalysis.flushPendingPositionAnalysisSaves.and.resolveTo();
    const auth = {
      initialize: jasmine.createSpy('initialize').and.resolveTo(),
      appUser: () => ({
        user: {
          id: 42,
          displayName: 'Builder user',
          authProvider: 'dev',
          authSubject: 'dev-user',
          email: 'builder@example.test',
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
        auth: { userId: 42, provider: 'dev', externalSubject: 'dev-user' },
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        RepertoireBuilderStore,
        { provide: RepertoireBuilderApiService, useValue: api },
        { provide: AuthService, useValue: auth },
        { provide: PositionAnalysisCacheService, useValue: positionAnalysis },
      ],
    });
    store = TestBed.inject(RepertoireBuilderStore);
  });

  it('starts an owned route-local session and requests bounded user candidates', async () => {
    api.getCandidates.and.returnValue(of(responseFixture('USER_MOVE', [e4])));

    await store.start(explicitSetup());

    expect(store.session()?.ownerId).toBe('42');
    expect(store.activeBranch()?.role).toBe('USER_MOVE');
    expect(store.candidateResponse()?.candidates[0].moveUci).toBe('e2e4');
    expect(api.getPopulation).not.toHaveBeenCalled();
    expect(api.getCandidates).toHaveBeenCalledWith(
      jasmine.objectContaining({
        decisionRole: 'USER_MOVE',
        candidateLimit: 6,
      }),
    );
  });

  it('keeps focused opening knowledge attached to the selected candidate', async () => {
    const d4 = candidateFixture({
      moveUci: 'd2d4',
      moveSan: 'd4',
      resultingFen: AFTER_D4,
      rank: 2,
      knowledgePlanId: 'd4-plan',
    });
    api.getCandidates.and.returnValue(of(responseFixture('USER_MOVE', [e4, d4])));
    await store.start(explicitSetup());

    expect(store.previewCandidate()?.evidence.opening.knowledge.plans[0].id).toBe('e4-plan');

    store.selectCandidate('d2d4');

    expect(store.previewCandidate()?.moveUci).toBe('d2d4');
    expect(store.previewCandidate()?.evidence.opening.knowledge.plans[0].id).toBe('d4-plan');
  });

  it('calculates and persists missing candidate engine impact in the browser', async () => {
    const d4 = candidateFixture({
      moveUci: 'd2d4',
      moveSan: 'd4',
      resultingFen: AFTER_D4,
      rank: 2,
    });
    d4.evidence.engine = {
      status: 'INSUFFICIENT',
      depth: null,
      multipv: null,
      scoreCpForTarget: null,
      mateForTarget: null,
      objectiveDeltaCp: null,
      pvUci: [],
    };
    positionAnalysis.getOrAnalyzeRichPosition.and.resolveTo({
      fen: START_FEN,
      bestMoveUci: 'e2e4',
      bestScoreCpWhite: 25,
      lines: [
        {
          moveUci: 'e2e4',
          scoreCpWhite: 25,
          depth: 18,
          pvUci: ['e2e4'],
        },
      ],
      fromCache: true,
    });
    positionAnalysis.getOrAnalyzeCompactGamePosition.and.resolveTo({
      fen: AFTER_D4,
      bestMoveUci: 'd7d5',
      bestScoreCpWhite: -15,
      lines: [{ depth: 12, moveUci: 'd7d5', scoreCpWhite: -15, pvUci: ['d7d5'] }],
      fromCache: false,
    });
    api.getCandidates.and.returnValue(of(responseFixture('USER_MOVE', [e4, d4])));

    await store.start(explicitSetup());
    await flushAsync();

    expect(positionAnalysis.getOrAnalyzeRichPosition).toHaveBeenCalledWith(START_FEN, {
      keepAlive: true,
    });
    expect(positionAnalysis.getOrAnalyzeCompactGamePosition).toHaveBeenCalledWith(AFTER_D4, {
      keepAlive: true,
    });
    expect(positionAnalysis.flushPendingPositionAnalysisSaves).toHaveBeenCalled();
    expect(store.engineImpacts()['d2d4']).toEqual(
      jasmine.objectContaining({
        status: 'AVAILABLE',
        source: 'BROWSER',
        persistence: 'SAVED',
        scoreCpForTarget: -15,
        objectiveDeltaCp: 40,
      }),
    );
  });

  it('starts at the exact Course ending and includes the observed continuation', async () => {
    api.getCandidates.and.returnValue(of(responseFixture('OPPONENT_RESPONSE', [e5])));

    await store.start(explicitSetup(), courseEndingLaunch);

    expect(store.session()?.startingFen).toBe(AFTER_E4);
    expect(store.session()?.targetSnapshot.value.startingPoint).toEqual({
      kind: 'COURSE_POSITION',
      courseId: 7,
      lineId: 13,
    });
    expect(store.activeBranch()?.role).toBe('OPPONENT_RESPONSE');
    expect(store.previewCandidate()?.moveUci).toBe('e7e5');
    expect(api.getCandidates).toHaveBeenCalledWith(
      jasmine.objectContaining({
        fen: AFTER_E4,
        decisionRole: 'OPPONENT_RESPONSE',
        includeMoveUci: 'e7e5',
      }),
    );
  });

  it('accepts a user move and advances to opponent-response coverage', async () => {
    api.getCandidates.and.returnValues(
      of(responseFixture('USER_MOVE', [e4])),
      of(responseFixture('OPPONENT_RESPONSE', [e5])),
    );
    await store.start(explicitSetup());

    await store.acceptCurrentDecision();

    expect(store.activeBranch()?.role).toBe('OPPONENT_RESPONSE');
    expect(store.queue().length).toBe(1);
    expect(store.acceptedDecisionCount()).toBe(1);
    expect(store.candidateResponse()?.decisionRole).toBe('OPPONENT_RESPONSE');
  });

  it('keeps opponent-response preview separate from multi-selection and sums coverage', async () => {
    const d5 = candidateFixture({
      moveUci: 'd7d5',
      moveSan: 'd5',
      resultingFen: AFTER_E4_E5,
      rank: 2,
      contributionPercent: 23,
      knowledgePlanId: 'd5-plan',
    });
    api.getCandidates.and.returnValue(of(responseFixture('OPPONENT_RESPONSE', [e5, d5])));

    await store.start(explicitSetup(), courseEndingLaunch);

    store.toggleResponse('e7e5');
    store.toggleResponse('d7d5');
    store.selectCandidate('e7e5');

    expect(store.selectedResponseUcis()).toEqual(['e7e5', 'd7d5']);
    expect(store.selectedCoveragePercent()).toBe(65);
    expect(store.previewCandidate()?.moveUci).toBe('e7e5');
  });

  it('keeps deferred work visible and allows it to be reopened', async () => {
    api.getCandidates.and.returnValues(
      of(responseFixture('USER_MOVE', [e4])),
      of(responseFixture('USER_MOVE', [e4], '2026-07-29T08:05:00.000Z')),
    );
    await store.start(explicitSetup());

    await store.deferActiveBranch();
    const deferred = store.deferredBranches()[0];
    expect(store.activeBranch()).toBeNull();
    expect(deferred.status).toBe('DEFERRED');

    await store.reopenBranch(deferred.id);
    expect(store.activeBranch()?.id).toBe(deferred.id);
    expect(store.activeBranch()?.status).toBe('PENDING');
  });

  it('does not ignore the only branch and leave the draft without a useful next action', async () => {
    api.getCandidates.and.returnValue(of(responseFixture('USER_MOVE', [e4])));
    await store.start(explicitSetup());

    await store.ignoreActiveBranch();

    expect(store.activeBranch()?.status).toBe('PENDING');
    expect(store.queue()).toHaveSize(1);
    expect(store.commandError()).toBe('Abandon the draft instead of ignoring its only branch.');
  });

  it('reloads candidates with a legal manual board move', async () => {
    const d4 = candidateFixture({
      moveUci: 'd2d4',
      moveSan: 'd4',
      resultingFen: AFTER_D4,
      rank: 2,
      manuallyRequested: true,
      knowledgePlanId: 'd4-plan',
    });
    api.getCandidates.and.returnValues(
      of(responseFixture('USER_MOVE', [e4])),
      of(responseFixture('USER_MOVE', [e4, d4], '2026-07-29T08:10:00.000Z')),
    );
    await store.start(explicitSetup());

    await store.selectBoardMove('d2d4');

    expect(api.getCandidates.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({
        includeMoveUci: 'd2d4',
      }),
    );
    expect(store.previewCandidate()?.moveUci).toBe('d2d4');
    expect(store.previewCandidate()?.evidence.opening.knowledge.plans[0].id).toBe('d4-plan');
  });

  it('ignores a stale candidate response after a later draft has loaded', async () => {
    const first = new Subject<CandidateDecisionResponse>();
    const second = new Subject<CandidateDecisionResponse>();
    api.getCandidates.and.returnValues(first.asObservable(), second.asObservable());

    const firstStart = store.start(explicitSetup());
    await Promise.resolve();
    const secondStart = store.start({ ...explicitSetup(), side: 'BLACK' });
    await Promise.resolve();

    second.next(responseFixture('USER_MOVE', [e4], '2026-07-29T08:20:00.000Z'));
    second.complete();
    await secondStart;
    first.next(responseFixture('USER_MOVE', [e4], '2026-07-29T08:15:00.000Z'));
    first.complete();
    await firstStart;

    expect(store.session()?.repertoireSide).toBe('BLACK');
    expect(store.candidateResponse()?.generatedAt).toBe('2026-07-29T08:20:00.000Z');
  });
});

function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
