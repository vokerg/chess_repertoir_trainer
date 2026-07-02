import assert from 'node:assert/strict';
import { buildAccountPerformanceStatsData } from '../../dist/services/accountPerformanceStatsService.js';

function game(options) {
  return {
    id: options.id,
    endedAt: new Date(options.endedAt),
    speedCategory: options.speedCategory ?? 'blitz',
    userColor: options.userColor ?? 'WHITE',
    whiteRating: options.userColor === 'BLACK' ? options.opponentRating : 1500,
    blackRating: options.userColor === 'BLACK' ? 1500 : options.opponentRating,
    opponentUsername: options.opponentUsername ?? `opponent-${options.id}`,
    resultForUser: options.resultForUser,
    providerUrl: options.providerUrl ?? null,
    timeControlRaw: Object.hasOwn(options, 'timeControlRaw') ? options.timeControlRaw : null,
    timeControlInitial: Object.hasOwn(options, 'timeControlInitial') ? options.timeControlInitial : 300,
    timeControlIncrement: Object.hasOwn(options, 'timeControlIncrement') ? options.timeControlIncrement : 0,
  };
}

function build(games) {
  return buildAccountPerformanceStatsData(games, { speeds: ['bullet', 'blitz', 'rapid'] });
}

{
  const stats = build([
    game({ id: 1, resultForUser: 'WIN', opponentRating: 1500, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 2, resultForUser: 'WIN', opponentRating: 1700, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 3, resultForUser: 'WIN', opponentRating: 1700, endedAt: '2024-02-01T00:00:00Z' }),
    game({ id: 4, resultForUser: 'WIN', opponentRating: 1700, endedAt: '2024-02-01T00:00:00Z' }),
    game({ id: 5, resultForUser: 'WIN', opponentRating: 1600, endedAt: '2024-03-01T00:00:00Z' }),
    game({ id: 6, resultForUser: 'WIN', opponentRating: null, endedAt: '2024-04-01T00:00:00Z' }),
    game({ id: 7, resultForUser: 'WIN', opponentRating: 1800, endedAt: '2024-01-01T00:00:00Z' }),
  ]);

  assert.equal(stats.bestVictories.length, 5);
  assert.deepEqual(
    stats.bestVictories.map((highlight) => highlight.gameId),
    [7, 4, 3, 2, 5],
  );
  assert.deepEqual(stats.bestVictory, stats.bestVictories[0]);
}

{
  const stats = build([
    game({ id: 10, resultForUser: 'LOSS', opponentRating: 1200, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 11, resultForUser: 'LOSS', opponentRating: 900, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 12, resultForUser: 'LOSS', opponentRating: 900, endedAt: '2024-02-01T00:00:00Z' }),
    game({ id: 13, resultForUser: 'LOSS', opponentRating: 900, endedAt: '2024-02-01T00:00:00Z' }),
    game({ id: 14, resultForUser: 'LOSS', opponentRating: 1000, endedAt: '2024-03-01T00:00:00Z' }),
    game({ id: 15, resultForUser: 'LOSS', opponentRating: null, endedAt: '2024-04-01T00:00:00Z' }),
    game({ id: 16, resultForUser: 'LOSS', opponentRating: 800, endedAt: '2024-01-01T00:00:00Z' }),
  ]);

  assert.equal(stats.mostEmbarrassingDefeats.length, 5);
  assert.deepEqual(
    stats.mostEmbarrassingDefeats.map((highlight) => highlight.gameId),
    [16, 13, 12, 11, 14],
  );
  assert.deepEqual(stats.mostEmbarrassingDefeat, stats.mostEmbarrassingDefeats[0]);
}

{
  const stats = build([
    game({ id: 20, resultForUser: 'WIN', opponentRating: null, endedAt: '2024-03-01T00:00:00Z' }),
    game({ id: 21, resultForUser: 'WIN', opponentRating: 1000, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 22, resultForUser: 'LOSS', opponentRating: null, endedAt: '2024-03-01T00:00:00Z' }),
    game({ id: 23, resultForUser: 'LOSS', opponentRating: 1000, endedAt: '2024-01-01T00:00:00Z' }),
  ]);

  assert.deepEqual(
    stats.bestVictories.map((highlight) => highlight.gameId),
    [21, 20],
  );
  assert.deepEqual(
    stats.mostEmbarrassingDefeats.map((highlight) => highlight.gameId),
    [23, 22],
  );
}

{
  const stats = build([
    game({ id: 30, resultForUser: 'WIN', opponentRating: 1000, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 31, resultForUser: 'DRAW', opponentRating: 1100, endedAt: '2024-01-02T00:00:00Z' }),
    game({ id: 32, resultForUser: 'LOSS', opponentRating: 1200, endedAt: '2024-01-03T00:00:00Z' }),
    game({ id: 33, resultForUser: 'ABORTED', opponentRating: 2500, endedAt: '2024-01-04T00:00:00Z' }),
    game({ id: 34, resultForUser: null, opponentRating: 2600, endedAt: '2024-01-05T00:00:00Z' }),
  ]);

  assert.equal(stats.gamesCount, 3);
  assert.deepEqual(stats.wdl, { wins: 1, draws: 1, losses: 1 });
  assert.deepEqual(stats.averageOpponentRating, { wins: 1000, draws: 1100, losses: 1200 });
  assert.deepEqual(
    stats.bestVictories.map((highlight) => highlight.gameId),
    [30],
  );
  assert.deepEqual(
    stats.mostEmbarrassingDefeats.map((highlight) => highlight.gameId),
    [32],
  );
}

{
  const stats = build([
    game({ id: 40, resultForUser: 'WIN', opponentRating: 1000, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 41, resultForUser: 'DRAW', opponentRating: 1100, endedAt: '2024-01-02T00:00:00Z' }),
    game({ id: 42, resultForUser: 'LOSS', opponentRating: 1200, endedAt: '2024-01-03T00:00:00Z' }),
  ]);

  assert.deepEqual(stats.timeControlWdl, [
    {
      timeControl: '5+0',
      gamesCount: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      scorePercent: 50,
    },
  ]);
}

{
  const stats = build([
    game({
      id: 50,
      resultForUser: 'WIN',
      opponentRating: 1000,
      endedAt: '2024-01-01T00:00:00Z',
      timeControlInitial: 300,
      timeControlIncrement: 5,
    }),
    game({
      id: 51,
      resultForUser: 'WIN',
      opponentRating: 1100,
      endedAt: '2024-01-02T00:00:00Z',
      timeControlInitial: 300,
      timeControlIncrement: 5,
    }),
    game({
      id: 52,
      resultForUser: 'LOSS',
      opponentRating: 1200,
      endedAt: '2024-01-03T00:00:00Z',
      timeControlInitial: 300,
      timeControlIncrement: 5,
    }),
  ]);

  assert.deepEqual(stats.timeControlWdl, [
    {
      timeControl: '5+5',
      gamesCount: 3,
      wins: 2,
      draws: 0,
      losses: 1,
      scorePercent: 67,
    },
  ]);
}

{
  const stats = build([
    game({
      id: 60,
      resultForUser: 'WIN',
      opponentRating: 1000,
      endedAt: '2024-01-01T00:00:00Z',
      timeControlRaw: '10+0',
      timeControlInitial: null,
      timeControlIncrement: null,
    }),
    game({
      id: 61,
      resultForUser: 'LOSS',
      opponentRating: 1100,
      endedAt: '2024-01-02T00:00:00Z',
      timeControlRaw: '10 + 0',
      timeControlInitial: null,
      timeControlIncrement: null,
    }),
  ]);

  assert.deepEqual(stats.timeControlWdl, [
    {
      timeControl: '10+0',
      gamesCount: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      scorePercent: 50,
    },
  ]);
}

{
  const stats = build([
    game({
      id: 70,
      resultForUser: 'WIN',
      opponentRating: 1000,
      endedAt: '2024-01-01T00:00:00Z',
      timeControlInitial: 600,
      timeControlIncrement: 0,
    }),
    game({
      id: 71,
      resultForUser: 'WIN',
      opponentRating: 1100,
      endedAt: '2024-01-02T00:00:00Z',
      timeControlInitial: 300,
      timeControlIncrement: 5,
    }),
    game({
      id: 72,
      resultForUser: 'LOSS',
      opponentRating: 1200,
      endedAt: '2024-01-03T00:00:00Z',
      timeControlInitial: 600,
      timeControlIncrement: 0,
    }),
    game({
      id: 73,
      resultForUser: 'DRAW',
      opponentRating: 1300,
      endedAt: '2024-01-04T00:00:00Z',
      timeControlInitial: 300,
      timeControlIncrement: 5,
    }),
    game({
      id: 74,
      resultForUser: 'WIN',
      opponentRating: 1400,
      endedAt: '2024-01-05T00:00:00Z',
      timeControlInitial: 180,
      timeControlIncrement: 0,
    }),
  ]);

  assert.deepEqual(
    stats.timeControlWdl.map((bucket) => bucket.timeControl),
    ['10+0', '5+5', '3+0'],
  );
}

{
  const stats = build([]);

  assert.equal(stats.bestVictory, null);
  assert.equal(stats.mostEmbarrassingDefeat, null);
}

console.log('Account performance stats tests passed.');
