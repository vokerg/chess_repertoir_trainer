import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import type { PlayerChessProfileResponse } from '@chess-trainer/contracts/player-chess-profile';
import { PlayerChessProfileApiService } from '../data-access/player-chess-profile-api.service';
import { PlayerChessProfileStore } from './player-chess-profile.store';

function profileFixture(
  games: number,
  summary = 'Dynamic openings were preferred',
): PlayerChessProfileResponse {
  return {
    generatedAt: '2026-07-28T08:00:00.000Z',
    filters: {
      range: { from: '2026-04-28', to: '2026-07-28' },
      speedPreset: 'BLITZ_AND_SLOWER',
      speeds: ['blitz', 'rapid'],
      colors: ['WHITE', 'BLACK'],
      rated: true,
    },
    peerLevel: {
      evidencePeriod: 'RECENT_THREE_MONTHS',
      eligibleGames: games,
      selectedGroups: [1400],
      distribution: [{ group: 1400, games }],
      contributions: [],
      normalizationProfile: {
        id: 'universal-online-strength',
        version: '2026-07-lichess-bands-v1',
      },
      resolverPolicyVersion: 'dominant-contiguous-window-v1',
    },
    classificationVersion: 'test-v1',
    coverage: {
      totalGames: games,
      indexedGames: games,
      analysedGames: games,
      analysisPercent: games > 0 ? 100 : null,
      namedOpeningGames: games,
      profiledOpeningGames: games,
      omittedOpeningGames: 0,
      classifiedOpeningGames: games,
      lowConfidenceOpeningGames: 0,
      unknownDimensionOpeningGames: 0,
      openingGroupLimit: 100,
      openingGroupsTruncated: false,
    },
    baseline: {
      games,
      analysedGames: games,
      accuracyGames: games,
      wdl: { wins: games, draws: 0, losses: 0 },
      scorePercent: games > 0 ? 100 : null,
      openingPositiveRate: games > 0 ? 60 : null,
      openingTroubleRate: games > 0 ? 10 : null,
      earlyMistakeRate: games > 0 ? 10 : null,
      averageAccuracy: games > 0 ? 82 : null,
    },
    preference: {
      items: games > 0 ? [{
        dimension: 'CHARACTER',
        value: 'DYNAMIC',
        games,
        exposurePercent: 100,
        confidenceGames: { high: games, medium: 0, low: 0 },
        supportingOpenings: [{
          eco: 'B20',
          name: 'Sicilian Defense',
          userColor: 'BLACK',
          games,
        }],
      }] : [],
    },
    performance: {
      items: games > 0 ? [{
        dimension: 'CHARACTER',
        value: 'DYNAMIC',
        games,
        analysedGames: games,
        accuracyGames: games,
        wdl: { wins: games, draws: 0, losses: 0 },
        scorePercent: 100,
        baselineScorePercent: 80,
        scoreDelta: 20,
        openingPositiveRate: 60,
        openingTroubleRate: 10,
        earlyMistakeRate: 10,
        averageAccuracy: 82,
        resultEvidenceStrength: games < 5 ? 'INSUFFICIENT' : 'LOW',
        analysisEvidenceStrength: games < 5 ? 'INSUFFICIENT' : 'LOW',
        supportingOpenings: [{
          eco: 'B20',
          name: 'Sicilian Defense',
          userColor: 'BLACK',
          games,
        }],
      }] : [],
    },
    openingGroups: [],
    conclusions: [{
      code: games > 0 ? 'PREFERENCE' : 'INSUFFICIENT_DATA',
      dimension: games > 0 ? 'CHARACTER' : null,
      value: games > 0 ? 'DYNAMIC' : null,
      metric: games > 0 ? 'EXPOSURE_PERCENT' : 'NONE',
      sampleSize: games,
      metricValue: games > 0 ? 100 : null,
      baselineValue: null,
      delta: null,
      evidenceStrength: games < 5 ? 'INSUFFICIENT' : 'LOW',
      summary: games > 0 ? summary : 'Not enough data',
    }],
    supportingGames: games > 0 ? [
      {
        id: 7,
        provider: 'LICHESS',
        providerUrl: null,
        endedAt: '2026-07-20T12:00:00.000Z',
        speedCategory: 'blitz',
        userColor: 'BLACK',
        resultForUser: 'WIN',
        openingEco: 'B20',
        openingName: 'Sicilian Defense',
        userRating: 1450,
        opponentRating: 1460,
        analysisStatus: 'COMPLETED',
        accuracy: 82,
      },
      {
        id: 8,
        provider: 'LICHESS',
        providerUrl: null,
        endedAt: '2026-07-19T12:00:00.000Z',
        speedCategory: 'blitz',
        userColor: 'WHITE',
        resultForUser: 'WIN',
        openingEco: 'B20',
        openingName: 'Sicilian Defense',
        userRating: 1450,
        opponentRating: 1460,
        analysisStatus: 'COMPLETED',
        accuracy: 82,
      },
    ] : [],
  };
}

describe('PlayerChessProfileStore', () => {
  let api: jasmine.SpyObj<PlayerChessProfileApiService>;
  let store: PlayerChessProfileStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<PlayerChessProfileApiService>('PlayerChessProfileApiService', [
      'getAccounts',
      'getProfile',
    ]);
    api.getAccounts.and.returnValue(of([]));
    api.getProfile.and.returnValue(of(profileFixture(10)));

    TestBed.configureTestingModule({
      providers: [
        PlayerChessProfileStore,
        { provide: PlayerChessProfileApiService, useValue: api },
      ],
    });
    store = TestBed.inject(PlayerChessProfileStore);
  });

  it('starts with the agreed recent profile defaults', () => {
    expect(store.filters().period).toBe('3M');
    expect(store.filters().speedPreset).toBe('BLITZ_AND_SLOWER');
    expect(store.filters().colors).toEqual(['WHITE', 'BLACK']);
    expect(store.filters().rated).toBeTrue();
  });

  it('sends selected account, colour and rating context filters', async () => {
    store.toggleAccount(4);
    store.toggleColor('BLACK');
    store.setRatingFilter('minOpponentRating', '1600');

    await store.load();

    expect(api.getProfile).toHaveBeenCalledWith(jasmine.objectContaining({
      accountIds: [4],
      colors: ['WHITE'],
      minOpponentRating: 1600,
      supportingGamesLimit: 10,
    }));
  });

  it('ignores a stale response after a later recalculation completes', async () => {
    const first = new Subject<PlayerChessProfileResponse>();
    const second = new Subject<PlayerChessProfileResponse>();
    api.getProfile.and.returnValues(first.asObservable(), second.asObservable());

    const firstLoad = store.load();
    const secondLoad = store.load();
    second.next(profileFixture(20, 'Second response'));
    second.complete();
    await secondLoad;
    first.next(profileFixture(5, 'Stale response'));
    first.complete();
    await firstLoad;

    expect(store.response()?.coverage.totalGames).toBe(20);
    expect(store.response()?.conclusions[0].summary).toBe('Second response');
  });

  it('exposes no-data and side-aware evidence states', async () => {
    api.getProfile.and.returnValue(of(profileFixture(0)));
    await store.load();
    expect(store.hasNoData()).toBeTrue();

    api.getProfile.and.returnValue(of(profileFixture(8)));
    await store.load();
    store.selectConclusion(0);

    expect(store.evidence()?.openings[0].title).toBe('Sicilian Defense');
    expect(store.evidence()?.games.map((game) => game.id)).toEqual([7]);
  });

  it('keeps the last response while reporting a recalculation error', async () => {
    await store.load();
    api.getProfile.and.returnValue(throwError(() => new Error('failed')));

    await store.load();

    expect(store.response()?.coverage.totalGames).toBe(10);
    expect(store.error()).toBe('Could not calculate the player profile.');
  });
});
